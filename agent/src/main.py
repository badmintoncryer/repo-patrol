"""BedrockAgentCoreApp entrypoint for repo-patrol agent."""

import json
import logging

from bedrock_agentcore import BedrockAgentCoreApp

from src.agents.patrol_agent import create_patrol_agent
from src.config.settings import LOG_LEVEL, set_dry_run

logging.basicConfig(level=getattr(logging, LOG_LEVEL), format="%(asctime)s %(name)s %(levelname)s %(message)s")
logger = logging.getLogger(__name__)

app = BedrockAgentCoreApp()

_agent = None


def _get_agent(model_id: str | None = None):
    """Lazy-load agent for cold start optimization."""
    global _agent
    if _agent is None or model_id:
        _agent = create_patrol_agent(model_id=model_id)
    return _agent


@app.entrypoint
def invoke(payload):
    """AgentCore Runtime entrypoint.

    Expected payload:
    {
        "owner": "github-org",
        "repo": "repo-name",
        "job_type": "review_pull_requests",
        "installation_id": 12345,
        "model_id": "us.anthropic.claude-haiku-4-5-20251001-v1:0",  # optional override
        "config": {},
        "dry_run": false
    }
    """
    logger.info(
        "Received payload: owner=%s repo=%s job_type=%s dry_run=%s",
        payload.get("owner"), payload.get("repo"),
        payload.get("job_type"), payload.get("dry_run"),
    )

    # Validate required fields
    VALID_JOB_TYPES = {
        "review_pull_requests", "triage_issues", "handle_dependabot",
        "analyze_ci_failures", "check_dependencies", "repo_health_check",
    }
    for field in ("owner", "repo", "job_type", "installation_id"):
        if not payload.get(field):
            raise ValueError(f"Missing required field: {field}")

    if not isinstance(payload["installation_id"], int):
        raise ValueError("installation_id must be an integer")

    if payload["job_type"] not in VALID_JOB_TYPES:
        raise ValueError(f"Invalid job_type: {payload['job_type']}. Must be one of {VALID_JOB_TYPES}")

    # Enforce dry_run from payload (overrides env var)
    if "dry_run" in payload:
        set_dry_run(bool(payload["dry_run"]))

    model_id = payload.get("model_id")
    agent = _get_agent(model_id=model_id)

    prompt = json.dumps(payload, ensure_ascii=False)
    result = agent(prompt)

    response_text = str(result)
    logger.info("Agent completed. Response length: %d", len(response_text))

    return {"response": response_text}


if __name__ == "__main__":
    app.run()
