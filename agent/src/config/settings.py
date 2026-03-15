import os


GITHUB_APP_SECRET_ARN = os.environ.get("GITHUB_APP_SECRET_ARN", "")
REPORT_BUCKET_NAME = os.environ.get("REPORT_BUCKET_NAME", "")
REPOS_TABLE_NAME = os.environ.get("REPOS_TABLE_NAME", "repo-patrol-repos")
JOB_HISTORY_TABLE_NAME = os.environ.get("JOB_HISTORY_TABLE_NAME", "repo-patrol-job-history")
PROCESSED_ITEMS_TABLE_NAME = os.environ.get("PROCESSED_ITEMS_TABLE_NAME", "repo-patrol-processed-items")
MODEL_ID = os.environ.get("MODEL_ID", "us.anthropic.claude-haiku-4-5-20251001-v1:0")
# Default DRY_RUN from env var; can be overridden per-invocation via set_dry_run()
DRY_RUN = os.environ.get("DRY_RUN", "false").lower() == "true"
AWS_REGION = os.environ.get("AWS_REGION", "us-west-2")
LOG_LEVEL = os.environ.get("LOG_LEVEL", "INFO")


def set_dry_run(value: bool) -> None:
    """Override DRY_RUN at runtime (e.g., from payload dry_run field)."""
    global DRY_RUN
    DRY_RUN = value
