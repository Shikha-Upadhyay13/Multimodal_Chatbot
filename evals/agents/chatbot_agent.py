"""Harbor agent: send instruction.md to the live Express chatbot."""

from __future__ import annotations

import json
from pathlib import Path

from harbor.agents.base import BaseAgent
from harbor.environments.base import BaseEnvironment
from harbor.models.agent.context import AgentContext

from agents.chat_client import post_chat


class ChatbotAgent(BaseAgent):
    @staticmethod
    def name() -> str:
        return "chatbot"

    def version(self) -> str | None:
        return "0.1.0"

    async def setup(self, environment: BaseEnvironment) -> None:
        return None

    async def run(
        self,
        instruction: str,
        environment: BaseEnvironment,
        context: AgentContext,
    ) -> None:
        trial_id = self.session_id or (str(self.context_id) if self.context_id else "trial")
        result = post_chat(instruction, session_id=f"harbor-{trial_id}")
        if result.get("error"):
            raise RuntimeError(result["error"])

        logs = self.logs_dir if getattr(self, "logs_dir", None) else Path.cwd() / "harbor-logs"
        logs.mkdir(parents=True, exist_ok=True)
        answer_path = logs / "answer.txt"
        tools_path = logs / "tools.json"
        answer_path.write_text(result["answer"], encoding="utf-8")
        tools_path.write_text(json.dumps(result["tools"], indent=2), encoding="utf-8")

        await environment.upload_file(answer_path, "/workspace/answer.txt")
        await environment.upload_file(tools_path, "/workspace/tools.json")
