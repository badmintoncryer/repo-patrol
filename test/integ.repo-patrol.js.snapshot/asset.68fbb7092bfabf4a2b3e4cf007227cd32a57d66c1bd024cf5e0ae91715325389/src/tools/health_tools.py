"""Repository health check tools."""

import logging

from strands import tool

from src.lib.github_auth import get_github_client

logger = logging.getLogger(__name__)


@tool
def check_repo_metadata(installation_id: int, owner: str, repo: str) -> dict:
    """Check repository metadata files (README, LICENSE, CONTRIBUTING, etc.).

    Args:
        installation_id: GitHub App installation ID
        owner: Repository owner
        repo: Repository name

    Returns:
        Presence status of key repository files.
    """
    g = get_github_client(installation_id)
    repository = g.get_repo(f"{owner}/{repo}")

    files_to_check = [
        "README.md",
        "LICENSE",
        "CONTRIBUTING.md",
        "CODE_OF_CONDUCT.md",
        "SECURITY.md",
        ".github/ISSUE_TEMPLATE",
        ".github/PULL_REQUEST_TEMPLATE.md",
    ]

    results = {}
    for file_path in files_to_check:
        try:
            repository.get_contents(file_path)
            results[file_path] = True
        except Exception:
            results[file_path] = False

    score = sum(1 for v in results.values() if v) / len(results) * 100
    return {"files": results, "score": round(score, 1), "total_checked": len(results)}


@tool
def check_branch_protection(installation_id: int, owner: str, repo: str, branch: str = "main") -> dict:
    """Check branch protection rules for the default branch.

    Args:
        installation_id: GitHub App installation ID
        owner: Repository owner
        repo: Repository name
        branch: Branch name to check (default: 'main')

    Returns:
        Branch protection configuration details.
    """
    g = get_github_client(installation_id)
    repository = g.get_repo(f"{owner}/{repo}")

    try:
        branch_obj = repository.get_branch(branch)
        protection = branch_obj.get_protection()
        return {
            "protected": True,
            "branch": branch,
            "enforce_admins": protection.enforce_admins.enabled if protection.enforce_admins else False,
            "required_pull_request_reviews": protection.required_pull_request_reviews is not None,
            "required_status_checks": protection.required_status_checks is not None,
        }
    except Exception:
        return {"protected": False, "branch": branch}


@tool
def check_ci_configuration(installation_id: int, owner: str, repo: str) -> dict:
    """Check CI/CD configuration in the repository.

    Args:
        installation_id: GitHub App installation ID
        owner: Repository owner
        repo: Repository name

    Returns:
        CI configuration status and workflow file list.
    """
    g = get_github_client(installation_id)
    repository = g.get_repo(f"{owner}/{repo}")

    try:
        contents = repository.get_contents(".github/workflows")
        if isinstance(contents, list):
            workflows = [{"name": c.name, "path": c.path, "size": c.size} for c in contents]
        else:
            workflows = [{"name": contents.name, "path": contents.path, "size": contents.size}]

        return {"has_ci": True, "workflow_count": len(workflows), "workflows": workflows}
    except Exception:
        return {"has_ci": False, "workflow_count": 0, "workflows": []}
