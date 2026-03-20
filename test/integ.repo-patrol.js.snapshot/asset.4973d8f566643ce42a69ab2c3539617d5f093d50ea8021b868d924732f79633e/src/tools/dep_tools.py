"""Dependency management tools."""

import base64
import logging

from strands import tool

from src.lib.github_auth import get_github_client

logger = logging.getLogger(__name__)


@tool
def check_dependabot_config(installation_id: int, owner: str, repo: str) -> dict:
    """Check if a repository has Dependabot configured and return its configuration.

    Args:
        installation_id: GitHub App installation ID
        owner: Repository owner
        repo: Repository name

    Returns:
        Dependabot configuration status and details.
    """
    g = get_github_client(installation_id)
    repository = g.get_repo(f"{owner}/{repo}")

    try:
        content = repository.get_contents(".github/dependabot.yml")
        decoded = base64.b64decode(content.content).decode("utf-8") if content.content else ""
        return {
            "configured": True,
            "path": ".github/dependabot.yml",
            "content": decoded[:3000],
        }
    except Exception:
        pass

    try:
        content = repository.get_contents(".github/dependabot.yaml")
        decoded = base64.b64decode(content.content).decode("utf-8") if content.content else ""
        return {
            "configured": True,
            "path": ".github/dependabot.yaml",
            "content": decoded[:3000],
        }
    except Exception:
        return {"configured": False, "path": None, "content": None}


@tool
def get_dependency_file(installation_id: int, owner: str, repo: str, file_path: str) -> dict:
    """Fetch the content of a dependency file from the repository.

    Args:
        installation_id: GitHub App installation ID
        owner: Repository owner
        repo: Repository name
        file_path: Path to the dependency file (e.g., 'package.json', 'requirements.txt')

    Returns:
        File content and metadata.
    """
    g = get_github_client(installation_id)
    repository = g.get_repo(f"{owner}/{repo}")

    try:
        content = repository.get_contents(file_path)
        decoded = base64.b64decode(content.content).decode("utf-8") if content.content else ""
        return {
            "found": True,
            "path": file_path,
            "size": content.size,
            "content": decoded[:5000],
        }
    except Exception as e:
        return {"found": False, "path": file_path, "error": str(e)}
