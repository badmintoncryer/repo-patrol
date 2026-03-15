"""GitHub App authentication helper.

Retrieves GitHub App credentials from AWS Secrets Manager and creates
authenticated PyGithub clients for specific installations.
"""

import json
import logging

import boto3
from github import Auth, Github, GithubIntegration

from src.config.settings import AWS_REGION, GITHUB_APP_SECRET_ARN

logger = logging.getLogger(__name__)

_cached_credentials: dict | None = None


def _get_app_credentials() -> dict:
    """Retrieve GitHub App credentials from Secrets Manager (cached)."""
    global _cached_credentials
    if _cached_credentials is not None:
        return _cached_credentials

    client = boto3.client("secretsmanager", region_name=AWS_REGION)
    response = client.get_secret_value(SecretId=GITHUB_APP_SECRET_ARN)
    _cached_credentials = json.loads(response["SecretString"])
    return _cached_credentials


def get_github_client(installation_id: int) -> Github:
    """Get an authenticated GitHub client for a specific App installation.

    Uses PyGithub's AppInstallationAuth which automatically refreshes
    the 1-hour installation access token when needed.

    Args:
        installation_id: The GitHub App installation ID for the target org/repo.

    Returns:
        Authenticated Github client instance.
    """
    creds = _get_app_credentials()
    app_auth = Auth.AppAuth(
        app_id=int(creds["app_id"]),
        private_key=creds["private_key"],
    )
    integration = GithubIntegration(auth=app_auth)
    return integration.get_github_for_installation(installation_id)
