"""Model providers for the chat assistant."""
from backend.app.services.llm.anthropic import AnthropicProvider
from backend.app.services.llm.base import (
    Finish,
    LLMProvider,
    LLMRequest,
    ProviderAuthError,
    ProviderError,
    ProviderRateLimited,
    ProviderUnavailable,
    TextDelta,
    ToolCall,
    Usage,
)
from backend.app.services.llm.vertex_gemini import VertexGeminiProvider


def build_provider(settings) -> LLMProvider:
    """Instantiate the provider named by settings.chat_provider."""
    if settings.chat_provider == "vertex":
        return VertexGeminiProvider(settings.vertex_api_key)
    return AnthropicProvider(settings.anthropic_api_key)


__all__ = [
    "AnthropicProvider",
    "Finish",
    "LLMProvider",
    "LLMRequest",
    "ProviderAuthError",
    "ProviderError",
    "ProviderRateLimited",
    "ProviderUnavailable",
    "TextDelta",
    "ToolCall",
    "Usage",
    "VertexGeminiProvider",
    "build_provider",
]
