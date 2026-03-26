"""Configuration settings for the AI Coach service."""

from functools import lru_cache

from pydantic import Field
from pydantic_settings import BaseSettings


class Settings(BaseSettings):
    """Main settings aggregating all configuration."""

    # AI settings — provider-agnostic (OpenAI-compatible)
    ai_model: str = Field(default="claude-haiku-4-5-20251001", alias="AI_MODEL")
    ai_temperature: float = Field(default=0.7, alias="AI_TEMPERATURE")
    ai_base_url: str = Field(
        default="https://api.anthropic.com/v1/",
        alias="AI_BASE_URL",
        description="OpenAI-compatible base URL (e.g. https://api.openai.com/v1, http://localhost:11434/v1)",
    )
    ai_api_key: str | None = Field(default=None, alias="AI_API_KEY", description="Server-side API key fallback")

    # Workout API
    workout_api_url: str = Field(default="http://api:8000", alias="WORKOUT_API_URL")

    # Redis
    redis_url: str = Field(default="redis://redis:6379/0", alias="REDIS_URL")
    cache_ttl: int = Field(default=3600, alias="CACHE_TTL")

    # Chat history
    chat_history_ttl: int = Field(
        default=1_209_600, alias="CHAT_HISTORY_TTL", description="Chat TTL in seconds (default 14 days)"
    )
    chat_max_conversations: int = Field(default=20, alias="CHAT_MAX_CONVERSATIONS")
    chat_max_messages: int = Field(default=100, alias="CHAT_MAX_MESSAGES", description="Max messages per conversation")

    # JWT (shared with API for admin-check on per-user keys)
    jwt_secret_key: str = Field(default="dev-secret-key-change-in-production", alias="JWT_SECRET_KEY")

    # Service
    host: str = Field(default="0.0.0.0", alias="SERVICE_HOST")
    port: int = Field(default=8001, alias="SERVICE_PORT")
    debug: bool = Field(default=False, alias="DEBUG")
    log_level: str = Field(default="INFO", alias="LOG_LEVEL")

    class Config:
        env_file = ".env"
        extra = "ignore"


@lru_cache
def get_settings() -> Settings:
    """Get cached settings instance."""
    return Settings()
