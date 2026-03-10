"""CI/CD failure analysis tools."""

import logging

from strands import tool

from src.lib.github_auth import get_github_client

logger = logging.getLogger(__name__)


@tool
def list_failed_workflow_runs(installation_id: int, owner: str, repo: str, days_back: int = 1) -> list[dict]:
    """List recent failed GitHub Actions workflow runs.

    Args:
        installation_id: GitHub App installation ID
        owner: Repository owner
        repo: Repository name
        days_back: Number of days to look back (default 1)

    Returns:
        List of failed workflow run summaries.
    """
    from datetime import datetime, timedelta, timezone

    g = get_github_client(installation_id)
    repository = g.get_repo(f"{owner}/{repo}")

    since = datetime.now(timezone.utc) - timedelta(days=days_back)
    runs = repository.get_workflow_runs(status="failure")

    failed = []
    for run in runs[:30]:
        if run.created_at.replace(tzinfo=timezone.utc) < since:
            break
        failed.append({
            "id": run.id,
            "name": run.name,
            "workflow": run.workflow_id,
            "head_branch": run.head_branch,
            "event": run.event,
            "conclusion": run.conclusion,
            "created_at": run.created_at.isoformat(),
            "url": run.html_url,
        })

    return failed


@tool
def get_workflow_run_logs(installation_id: int, owner: str, repo: str, run_id: int) -> str:
    """Get logs from a specific workflow run. Returns failed job logs, truncated to 8000 chars.

    Args:
        installation_id: GitHub App installation ID
        owner: Repository owner
        repo: Repository name
        run_id: Workflow run ID

    Returns:
        Log content from failed jobs.
    """
    g = get_github_client(installation_id)
    repository = g.get_repo(f"{owner}/{repo}")
    run = repository.get_workflow_run(run_id)

    jobs = run.jobs()
    log_parts = []

    for job in jobs:
        if job.conclusion != "failure":
            continue
        log_parts.append(f"=== Job: {job.name} (status: {job.conclusion}) ===")
        for step in job.steps:
            if step.conclusion == "failure":
                log_parts.append(f"  FAILED Step: {step.name}")
                log_parts.append(f"  Number: {step.number}")

    full_log = "\n".join(log_parts)
    return full_log[:8000] if full_log else "No failed job logs found."


@tool
def get_workflow_run_details(installation_id: int, owner: str, repo: str, run_id: int) -> dict:
    """Get detailed information about a workflow run including jobs and steps.

    Args:
        installation_id: GitHub App installation ID
        owner: Repository owner
        repo: Repository name
        run_id: Workflow run ID

    Returns:
        Workflow run details with jobs and step statuses.
    """
    g = get_github_client(installation_id)
    repository = g.get_repo(f"{owner}/{repo}")
    run = repository.get_workflow_run(run_id)

    jobs_data = []
    for job in run.jobs():
        steps_data = [
            {
                "name": step.name,
                "status": step.status,
                "conclusion": step.conclusion,
                "number": step.number,
            }
            for step in job.steps
        ]
        jobs_data.append({
            "name": job.name,
            "status": job.status,
            "conclusion": job.conclusion,
            "started_at": job.started_at.isoformat() if job.started_at else None,
            "completed_at": job.completed_at.isoformat() if job.completed_at else None,
            "steps": steps_data,
        })

    return {
        "id": run.id,
        "name": run.name,
        "status": run.status,
        "conclusion": run.conclusion,
        "head_branch": run.head_branch,
        "head_sha": run.head_sha[:8],
        "event": run.event,
        "url": run.html_url,
        "jobs": jobs_data,
    }
