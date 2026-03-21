"""GitHub API tools for PR review, issue triage, and Dependabot handling."""

import logging

from strands import tool

from src.lib.github_auth import get_github_client

logger = logging.getLogger(__name__)


def _get_repo(installation_id: int, owner: str, repo: str):
    g = get_github_client(installation_id)
    return g.get_repo(f"{owner}/{repo}")


@tool
def list_open_pull_requests(installation_id: int, owner: str, repo: str) -> list[dict]:
    """List all open pull requests for a GitHub repository.

    Args:
        installation_id: GitHub App installation ID
        owner: Repository owner (org or user)
        repo: Repository name

    Returns:
        List of PR summaries with number, title, author, labels, and draft status.
    """
    repository = _get_repo(installation_id, owner, repo)
    pulls = repository.get_pulls(state="open", sort="created", direction="desc")
    return [
        {
            "number": pr.number,
            "title": pr.title,
            "author": pr.user.login,
            "created_at": pr.created_at.isoformat(),
            "labels": [label.name for label in pr.labels],
            "is_draft": pr.draft,
            "is_dependabot": pr.user.login in ("dependabot[bot]", "dependabot"),
            "head_ref": pr.head.ref,
        }
        for pr in pulls[:50]
    ]


@tool
def get_pull_request_details(installation_id: int, owner: str, repo: str, pr_number: int) -> dict:
    """Get detailed information about a specific pull request.

    Args:
        installation_id: GitHub App installation ID
        owner: Repository owner
        repo: Repository name
        pr_number: Pull request number

    Returns:
        PR details including body, files changed, review status.
    """
    repository = _get_repo(installation_id, owner, repo)
    pr = repository.get_pull(pr_number)
    files = pr.get_files()
    reviews = pr.get_reviews()

    return {
        "number": pr.number,
        "title": pr.title,
        "body": f"<untrusted-content>{(pr.body or '')[:5000]}</untrusted-content>",
        "author": pr.user.login,
        "state": pr.state,
        "mergeable": pr.mergeable,
        "created_at": pr.created_at.isoformat(),
        "updated_at": pr.updated_at.isoformat(),
        "additions": pr.additions,
        "deletions": pr.deletions,
        "changed_files": pr.changed_files,
        "files": [
            {
                "filename": f.filename,
                "status": f.status,
                "additions": f.additions,
                "deletions": f.deletions,
            }
            for f in files[:100]
        ],
        "reviews": [
            {"user": r.user.login, "state": r.state, "submitted_at": r.submitted_at.isoformat() if r.submitted_at else None}
            for r in reviews
        ],
        "labels": [label.name for label in pr.labels],
    }


@tool
def get_pull_request_diff(installation_id: int, owner: str, repo: str, pr_number: int) -> str:
    """Get the code diff of a pull request. Truncated to 10000 chars.

    Args:
        installation_id: GitHub App installation ID
        owner: Repository owner
        repo: Repository name
        pr_number: Pull request number

    Returns:
        The diff content as a string.
    """
    repository = _get_repo(installation_id, owner, repo)
    pr = repository.get_pull(pr_number)
    files = pr.get_files()

    diff_parts = []
    for f in files[:50]:
        if f.patch:
            diff_parts.append(f"--- {f.filename}\n{f.patch}")

    full_diff = "\n\n".join(diff_parts)
    return full_diff[:10000]


@tool
def list_open_issues(installation_id: int, owner: str, repo: str, labels: str = "") -> list[dict]:
    """List open issues (excluding pull requests) for a repository.

    Args:
        installation_id: GitHub App installation ID
        owner: Repository owner
        repo: Repository name
        labels: Comma-separated label filter (optional)

    Returns:
        List of issue summaries.
    """
    repository = _get_repo(installation_id, owner, repo)
    kwargs = {"state": "open", "sort": "created", "direction": "desc"}
    if labels:
        kwargs["labels"] = [repository.get_label(l.strip()) for l in labels.split(",")]

    issues = repository.get_issues(**kwargs)
    return [
        {
            "number": issue.number,
            "title": issue.title,
            "author": issue.user.login,
            "created_at": issue.created_at.isoformat(),
            "labels": [label.name for label in issue.labels],
            "comments_count": issue.comments,
        }
        for issue in issues[:50]
        if issue.pull_request is None
    ]


@tool
def get_issue_details(installation_id: int, owner: str, repo: str, issue_number: int) -> dict:
    """Get detailed information about a specific issue.

    Args:
        installation_id: GitHub App installation ID
        owner: Repository owner
        repo: Repository name
        issue_number: Issue number

    Returns:
        Issue details including body and recent comments.
    """
    repository = _get_repo(installation_id, owner, repo)
    issue = repository.get_issue(issue_number)
    comments = issue.get_comments()

    return {
        "number": issue.number,
        "title": issue.title,
        "body": f"<untrusted-content>{(issue.body or '')[:5000]}</untrusted-content>",
        "author": issue.user.login,
        "state": issue.state,
        "labels": [label.name for label in issue.labels],
        "created_at": issue.created_at.isoformat(),
        "comments_count": issue.comments,
        "recent_comments": [
            {"author": c.user.login, "body": f"<untrusted-content>{c.body[:1000]}</untrusted-content>", "created_at": c.created_at.isoformat()}
            for c in list(comments)[-5:]
        ],
    }


