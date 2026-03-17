"""Patrol agent factory."""

import logging

from strands import Agent

from src.config.prompts import PATROL_AGENT_SYSTEM_PROMPT
from src.config.settings import MAX_TOOL_CALLS, MODEL_ID
from src.tools import ALL_TOOLS

logger = logging.getLogger(__name__)


def create_patrol_agent(model_id: str | None = None) -> Agent:
    """Create a Strands patrol agent.

    Args:
        model_id: Bedrock model ID override. Uses MODEL_ID env var if not specified.

    Returns:
        Configured Strands Agent instance.
    """
    resolved_model_id = model_id or MODEL_ID

    logger.info("Creating patrol agent with model=%s, max_tool_calls=%d", resolved_model_id, MAX_TOOL_CALLS)

    return Agent(
        model=resolved_model_id,
        system_prompt=PATROL_AGENT_SYSTEM_PROMPT,
        tools=ALL_TOOLS,
        max_tool_calls=MAX_TOOL_CALLS,
    )
