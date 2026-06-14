"""
NeuroApply AI — OpenAI API Client
Async wrapper for chat completions and embeddings via the OpenAI SDK.
"""

from typing import AsyncGenerator, Optional
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
        messages: Optional[list] = None,
    ) -> str:
        """
        Call chat completions. Optionally pass prior `messages` for multi-turn context.
        The system_prompt is always prepended; user_prompt is appended as the final user turn.
        """
        all_messages = [{"role": "system", "content": system_prompt}]
        if messages:
            all_messages.extend(messages)
        all_messages.append({"role": "user", "content": user_prompt})

        response = await self.client.chat.completions.create(
            model=settings.openai_llm_model,
            messages=all_messages,
            temperature=temperature,
            max_tokens=max_tokens,
        )
        return response.choices[0].message.content

    async def stream_chat_completion(
        self,
        system_prompt: str,
        user_prompt: str,
        temperature: float = 0.3,
        max_tokens: int = 300,
        messages: Optional[list] = None,
    ) -> AsyncGenerator[str, None]:
        """Async generator that yields text chunks as the model streams them."""
        all_messages = [{"role": "system", "content": system_prompt}]
        if messages:
            all_messages.extend(messages)
        all_messages.append({"role": "user", "content": user_prompt})

        stream = await self.client.chat.completions.create(
            model=settings.openai_llm_model,
            messages=all_messages,
            temperature=temperature,
            max_tokens=max_tokens,
            stream=True,
        )
        async for chunk in stream:
            delta = chunk.choices[0].delta.content
            if delta:
                yield delta

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
