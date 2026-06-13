"""
NeuroApply AI — OpenAI API Client
Async wrapper for chat completions and embeddings via the OpenAI SDK.
"""

from typing import Optional
from openai import AsyncOpenAI

from app.config import settings


class OpenAIClient:
    """Async wrapper around the OpenAI API."""

    def __init__(self):
        self._client: Optional[AsyncOpenAI] = None

    def connect(self):
        """Initialize the AsyncOpenAI client."""
        self._client = AsyncOpenAI(api_key=settings.openai_api_key)

    @property
    def client(self) -> AsyncOpenAI:
        if self._client is None:
            raise RuntimeError("OpenAI client not connected. Call connect() first.")
        return self._client

    async def chat_completion(
        self,
        system_prompt: str,
        user_prompt: str,
        temperature: float = 0.1,
        max_tokens: int = 4096,
    ) -> str:
        response = await self.client.chat.completions.create(
            model=settings.openai_llm_model,
            messages=[
                {"role": "system", "content": system_prompt},
                {"role": "user", "content": user_prompt},
            ],
            temperature=temperature,
            max_tokens=max_tokens,
        )
        return response.choices[0].message.content

    async def generate_embeddings(self, texts: list[str]) -> list[list[float]]:
        response = await self.client.embeddings.create(
            model=settings.openai_embed_model,
            input=texts,
        )
        sorted_data = sorted(response.data, key=lambda x: x.index)
        return [item.embedding for item in sorted_data]

    async def generate_single_embedding(self, text: str) -> list[float]:
        embeddings = await self.generate_embeddings([text])
        return embeddings[0]


# Global singleton — initialized in app lifespan
openai_client = OpenAIClient()
