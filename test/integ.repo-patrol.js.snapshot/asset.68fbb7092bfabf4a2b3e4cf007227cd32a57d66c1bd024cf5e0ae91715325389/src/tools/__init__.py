from src.tools.github_tools import (
    list_open_pull_requests,
    get_pull_request_details,
    get_pull_request_diff,
    list_open_issues,
    get_issue_details,
    list_dependabot_pull_requests,
    post_pr_review_comment,
    post_issue_comment,
    add_issue_labels,
    approve_pull_request,
    merge_pull_request,
)
from src.tools.ci_tools import (
    list_failed_workflow_runs,
    get_workflow_run_logs,
    get_workflow_run_details,
)
from src.tools.dep_tools import (
    check_dependabot_config,
    get_dependency_file,
)
from src.tools.report_tools import (
    save_report_to_s3,
    save_job_history,
    check_processed_item,
    mark_item_processed,
)
from src.tools.health_tools import (
    check_repo_metadata,
    check_branch_protection,
    check_ci_configuration,
)

ALL_TOOLS = [
    list_open_pull_requests,
    get_pull_request_details,
    get_pull_request_diff,
    list_open_issues,
    get_issue_details,
    list_dependabot_pull_requests,
    post_pr_review_comment,
    post_issue_comment,
    add_issue_labels,
    approve_pull_request,
    merge_pull_request,
    list_failed_workflow_runs,
    get_workflow_run_logs,
    get_workflow_run_details,
    check_dependabot_config,
    get_dependency_file,
    save_report_to_s3,
    save_job_history,
    check_processed_item,
    mark_item_processed,
    check_repo_metadata,
    check_branch_protection,
    check_ci_configuration,
]
