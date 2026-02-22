"""
Middleware for Legenddary Platform
Logging, rate limiting, subscription checks
"""
import time
import logging
from datetime import datetime, timezone
from typing import Callable
from fastapi import Request, Response, HTTPException
from starlette.middleware.base import BaseHTTPMiddleware
from slowapi import Limiter
from slowapi.util import get_remote_address
from config import get_settings, SUBSCRIPTION_TIERS

settings = get_settings()

# Configure logging
logging.basicConfig(
    level=logging.INFO,
    format='%(asctime)s - %(name)s - %(levelname)s - %(message)s',
    handlers=[
        logging.FileHandler('/var/log/legenddary_app.log', mode='a'),
        logging.StreamHandler()
    ]
)

logger = logging.getLogger("legenddary")
auth_logger = logging.getLogger("legenddary.auth")
ai_logger = logging.getLogger("legenddary.ai")
error_logger = logging.getLogger("legenddary.errors")

# Rate limiter setup
limiter = Limiter(key_func=get_remote_address)


class LoggingMiddleware(BaseHTTPMiddleware):
    async def dispatch(self, request: Request, call_next: Callable) -> Response:
        start_time = time.time()
        
        # Log request
        logger.info(f"Request: {request.method} {request.url.path} from {request.client.host}")
        
        try:
            response = await call_next(request)
            
            # Calculate processing time
            process_time = time.time() - start_time
            
            # Log response
            logger.info(f"Response: {response.status_code} in {process_time:.3f}s")
            
            # Log failed auth attempts
            if response.status_code == 401:
                auth_logger.warning(f"Failed auth: {request.method} {request.url.path} from {request.client.host}")
            
            # Log errors
            if response.status_code >= 400:
                error_logger.error(f"Error {response.status_code}: {request.method} {request.url.path}")
            
            return response
            
        except Exception as e:
            error_logger.exception(f"Unhandled error: {str(e)}")
            raise


def log_failed_auth(request: Request, reason: str):
    auth_logger.warning(f"Auth failed: {reason} | IP: {request.client.host} | Path: {request.url.path}")


def log_ai_usage(user_id: str, ai_type: str, tokens_used: int = 0):
    ai_logger.info(f"AI Usage: user={user_id} type={ai_type} tokens={tokens_used}")


def log_export_usage(user_id: str, export_format: str, book_id: str):
    logger.info(f"Export: user={user_id} format={export_format} book={book_id}")


async def check_subscription_limit(db, user_id: str, limit_type: str) -> bool:
    """Check if user is within their subscription limits"""
    user = await db.users.find_one({"id": user_id}, {"_id": 0})
    if not user:
        return False
    
    tier = user.get("subscription_tier", "free")
    tier_config = SUBSCRIPTION_TIERS.get(tier, SUBSCRIPTION_TIERS["free"])
    
    # Get current month usage
    now = datetime.now(timezone.utc)
    month_start = now.replace(day=1, hour=0, minute=0, second=0, microsecond=0)
    
    usage = await db.usage.find_one({
        "user_id": user_id,
        "month": month_start.isoformat()
    }, {"_id": 0})
    
    if not usage:
        usage = {"ai_calls": 0, "exports": 0}
    
    if limit_type == "ai":
        limit = tier_config.get("ai_calls_monthly", 10)
        current = usage.get("ai_calls", 0)
    elif limit_type == "export":
        limit = tier_config.get("exports_monthly", 2)
        current = usage.get("exports", 0)
    else:
        return True
    
    return current < limit


async def increment_usage(db, user_id: str, usage_type: str):
    """Increment usage counter for user"""
    now = datetime.now(timezone.utc)
    month_start = now.replace(day=1, hour=0, minute=0, second=0, microsecond=0)
    
    field = "ai_calls" if usage_type == "ai" else "exports"
    
    await db.usage.update_one(
        {"user_id": user_id, "month": month_start.isoformat()},
        {
            "$inc": {field: 1},
            "$set": {"updated_at": now.isoformat()}
        },
        upsert=True
    )


async def get_user_usage(db, user_id: str) -> dict:
    """Get current month usage for user"""
    now = datetime.now(timezone.utc)
    month_start = now.replace(day=1, hour=0, minute=0, second=0, microsecond=0)
    
    usage = await db.usage.find_one({
        "user_id": user_id,
        "month": month_start.isoformat()
    }, {"_id": 0})
    
    if not usage:
        return {"ai_calls": 0, "exports": 0, "month": month_start.isoformat()}
    
    return usage
