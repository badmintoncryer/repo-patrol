import os


GITHUB_APP_SECRET_ARN = os.environ.get("GITHUB_APP_SECRET_ARN", "")
REPORT_BUCKET_NAME = os.environ.get("REPORT_BUCKET_NAME", "")
REPOS_TABLE_NAME = os.environ.get("REPOS_TABLE_NAME", "repo-patrol-repos")
JOB_HISTORY_TABLE_NAME = os.environ.get("JOB_HISTORY_TABLE_NAME", "repo-patrol-job-history")
PROCESSED_ITEMS_TABLE_NAME = os.environ.get("PROCESSED_ITEMS_TABLE_NAME", "repo-patrol-processed-items")
MAX_TOOL_CALLS = int(os.environ.get("MAX_TOOL_CALLS", "100"))
MODEL_ID = os.environ.get("MODEL_ID", "us.anthropic.claude-haiku-4-5-20251001-v1:0")
DRY_RUN = os.environ.get("DRY_RUN", "false").lower() == "true"
AWS_REGION = os.environ.get("AWS_REGION", "us-west-2")
LOG_LEVEL = os.environ.get("LOG_LEVEL", "INFO")