@tool
def list_dependabot_pull_requests(installation_id: int, owner: str, repo: str) -> list[dict]:
    """List open Dependabot pull requests for a repository.

    Args:
        installation_id: GitHub App installation ID
        owner: Repository owner
        repo: Repository name

    Returns:
        List of Dependabot PR summaries with update type (patch/minor/major).
    """
    repository = _get_repo(installation_id, owner, repo)
    pulls = repository.get_pulls(state="open", sort="created", direction="desc")

    dependabot_prs = []
    for pr in pulls[:100]:
        if pr.user.login not in ("dependabot[bot]", "dependabot"):
            continue

        update_type = "unknown"
        for label in pr.labels:
            name = label.name.lower()
            if "major" in name:
                update_type = "major"
                break
            elif "minor" in name:
                update_type = "minor"
                break
            elif "patch" in name:
                update_type = "patch"
                break

        dependabot_prs.append({
            "number": pr.number,
            "title": pr.title,
            "created_at": pr.created_at.isoformat(),
            "labels": [label.name for label in pr.labels],
            "update_type": update_type,
            "head_ref": pr.head.ref,
            "mergeable": pr.mergeable,
        })

    return dependabot_prs


@tool
def post_pr_review_comment(installation_id: int, owner: str, repo: str, pr_number: int, body: str) -> dict:
    """Post a review comment on a pull request. Prefixed with [repo-patrol].

    Args:
        installation_id: GitHub App installation ID
        owner: Repository owner
        repo: Repository name
        pr_number: Pull request number
        body: Comment body (will be prefixed with [repo-patrol])

    Returns:
        Result with comment URL.
    """
    repository = _get_repo(installation_id, owner, repo)
    pr = repository.get_pull(pr_number)
    if pr.state != "open":
        logger.warning("Skipping comment on PR #%d: state is %s", pr_number, pr.state)
        return {"skipped": True, "reason": f"PR #{pr_number} is {pr.state}"}

    prefixed_body = f"[repo-patrol] {body}"
    comment = pr.create_issue_comment(prefixed_body)
    return {"comment_id": comment.id, "url": comment.html_url}


@tool
def post_issue_comment(installation_id: int, owner: str, repo: str, issue_number: int, body: str) -> dict:
    """Post a comment on an issue. Prefixed with [repo-patrol].

    Args:
        installation_id: GitHub App installation ID
        owner: Repository owner
        repo: Repository name
        issue_number: Issue number
        body: Comment body (will be prefixed with [repo-patrol])

    Returns:
        Result with comment URL.
    """
    repository = _get_repo(installation_id, owner, repo)
    issue = repository.get_issue(issue_number)
    if issue.state != "open":
        logger.warning("Skipping comment on issue #%d: state is %s", issue_number, issue.state)
        return {"skipped": True, "reason": f"Issue #{issue_number} is {issue.state}"}

    prefixed_body = f"[repo-patrol] {body}"
    comment = issue.create_comment(prefixed_body)
    return {"comment_id": comment.id, "url": comment.html_url}


@tool
def add_issue_labels(installation_id: int, owner: str, repo: str, issue_number: int, labels: list[str]) -> dict:
    """Add labels to an issue or pull request.

    Args:
        installation_id: GitHub App installation ID
        owner: Repository owner
        repo: Repository name
        issue_number: Issue or PR number
        labels: List of label names to add

    Returns:
        Result with applied labels.
    """
    repository = _get_repo(installation_id, owner, repo)
    issue = repository.get_issue(issue_number)
    if issue.state != "open":
        logger.warning("Skipping label on issue #%d: state is %s", issue_number, issue.state)
        return {"skipped": True, "reason": f"Issue/PR #{issue_number} is {issue.state}"}

    issue.add_to_labels(*labels)
    return {"issue_number": issue_number, "labels_added": labels}


@tool
def approve_pull_request(installation_id: int, owner: str, repo: str, pr_number: int, body: str = "") -> dict:
    """Approve a pull request with a review comment explaining the decision.

    Args:
        installation_id: GitHub App installation ID
        owner: Repository owner
        repo: Repository name
        pr_number: Pull request number
        body: Review body explaining the approval decision (analysis summary, key changes, risks assessed)

    Returns:
        Result with review ID.
    """
    repository = _get_repo(installation_id, owner, repo)
    pr = repository.get_pull(pr_number)
    if pr.state != "open":
        logger.warning("Skipping approve on PR #%d: state is %s", pr_number, pr.state)
        return {"skipped": True, "reason": f"PR #{pr_number} is {pr.state}"}

    review_body = f"[repo-patrol] {body}" if body else "[repo-patrol] Approved."
    review = pr.create_review(event="APPROVE", body=review_body)
    return {"review_id": review.id, "pr_number": pr_number, "action": "approved"}


@tool
def merge_pull_request(
    installation_id: int, owner: str, repo: str, pr_number: int, merge_method: str = "squash"
) -> dict:
    """Merge a pull request.

    Args:
        installation_id: GitHub App installation ID
        owner: Repository owner
        repo: Repository name
        pr_number: Pull request number
        merge_method: Merge method - 'merge', 'squash', or 'rebase'

    Returns:
        Result with merge status.
    """
    repository = _get_repo(installation_id, owner, repo)
    pr = repository.get_pull(pr_number)
    if pr.state != "open":
        logger.warning("Skipping merge on PR #%d: state is %s", pr_number, pr.state)
        return {"skipped": True, "reason": f"PR #{pr_number} is {pr.state}"}

    result = pr.merge(merge_method=merge_method, commit_message=f"[repo-patrol] Auto-merge PR #{pr_number}")
    return {"merged": result.merged, "sha": result.sha, "pr_number": pr_number}
