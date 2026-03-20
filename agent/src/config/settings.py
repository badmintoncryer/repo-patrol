import os


GITHUB_APP_SECRET_NAME = os.environ.get("GITHUB_APP_SECRET_NAME", "")
REPORT_BUCKET_NAME = os.environ.get("REPORT_BUCKET_NAME", "")
REPOS_TABLE_NAME = os.environ.get("REPOS_TABLE_NAME", "repo-patrol-repos")
JOB_HISTORY_TABLE_NAME = os.environ.get("JOB_HISTORY_TABLE_NAME", "repo-patrol-job-history")
PROCESSED_ITEMS_TABLE_NAME = os.environ.get("PROCESSED_ITEMS_TABLE_NAME", "repo-patrol-processed-items")
MODEL_ID = os.environ.get("MODEL_ID", "us.anthropic.claude-haiku-4-5-20251001-v1:0")
AWS_REGION = os.environ.get("AWS_REGION", "us-west-2")
LOG_LEVEL = os.environ.get("LOG_LEVEL", "INFO")
