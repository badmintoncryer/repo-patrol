"""Repository content browsing tools."""

import base64
import logging

from strands import tool

from src.lib.github_auth import get_github_client

logger = logging.getLogger(__name__)


@tool
def get_repo_file_content(
    installation_id: int,
    owner: str,
    repo: str,
    file_path: str,
    ref: str = "",
) -> dict:
    """Read the content of a file from the repository.

    Use this to inspect source code, configuration files, README, or any other
    file when reviewing PRs or triaging issues. For PR reviews, pass the PR's
    head branch as `ref` to read the version being proposed.

    Args:
        installation_id: GitHub App installation ID
        owner: Repository owner
        repo: Repository name
        file_path: Path to the file (e.g., 'src/main.py', 'README.md')
        ref: Branch name, tag, or commit SHA (optional, defaults to repo default branch)

    Returns:
        File content and metadata, or {found: False} if not found.
    """
    g = get_github_client(installation_id)
    repository = g.get_repo(f"{owner}/{repo}")

    try:
        kwargs = {"path": file_path}
        if ref:
            kwargs["ref"] = ref
        content = repository.get_contents(**kwargs)

        if isinstance(content, list):
            return {
                "found": True,
                "is_directory": True,
                "path": file_path,
                "entries": [
                    {"name": item.name, "type": item.type, "size": item.size, "path": item.path}
                    for item in content[:100]
                ],
            }

        if content.encoding == "none" or content.content is None:
            return {"found": True, "binary": True, "path": file_path, "size": content.size}

        decoded = base64.b64decode(content.content).decode("utf-8")
        return {
            "found": True,
            "path": file_path,
            "size": content.size,
            "content": f"<untrusted-content>{decoded[:10000]}</untrusted-content>",
            "truncated": content.size > 10000,
        }
    except Exception as e:
        return {"found": False, "path": file_path, "error": str(e)}


@tool
def list_repo_directory(
    installation_id: int,
    owner: str,
    repo: str,
    path: str = "",
    ref: str = "",
) -> dict:
    """List files and subdirectories at a given path in the repository.

    Use this to explore the repository structure and find relevant files
    before reading them with get_repo_file_content.

    Args:
        installation_id: GitHub App installation ID
        owner: Repository owner
        repo: Repository name
        path: Directory path (empty string for root)
        ref: Branch name, tag, or commit SHA (optional, defaults to repo default branch)

    Returns:
        List of entries (files and directories) at the given path.
    """
    g = get_github_client(installation_id)
    repository = g.get_repo(f"{owner}/{repo}")

    try:
        kwargs = {"path": path}
        if ref:
            kwargs["ref"] = ref
        contents = repository.get_contents(**kwargs)

        if not isinstance(contents, list):
            contents = [contents]

        entries = [
            {
                "name": item.name,
                "type": item.type,
                "size": item.size,
                "path": item.path,
            }
            for item in contents[:200]
        ]

        return {
            "path": path or "/",
            "entry_count": len(entries),
            "entries": entries,
            "truncated": len(contents) > 200,
        }
    except Exception as e:
        return {"path": path, "error": str(e)}
