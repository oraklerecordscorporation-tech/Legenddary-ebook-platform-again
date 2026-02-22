"""
Enterprise Configuration for Legenddary Platform
Handles environment separation and secure settings
"""
from pydantic_settings import BaseSettings
from pydantic import Field
from typing import Optional
from functools import lru_cache


class Settings(BaseSettings):
    """Application settings with environment variable loading"""
    
    # Environment
    ENVIRONMENT: str = Field(default="development", description="development or production")
    DEBUG: bool = Field(default=True)
    
    # Database
    MONGO_URL: str = Field(default="mongodb://localhost:27017")
    DB_NAME: str = Field(default="legenddary_db")
    
    # JWT Settings
    JWT_SECRET_KEY: str = Field(default="change-this-in-production-use-long-random-string")
    JWT_ALGORITHM: str = Field(default="HS256")
    ACCESS_TOKEN_EXPIRE_MINUTES: int = Field(default=30)
    REFRESH_TOKEN_EXPIRE_DAYS: int = Field(default=7)
    PASSWORD_RESET_TOKEN_EXPIRE_MINUTES: int = Field(default=15)
    
    # API Keys
    EMERGENT_LLM_KEY: str = Field(default="")
    OPENAI_API_KEY: Optional[str] = Field(default=None)
    
    # Stripe
    STRIPE_SECRET_KEY: str = Field(default="")
    STRIPE_WEBHOOK_SECRET: str = Field(default="")
    STRIPE_STARTER_PRICE_ID: str = Field(default="")
    STRIPE_PRO_PRICE_ID: str = Field(default="")
    STRIPE_PUBLISHER_PRICE_ID: str = Field(default="")
    
    # CORS
    CORS_ORIGINS: str = Field(default="*")
    CORS_ALLOW_CREDENTIALS: bool = Field(default=True)
    
    # Rate Limiting
    RATE_LIMIT_LOGIN: str = Field(default="5/minute")
    RATE_LIMIT_AI: str = Field(default="20/minute")
    RATE_LIMIT_EXPORT: str = Field(default="10/minute")
    
    # Redis (for rate limiting)
    REDIS_URL: Optional[str] = Field(default=None)
    
    # Subscription Limits
    STARTER_AI_CALLS_MONTHLY: int = Field(default=50)
    STARTER_EXPORTS_MONTHLY: int = Field(default=5)
    PRO_AI_CALLS_MONTHLY: int = Field(default=500)
    PRO_EXPORTS_MONTHLY: int = Field(default=50)
    PUBLISHER_AI_CALLS_MONTHLY: int = Field(default=5000)
    PUBLISHER_EXPORTS_MONTHLY: int = Field(default=500)
    
    class Config:
        env_file = ".env"
        env_file_encoding = "utf-8"
        case_sensitive = True


@lru_cache()
def get_settings() -> Settings:
    """Cached settings instance"""
    return Settings()


# Subscription tier configurations
SUBSCRIPTION_TIERS = {
    "free": {
        "name": "Free",
        "ai_calls_monthly": 10,
        "exports_monthly": 2,
        "features": ["basic_editor", "single_book"]
    },
    "starter": {
        "name": "Starter",
        "price_monthly": 9.99,
        "ai_calls_monthly": 50,
        "exports_monthly": 5,
        "features": ["basic_editor", "ai_assistant", "3_books", "pdf_export"]
    },
    "pro": {
        "name": "Pro",
        "price_monthly": 29.99,
        "ai_calls_monthly": 500,
        "exports_monthly": 50,
        "features": ["full_editor", "ai_assistant", "unlimited_books", "all_exports", "cover_designer", "templates"]
    },
    "publisher": {
        "name": "Publisher",
        "price_monthly": 79.99,
        "ai_calls_monthly": 5000,
        "exports_monthly": 500,
        "features": ["full_editor", "ai_assistant", "unlimited_books", "all_exports", "cover_designer", "templates", "print_ready", "priority_support"]
    }
}
