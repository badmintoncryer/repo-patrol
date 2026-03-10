"""BedrockAgentCoreApp entrypoint for repo-patrol agent."""

import json
import logging

from bedrock_agentcore import BedrockAgentCoreApp

from src.agents.patrol_agent import create_patrol_agent
from src.config.settings import LOG_LEVEL

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
    logger.info("Received payload: %s", json.dumps(payload, default=str))

    model_id = payload.get("model_id")
    agent = _get_agent(model_id=model_id)

    prompt = json.dumps(payload, ensure_ascii=False)
    result = agent(prompt)

    response_text = str(result)
    logger.info("Agent completed. Response length: %d", len(response_text))

    return {"response": response_text}


if __name__ == "__main__":
    app.run()
