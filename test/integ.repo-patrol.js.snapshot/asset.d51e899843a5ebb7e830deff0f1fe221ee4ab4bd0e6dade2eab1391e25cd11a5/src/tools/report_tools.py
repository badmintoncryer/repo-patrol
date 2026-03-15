"""Report storage and idempotency management tools."""

import json
import logging
import time
from datetime import datetime, timezone

import boto3
from strands import tool

from src.config.settings import (
    AWS_REGION,
    JOB_HISTORY_TABLE_NAME,
    PROCESSED_ITEMS_TABLE_NAME,
    REPORT_BUCKET_NAME,
)

logger = logging.getLogger(__name__)

_s3_client = None
_dynamodb_resource = None


def _get_s3():
    global _s3_client
    if _s3_client is None:
        _s3_client = boto3.client("s3", region_name=AWS_REGION)
    return _s3_client


def _get_dynamodb():
    global _dynamodb_resource
    if _dynamodb_resource is None:
        _dynamodb_resource = boto3.resource("dynamodb", region_name=AWS_REGION)
    return _dynamodb_resource


@tool
def save_report_to_s3(owner: str, repo: str, job_type: str, report: dict) -> dict:
    """Save a job execution report to S3 as JSON.

    Args:
        owner: Repository owner
        repo: Repository name
        job_type: Job type that generated the report
        report: Report data to save

    Returns:
        S3 object key and metadata.
    """
    now = datetime.now(timezone.utc)
    date_str = now.strftime("%Y-%m-%d")
    timestamp = now.strftime("%Y%m%d-%H%M%S")
    key = f"reports/{owner}/{repo}/{job_type}/{date_str}/{timestamp}.json"

    report_with_meta = {
        "generated_at": now.isoformat(),
        "owner": owner,
        "repo": repo,
        "job_type": job_type,
        **report,
    }

    _get_s3().put_object(
        Bucket=REPORT_BUCKET_NAME,
        Key=key,
        Body=json.dumps(report_with_meta, ensure_ascii=False, indent=2),
        ContentType="application/json",
        Metadata={
            "generated-by": "repo-patrol",
            "job-type": job_type,
            "repo": f"{owner}/{repo}",
        },
    )

    logger.info("Saved report to s3://%s/%s", REPORT_BUCKET_NAME, key)
    return {"bucket": REPORT_BUCKET_NAME, "key": key, "s3_uri": f"s3://{REPORT_BUCKET_NAME}/{key}"}


@tool
def save_job_history(owner: str, repo: str, job_type: str, status: str, summary: str, duration_ms: int, report_s3_key: str = "") -> dict:
    """Save job execution history to DynamoDB.

    Args:
        owner: Repository owner
        repo: Repository name
        job_type: Job type executed
        status: Execution status - 'success', 'failed', or 'partial'
        summary: Brief execution summary
        duration_ms: Execution duration in milliseconds
        report_s3_key: S3 key of the full report (optional)

    Returns:
        Saved item key.
    """
    table = _get_dynamodb().Table(JOB_HISTORY_TABLE_NAME)
    now = datetime.now(timezone.utc)
    ttl = int(time.time()) + (90 * 24 * 60 * 60)  # 90 days

    item = {
        "repo_id": f"{owner}#{repo}",
        "executed_at": now.isoformat(),
        "job_type": job_type,
        "status": status,
        "summary": summary,
        "duration_ms": duration_ms,
        "report_s3_key": report_s3_key,
        "ttl": ttl,
    }

    table.put_item(Item=item)
    logger.info("Saved job history for %s/%s job=%s status=%s", owner, repo, job_type, status)
    return {"repo_id": item["repo_id"], "executed_at": item["executed_at"]}


@tool
def check_processed_item(owner: str, repo: str, job_type: str, item_type: str, item_number: int) -> dict:
    """Check if a PR or issue has already been processed by a specific job type.

    Args:
        owner: Repository owner
        repo: Repository name
        job_type: Job type (e.g., 'handle_dependabot', 'review_pull_requests')
        item_type: 'pr' or 'issue'
        item_number: PR or issue number

    Returns:
        Whether the item has been processed and when.
    """
    table = _get_dynamodb().Table(PROCESSED_ITEMS_TABLE_NAME)
    repo_id = f"{owner}#{repo}"
    item_key = f"{job_type}#{item_type}#{item_number}"

    response = table.get_item(Key={"repo_id": repo_id, "item_key": item_key})

    if "Item" in response:
        return {
            "processed": True,
            "processed_at": response["Item"].get("processed_at", ""),
            "result": response["Item"].get("result", ""),
        }

    return {"processed": False}


@tool
def mark_item_processed(owner: str, repo: str, job_type: str, item_type: str, item_number: int, result: str) -> dict:
    """Mark a PR or issue as processed to prevent duplicate handling.

    Args:
        owner: Repository owner
        repo: Repository name
        job_type: Job type that processed the item
        item_type: 'pr' or 'issue'
        item_number: PR or issue number
        result: Processing result (e.g., 'approved', 'merged', 'commented', 'skipped')

    Returns:
        Confirmation of the recorded item.
    """
    table = _get_dynamodb().Table(PROCESSED_ITEMS_TABLE_NAME)
    repo_id = f"{owner}#{repo}"
    item_key = f"{job_type}#{item_type}#{item_number}"
    now = datetime.now(timezone.utc)
    ttl = int(time.time()) + (30 * 24 * 60 * 60)  # 30 days

    table.put_item(
        Item={
            "repo_id": repo_id,
            "item_key": item_key,
            "processed_at": now.isoformat(),
            "result": result,
            "ttl": ttl,
        }
    )

    logger.info("Marked %s as processed for %s/%s (result=%s)", item_key, owner, repo, result)
    return {"repo_id": repo_id, "item_key": item_key, "result": result}
