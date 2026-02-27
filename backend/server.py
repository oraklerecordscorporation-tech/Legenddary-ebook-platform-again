"""
Legenddary Platform - Enterprise API Server
Full-featured eBook creation platform with security, subscriptions, and AI
"""
from fastapi import FastAPI, APIRouter, HTTPException, Depends, Request, Header
from fastapi.security import HTTPBearer, HTTPAuthorizationCredentials
from fastapi.responses import JSONResponse
from dotenv import load_dotenv
from starlette.middleware.cors import CORSMiddleware
from motor.motor_asyncio import AsyncIOMotorClient
from slowapi import Limiter, _rate_limit_exceeded_handler
from slowapi.util import get_remote_address
from slowapi.errors import RateLimitExceeded
import os
import logging
from pathlib import Path
from pydantic import BaseModel, Field, EmailStr
from typing import List, Optional
import uuid
from datetime import datetime, timezone
import base64
import io
import re
from urllib.parse import parse_qs, urlparse
from reportlab.lib.pagesizes import letter
from reportlab.pdfgen import canvas as pdf_canvas
from ebooklib import epub
import stripe

# Local imports
from config import get_settings, SUBSCRIPTION_TIERS
from security import (
    hash_password, verify_password, create_token_pair, 
    verify_access_token, verify_refresh_token,
    create_password_reset_token, verify_password_reset_token,
    TokenPair
)
from middleware import (
    LoggingMiddleware, log_failed_auth, log_ai_usage, log_export_usage,
    check_subscription_limit, increment_usage, get_user_usage
)
import stripe_service

ROOT_DIR = Path(__file__).parent
load_dotenv(ROOT_DIR / '.env')

settings = get_settings()

# MongoDB connection
client = AsyncIOMotorClient(settings.MONGO_URL)
db = client[settings.DB_NAME]

# Stripe setup
stripe.api_key = settings.STRIPE_SECRET_KEY

# Rate limiter
limiter = Limiter(key_func=get_remote_address)

# App setup
app = FastAPI(
    title="Legenddary API",
    version="2.0.0",
    description="Enterprise eBook Creation Platform"
)
app.state.limiter = limiter
app.add_exception_handler(RateLimitExceeded, _rate_limit_exceeded_handler)

api_router = APIRouter(prefix="/api")
security = HTTPBearer()

# Logging
logging.basicConfig(level=logging.INFO)
logger = logging.getLogger("legenddary")

# ==================== MODELS ====================

class UserCreate(BaseModel):
    email: EmailStr
    password: str
    name: str

class UserLogin(BaseModel):
    email: EmailStr
    password: str

class UserResponse(BaseModel):
    id: str
    email: str
    name: str
    subscription_tier: str = "free"
    created_at: str

class AuthResponse(BaseModel):
    access_token: str
    refresh_token: str
    token_type: str = "bearer"
    user: UserResponse

class RefreshRequest(BaseModel):
    refresh_token: str

class PasswordResetRequest(BaseModel):
    email: EmailStr

class PasswordResetConfirm(BaseModel):
    token: str
    new_password: str

class BookCreate(BaseModel):
    title: str
    description: Optional[str] = ""
    genre: Optional[str] = ""

class BookUpdate(BaseModel):
    title: Optional[str] = None
    description: Optional[str] = None
    genre: Optional[str] = None
    cover_data: Optional[str] = None

class BookResponse(BaseModel):
    id: str
    title: str
    description: str
    genre: str
    cover_data: Optional[str] = None
    user_id: str
    created_at: str
    updated_at: str
    chapter_count: int = 0
    word_count: int = 0

class ChapterCreate(BaseModel):
    title: str
    type: str = "chapter"
    order: int

class ChapterUpdate(BaseModel):
    title: Optional[str] = None
    content: Optional[str] = None
    type: Optional[str] = None
    order: Optional[int] = None

class ChapterResponse(BaseModel):
    id: str
    book_id: str
    title: str
    content: str
    type: str
    order: int
    word_count: int = 0
    created_at: str
    updated_at: str

class SignatureCreate(BaseModel):
    data: str
    name: str

class SignatureResponse(BaseModel):
    id: str
    user_id: str
    name: str
    data: str
    created_at: str

class AIRequest(BaseModel):
    prompt: str
    context: Optional[str] = ""
    type: str = "content"

class AIResponse(BaseModel):
    result: str
    type: str

class ImageSearchRequest(BaseModel):
    query: str
    count: int = 6

class ImageResult(BaseModel):
    url: str
    thumb_url: str
    alt: str
    photographer: str
    source: str

class ExportRequest(BaseModel):
    book_id: str
    format: str
    print_ready: bool = False
    paper_size: str = "6x9"
    include_bleed: bool = False

class VersionResponse(BaseModel):
    id: str
    chapter_id: str
    content: str
    word_count: int
    created_at: str

class CheckoutRequest(BaseModel):
    price_id: str
    success_url: str
    cancel_url: str

class UsageResponse(BaseModel):
    ai_calls: int
    ai_limit: int
    exports: int
    export_limit: int
    tier: str

# ==================== AUTH HELPERS ====================

async def get_current_user(credentials: HTTPAuthorizationCredentials = Depends(security)) -> dict:
    user_id = verify_access_token(credentials.credentials)
    if not user_id:
        raise HTTPException(status_code=401, detail="Invalid or expired token")
    
    user = await db.users.find_one({"id": user_id}, {"_id": 0, "password": 0})
    if not user:
        raise HTTPException(status_code=401, detail="User not found")
    return user

async def get_current_user_with_subscription(credentials: HTTPAuthorizationCredentials = Depends(security)) -> dict:
    user = await get_current_user(credentials)
    tier = user.get("subscription_tier", "free")
    user["tier_config"] = SUBSCRIPTION_TIERS.get(tier, SUBSCRIPTION_TIERS["free"])
    return user

# ==================== AUTH ROUTES ====================

@api_router.post("/auth/register", response_model=AuthResponse)
@limiter.limit(settings.RATE_LIMIT_LOGIN)
async def register(request: Request, user_data: UserCreate):
    existing = await db.users.find_one({"email": user_data.email})
    if existing:
        raise HTTPException(status_code=400, detail="Email already registered")
    
    user_id = str(uuid.uuid4())
    now = datetime.now(timezone.utc).isoformat()
    
    user = {
        "id": user_id,
        "email": user_data.email,
        "password": hash_password(user_data.password),
        "name": user_data.name,
        "subscription_tier": "free",
        "subscription_status": "active",
        "stripe_customer_id": None,
        "stripe_subscription_id": None,
        "created_at": now,
        "updated_at": now
    }
    
    await db.users.insert_one(user)
    tokens = create_token_pair(user_id)
    
    return AuthResponse(
        access_token=tokens.access_token,
        refresh_token=tokens.refresh_token,
        user=UserResponse(
            id=user_id, email=user_data.email, name=user_data.name,
            subscription_tier="free", created_at=now
        )
    )

@api_router.post("/auth/login", response_model=AuthResponse)
@limiter.limit(settings.RATE_LIMIT_LOGIN)
async def login(request: Request, credentials: UserLogin):
    user = await db.users.find_one({"email": credentials.email}, {"_id": 0})
    if not user or not verify_password(credentials.password, user["password"]):
        log_failed_auth(request, f"Invalid credentials for {credentials.email}")
        raise HTTPException(status_code=401, detail="Invalid credentials")
    
    tokens = create_token_pair(user["id"])
    
    return AuthResponse(
        access_token=tokens.access_token,
        refresh_token=tokens.refresh_token,
        user=UserResponse(
            id=user["id"], email=user["email"], name=user["name"],
            subscription_tier=user.get("subscription_tier", "free"),
            created_at=user["created_at"]
        )
    )

@api_router.post("/auth/refresh", response_model=AuthResponse)
async def refresh_tokens(data: RefreshRequest):
    user_id = verify_refresh_token(data.refresh_token)
    if not user_id:
        raise HTTPException(status_code=401, detail="Invalid refresh token")
    
    user = await db.users.find_one({"id": user_id}, {"_id": 0, "password": 0})
    if not user:
        raise HTTPException(status_code=401, detail="User not found")
    
    tokens = create_token_pair(user_id)
    
    return AuthResponse(
        access_token=tokens.access_token,
        refresh_token=tokens.refresh_token,
        user=UserResponse(
            id=user["id"], email=user["email"], name=user["name"],
            subscription_tier=user.get("subscription_tier", "free"),
            created_at=user["created_at"]
        )
    )

@api_router.post("/auth/password-reset/request")
@limiter.limit("3/minute")
async def request_password_reset(request: Request, data: PasswordResetRequest):
    user = await db.users.find_one({"email": data.email}, {"_id": 0})
    # Always return success to prevent email enumeration
    if user:
        create_password_reset_token(user["id"], user["email"])
        # In production, send email with reset link
        logger.info(f"Password reset requested for {data.email}")
    return {"message": "If email exists, reset instructions sent"}

@api_router.post("/auth/password-reset/confirm")
async def confirm_password_reset(data: PasswordResetConfirm):
    result = verify_password_reset_token(data.token)
    if not result:
        raise HTTPException(status_code=400, detail="Invalid or expired token")
    
    user_id, email = result
    new_hash = hash_password(data.new_password)
    
    await db.users.update_one(
        {"id": user_id},
        {"$set": {"password": new_hash, "updated_at": datetime.now(timezone.utc).isoformat()}}
    )
    return {"message": "Password updated successfully"}

@api_router.get("/auth/me", response_model=UserResponse)
async def get_me(user: dict = Depends(get_current_user)):
    return UserResponse(
        id=user["id"], email=user["email"], name=user["name"],
        subscription_tier=user.get("subscription_tier", "free"),
        created_at=user["created_at"]
    )

# ==================== SUBSCRIPTION ROUTES ====================

@api_router.post("/subscription/checkout")
async def create_checkout(data: CheckoutRequest, user: dict = Depends(get_current_user)):
    # Create Stripe customer if needed
    if not user.get("stripe_customer_id"):
        customer_id = await stripe_service.create_stripe_customer(
            user["email"], user["name"], user["id"]
        )
        await db.users.update_one(
            {"id": user["id"]},
            {"$set": {"stripe_customer_id": customer_id}}
        )
    else:
        customer_id = user["stripe_customer_id"]
    
    checkout_url = await stripe_service.create_checkout_session(
        customer_id, data.price_id, data.success_url, data.cancel_url, user["id"]
    )
    return {"checkout_url": checkout_url}

@api_router.post("/subscription/portal")
async def create_portal(user: dict = Depends(get_current_user)):
    if not user.get("stripe_customer_id"):
        raise HTTPException(status_code=400, detail="No subscription found")
    
    portal_url = await stripe_service.create_billing_portal_session(
        user["stripe_customer_id"],
        f"{settings.CORS_ORIGINS.split(',')[0]}/dashboard"
    )
    return {"portal_url": portal_url}

@api_router.get("/subscription/usage", response_model=UsageResponse)
async def get_usage(user: dict = Depends(get_current_user)):
    usage = await get_user_usage(db, user["id"])
    tier = user.get("subscription_tier", "free")
    tier_config = SUBSCRIPTION_TIERS.get(tier, SUBSCRIPTION_TIERS["free"])
    
    return UsageResponse(
        ai_calls=usage.get("ai_calls", 0),
        ai_limit=tier_config["ai_calls_monthly"],
        exports=usage.get("exports", 0),
        export_limit=tier_config["exports_monthly"],
        tier=tier
    )

@api_router.post("/webhooks/stripe")
async def stripe_webhook(request: Request, stripe_signature: str = Header(None)):
    payload = await request.body()
    event = stripe_service.verify_webhook_signature(payload, stripe_signature)
    
    if not event:
        raise HTTPException(status_code=400, detail="Invalid signature")
    
    event_type = event["type"]
    event_data = event["data"]["object"]
    
    if event_type == "checkout.session.completed":
        await stripe_service.handle_checkout_completed(db, event_data)
    elif event_type == "invoice.paid":
        await stripe_service.handle_invoice_paid(db, event_data)
    elif event_type == "customer.subscription.deleted":
        await stripe_service.handle_subscription_deleted(db, event_data)
    
    return {"status": "success"}

# ==================== BOOK ROUTES ====================

@api_router.post("/books", response_model=BookResponse)
async def create_book(book_data: BookCreate, user: dict = Depends(get_current_user)):
    book_id = str(uuid.uuid4())
    now = datetime.now(timezone.utc).isoformat()
    
    book = {
        "id": book_id,
        "title": book_data.title,
        "description": book_data.description,
        "genre": book_data.genre,
        "cover_data": None,
        "user_id": user["id"],
        "created_at": now,
        "updated_at": now,
        "chapter_count": 0,
        "word_count": 0
    }
    
    await db.books.insert_one(book)
    return BookResponse(**book)

@api_router.get("/books", response_model=List[BookResponse])
async def get_books(user: dict = Depends(get_current_user)):
    books = await db.books.find({"user_id": user["id"]}, {"_id": 0}).to_list(100)
    return [BookResponse(**book) for book in books]

@api_router.get("/books/{book_id}", response_model=BookResponse)
async def get_book(book_id: str, user: dict = Depends(get_current_user)):
    book = await db.books.find_one({"id": book_id, "user_id": user["id"]}, {"_id": 0})
    if not book:
        raise HTTPException(status_code=404, detail="Book not found")
    return BookResponse(**book)

@api_router.put("/books/{book_id}", response_model=BookResponse)
async def update_book(book_id: str, book_data: BookUpdate, user: dict = Depends(get_current_user)):
    book = await db.books.find_one({"id": book_id, "user_id": user["id"]})
    if not book:
        raise HTTPException(status_code=404, detail="Book not found")
    
    update_data = {k: v for k, v in book_data.model_dump().items() if v is not None}
    update_data["updated_at"] = datetime.now(timezone.utc).isoformat()
    
    await db.books.update_one({"id": book_id}, {"$set": update_data})
    updated = await db.books.find_one({"id": book_id}, {"_id": 0})
    return BookResponse(**updated)

@api_router.delete("/books/{book_id}")
async def delete_book(book_id: str, user: dict = Depends(get_current_user)):
    result = await db.books.delete_one({"id": book_id, "user_id": user["id"]})
    if result.deleted_count == 0:
        raise HTTPException(status_code=404, detail="Book not found")
    await db.chapters.delete_many({"book_id": book_id})
    return {"message": "Book deleted"}

# ==================== CHAPTER ROUTES ====================

@api_router.post("/books/{book_id}/chapters", response_model=ChapterResponse)
async def create_chapter(book_id: str, chapter_data: ChapterCreate, user: dict = Depends(get_current_user)):
    book = await db.books.find_one({"id": book_id, "user_id": user["id"]})
    if not book:
        raise HTTPException(status_code=404, detail="Book not found")
    
    chapter_id = str(uuid.uuid4())
    now = datetime.now(timezone.utc).isoformat()
    
    chapter = {
        "id": chapter_id,
        "book_id": book_id,
        "title": chapter_data.title,
        "content": "",
        "type": chapter_data.type,
        "order": chapter_data.order,
        "word_count": 0,
        "created_at": now,
        "updated_at": now
    }
    
    await db.chapters.insert_one(chapter)
    await update_book_stats(book_id)
    return ChapterResponse(**chapter)

@api_router.get("/books/{book_id}/chapters", response_model=List[ChapterResponse])
async def get_chapters(book_id: str, user: dict = Depends(get_current_user)):
    book = await db.books.find_one({"id": book_id, "user_id": user["id"]})
    if not book:
        raise HTTPException(status_code=404, detail="Book not found")
    
    chapters = await db.chapters.find({"book_id": book_id}, {"_id": 0}).sort("order", 1).to_list(100)
    return [ChapterResponse(**chapter) for chapter in chapters]

@api_router.put("/chapters/{chapter_id}", response_model=ChapterResponse)
async def update_chapter(chapter_id: str, chapter_data: ChapterUpdate, user: dict = Depends(get_current_user)):
    chapter = await db.chapters.find_one({"id": chapter_id}, {"_id": 0})
    if not chapter:
        raise HTTPException(status_code=404, detail="Chapter not found")
    
    book = await db.books.find_one({"id": chapter["book_id"], "user_id": user["id"]})
    if not book:
        raise HTTPException(status_code=403, detail="Access denied")
    
    update_data = {k: v for k, v in chapter_data.model_dump().items() if v is not None}
    if "content" in update_data:
        update_data["word_count"] = len(update_data["content"].split())
    update_data["updated_at"] = datetime.now(timezone.utc).isoformat()
    
    await db.chapters.update_one({"id": chapter_id}, {"$set": update_data})
    await update_book_stats(chapter["book_id"])
    
    updated = await db.chapters.find_one({"id": chapter_id}, {"_id": 0})
    return ChapterResponse(**updated)

@api_router.delete("/chapters/{chapter_id}")
async def delete_chapter(chapter_id: str, user: dict = Depends(get_current_user)):
    chapter = await db.chapters.find_one({"id": chapter_id})
    if not chapter:
        raise HTTPException(status_code=404, detail="Chapter not found")
    
    book = await db.books.find_one({"id": chapter["book_id"], "user_id": user["id"]})
    if not book:
        raise HTTPException(status_code=403, detail="Access denied")
    
    await db.chapters.delete_one({"id": chapter_id})
    await update_book_stats(chapter["book_id"])
    return {"message": "Chapter deleted"}

async def update_book_stats(book_id: str):
    chapters = await db.chapters.find({"book_id": book_id}, {"_id": 0, "word_count": 1}).to_list(100)
    chapter_count = len(chapters)
    word_count = sum(c.get("word_count", 0) for c in chapters)
    await db.books.update_one(
        {"id": book_id},
        {"$set": {"chapter_count": chapter_count, "word_count": word_count, "updated_at": datetime.now(timezone.utc).isoformat()}}
    )

# ==================== VERSION HISTORY ROUTES ====================

@api_router.post("/chapters/{chapter_id}/versions", response_model=VersionResponse)
async def save_version(chapter_id: str, user: dict = Depends(get_current_user)):
    chapter = await db.chapters.find_one({"id": chapter_id}, {"_id": 0})
    if not chapter:
        raise HTTPException(status_code=404, detail="Chapter not found")
    
    book = await db.books.find_one({"id": chapter["book_id"], "user_id": user["id"]})
    if not book:
        raise HTTPException(status_code=403, detail="Access denied")
    
    version_id = str(uuid.uuid4())
    now = datetime.now(timezone.utc).isoformat()
    
    version = {
        "id": version_id,
        "chapter_id": chapter_id,
        "content": chapter.get("content", ""),
        "word_count": chapter.get("word_count", 0),
        "created_at": now
    }
    
    await db.versions.insert_one(version)
    
    # Keep only last 20 versions
    versions = await db.versions.find({"chapter_id": chapter_id}).sort("created_at", -1).to_list(100)
    if len(versions) > 20:
        for v in versions[20:]:
            await db.versions.delete_one({"id": v["id"]})
    
    return VersionResponse(**version)

@api_router.get("/chapters/{chapter_id}/versions", response_model=List[VersionResponse])
async def get_versions(chapter_id: str, user: dict = Depends(get_current_user)):
    chapter = await db.chapters.find_one({"id": chapter_id}, {"_id": 0})
    if not chapter:
        raise HTTPException(status_code=404, detail="Chapter not found")
    
    book = await db.books.find_one({"id": chapter["book_id"], "user_id": user["id"]})
    if not book:
        raise HTTPException(status_code=403, detail="Access denied")
    
    versions = await db.versions.find({"chapter_id": chapter_id}, {"_id": 0}).sort("created_at", -1).to_list(20)
    return [VersionResponse(**v) for v in versions]

@api_router.post("/chapters/{chapter_id}/versions/{version_id}/restore", response_model=ChapterResponse)
async def restore_version(chapter_id: str, version_id: str, user: dict = Depends(get_current_user)):
    chapter = await db.chapters.find_one({"id": chapter_id}, {"_id": 0})
    if not chapter:
        raise HTTPException(status_code=404, detail="Chapter not found")
    
    book = await db.books.find_one({"id": chapter["book_id"], "user_id": user["id"]})
    if not book:
        raise HTTPException(status_code=403, detail="Access denied")
    
    version = await db.versions.find_one({"id": version_id, "chapter_id": chapter_id}, {"_id": 0})
    if not version:
        raise HTTPException(status_code=404, detail="Version not found")
    
    await db.chapters.update_one(
        {"id": chapter_id},
        {"$set": {"content": version["content"], "word_count": version["word_count"], "updated_at": datetime.now(timezone.utc).isoformat()}}
    )
    
    await update_book_stats(chapter["book_id"])
    updated = await db.chapters.find_one({"id": chapter_id}, {"_id": 0})
    return ChapterResponse(**updated)

# ==================== SIGNATURE ROUTES ====================

@api_router.post("/signatures", response_model=SignatureResponse)
async def create_signature(sig_data: SignatureCreate, user: dict = Depends(get_current_user)):
    sig_id = str(uuid.uuid4())
    now = datetime.now(timezone.utc).isoformat()
    
    signature = {"id": sig_id, "user_id": user["id"], "name": sig_data.name, "data": sig_data.data, "created_at": now}
    await db.signatures.insert_one(signature)
    return SignatureResponse(**signature)

@api_router.get("/signatures", response_model=List[SignatureResponse])
async def get_signatures(user: dict = Depends(get_current_user)):
    signatures = await db.signatures.find({"user_id": user["id"]}, {"_id": 0}).to_list(20)
    return [SignatureResponse(**sig) for sig in signatures]

@api_router.delete("/signatures/{sig_id}")
async def delete_signature(sig_id: str, user: dict = Depends(get_current_user)):
    result = await db.signatures.delete_one({"id": sig_id, "user_id": user["id"]})
    if result.deleted_count == 0:
        raise HTTPException(status_code=404, detail="Signature not found")
    return {"message": "Signature deleted"}

# ==================== AI ROUTES (Rate Limited) ====================

@api_router.post("/ai/suggest", response_model=AIResponse)
@limiter.limit(settings.RATE_LIMIT_AI)
async def ai_suggest(request: Request, ai_request: AIRequest, user: dict = Depends(get_current_user)):
    # Check subscription limits
    if not await check_subscription_limit(db, user["id"], "ai"):
        raise HTTPException(status_code=429, detail="Monthly AI limit reached. Please upgrade your plan.")
    
    prompts = {
        "content": f"As a writing assistant, provide creative content suggestions:\n\nContext: {ai_request.context}\n\nRequest: {ai_request.prompt}",
        "footnote": f"Suggest relevant footnotes for this text:\n\nText: {ai_request.context}\n\nTopic: {ai_request.prompt}",
        "style": f"Provide style, grammar, and flow improvements:\n\nText: {ai_request.prompt}",
        "publishing": f"Provide publishing recommendations:\n\nBook: {ai_request.prompt}\n\nGenre: {ai_request.context}",
        "marketing": f"Provide marketing strategies:\n\nBook: {ai_request.prompt}\n\nAudience: {ai_request.context}"
    }
    
    prompt = prompts.get(ai_request.type, prompts["content"])
    
    try:
        from emergentintegrations.llm.chat import LlmChat, UserMessage
        chat = LlmChat(api_key=settings.EMERGENT_LLM_KEY, session_id=f"legenddary-{uuid.uuid4()}")
        chat.with_model("openai", "gpt-5.2")
        response = await chat.send_message(UserMessage(text=prompt))
        
        # Track usage
        await increment_usage(db, user["id"], "ai")
        log_ai_usage(user["id"], ai_request.type, len(prompt))
        
        return AIResponse(result=response, type=ai_request.type)
    except Exception as e:
        logger.error(f"AI error: {e}")
        return AIResponse(result=f"AI unavailable: {str(e)}", type=ai_request.type)

# ==================== IMAGE SEARCH ====================

@api_router.post("/images/search", response_model=List[ImageResult])
async def search_images(request_data: ImageSearchRequest, user: dict = Depends(get_current_user)):
    results = []
    for i in range(request_data.count):
        results.append(ImageResult(
            url=f"https://picsum.photos/seed/{request_data.query}{i}/800/600",
            thumb_url=f"https://picsum.photos/seed/{request_data.query}{i}/200/150",
            alt=f"Image for {request_data.query}",
            photographer="Lorem Picsum",
            source="Placeholder"
        ))
    return results

# ==================== EXPORT ROUTES (Rate Limited) ====================

PAPER_SIZES = {
    "6x9": (432, 648), "5.5x8.5": (396, 612), "5x8": (360, 576), "8.5x11": (612, 792), "a5": (420, 595)
}

@api_router.post("/export")
@limiter.limit(settings.RATE_LIMIT_EXPORT)
async def export_book(request: Request, export_req: ExportRequest, user: dict = Depends(get_current_user)):
    if not await check_subscription_limit(db, user["id"], "export"):
        raise HTTPException(status_code=429, detail="Monthly export limit reached. Please upgrade your plan.")
    
    book = await db.books.find_one({"id": export_req.book_id, "user_id": user["id"]}, {"_id": 0})
    if not book:
        raise HTTPException(status_code=404, detail="Book not found")
    
    chapters = await db.chapters.find({"book_id": export_req.book_id}, {"_id": 0}).sort("order", 1).to_list(100)
    
    await increment_usage(db, user["id"], "export")
    log_export_usage(user["id"], export_req.format, export_req.book_id)
    
    if export_req.format == "pdf":
        return await generate_pdf(book, chapters, export_req.print_ready, export_req.paper_size, export_req.include_bleed)
    elif export_req.format == "epub":
        return await generate_epub(book, chapters)
    raise HTTPException(status_code=400, detail="Unsupported format")

async def generate_pdf(book: dict, chapters: list, print_ready: bool = False, paper_size: str = "6x9", include_bleed: bool = False) -> dict:
    width, height = PAPER_SIZES.get(paper_size, PAPER_SIZES["6x9"])
    bleed = 9 if include_bleed else 0
    width += bleed * 2
    height += bleed * 2
    
    buffer = io.BytesIO()
    c = pdf_canvas.Canvas(buffer, pagesize=(width, height))
    
    # Title page
    c.setFont("Helvetica-Bold", 24)
    c.drawCentredString(width/2, height - 200, book["title"])
    c.showPage()
    
    # Chapters
    for chapter in chapters:
        c.setFont("Helvetica-Bold", 18)
        c.drawString(72, height - 72, chapter["title"])
        c.setFont("Helvetica", 11)
        y = height - 120
        
        content = re.sub('<[^<]+?>', '', chapter.get("content", ""))
        for word in content.split():
            if y < 72:
                c.showPage()
                y = height - 72
            c.drawString(72, y, word)
            y -= 14
        c.showPage()
    
    c.save()
    buffer.seek(0)
    
    return {
        "format": "pdf",
        "filename": f"{book['title']}.pdf",
        "data": base64.b64encode(buffer.read()).decode(),
        "content_type": "application/pdf"
    }

async def generate_epub(book: dict, chapters: list) -> dict:
    ebook = epub.EpubBook()
    ebook.set_identifier(book["id"])
    ebook.set_title(book["title"])
    ebook.set_language('en')
    
    epub_chapters = []
    for i, chapter in enumerate(chapters):
        c = epub.EpubHtml(title=chapter["title"], file_name=f'chapter_{i}.xhtml', lang='en')
        c.content = f'<h1>{chapter["title"]}</h1>{chapter.get("content", "")}'
        ebook.add_item(c)
        epub_chapters.append(c)
    
    ebook.toc = tuple(epub_chapters)
    ebook.add_item(epub.EpubNcx())
    ebook.add_item(epub.EpubNav())
    ebook.spine = ['nav'] + epub_chapters
    
    buffer = io.BytesIO()
    epub.write_epub(buffer, ebook)
    buffer.seek(0)
    
    return {
        "format": "epub",
        "filename": f"{book['title']}.epub",
        "data": base64.b64encode(buffer.read()).decode(),
        "content_type": "application/epub+zip"
    }

# ==================== CALCULATOR ROUTE ====================

@api_router.post("/calculator/royalties")
async def calculate_royalties(calc: dict, user: dict = Depends(get_current_user)):
    price = calc.get("book_price", 9.99)
    pages = calc.get("page_count", 200)
    print_cost = 0.85 + (pages * 0.012)
    
    platforms = {
        "amazon_kdp_ebook": {"name": "Amazon KDP (eBook)", "royalty": round(price * 0.7, 2)},
        "amazon_kdp_print": {"name": "Amazon KDP (Print)", "royalty": round(max(0, (price - print_cost) * 0.6), 2)},
        "apple_books": {"name": "Apple Books", "royalty": round(price * 0.7, 2)},
        "kobo": {"name": "Kobo", "royalty": round(price * 0.7, 2)},
        "google_play": {"name": "Google Play", "royalty": round(price * 0.7, 2)},
    }
    
    return {"platforms": platforms, "print_cost": round(print_cost, 2)}

# ==================== STATS & HEALTH ====================

@api_router.get("/stats")
async def get_stats(user: dict = Depends(get_current_user)):
    books = await db.books.find({"user_id": user["id"]}, {"_id": 0, "word_count": 1, "chapter_count": 1}).to_list(100)
    return {
        "total_books": len(books),
        "total_words": sum(b.get("word_count", 0) for b in books),
        "total_chapters": sum(b.get("chapter_count", 0) for b in books)
    }

@api_router.get("/")
async def root():
    return {"message": "Legenddary API v2.0", "status": "healthy"}

@api_router.get("/health")
async def health():
    return {"status": "healthy", "timestamp": datetime.now(timezone.utc).isoformat()}

# ==================== APP SETUP ====================

app.include_router(api_router)
app.add_middleware(LoggingMiddleware)
app.add_middleware(
    CORSMiddleware,
    allow_credentials=settings.CORS_ALLOW_CREDENTIALS,
    allow_origins=settings.CORS_ORIGINS.split(','),
    allow_methods=["*"],
    allow_headers=["*"],
)

@app.on_event("shutdown")
async def shutdown_db_client():
    client.close()

# ==================== DOCUMENT IMPORT/EXPORT ====================
from fastapi import UploadFile, File
from document_service import parse_docx, export_to_html, export_to_txt, export_to_docx, analyze_content_structure, smart_split_content

@api_router.post("/import/docx")
async def import_docx(file: UploadFile = File(...), user: dict = Depends(get_current_user)):
    if not file.filename.endswith('.docx'):
        raise HTTPException(status_code=400, detail="Only .docx files supported")
    content = await file.read()
    sections = parse_docx(content)
    return {"sections": sections, "count": len(sections)}

@api_router.post("/books/{book_id}/import")
async def import_to_book(book_id: str, file: UploadFile = File(...), user: dict = Depends(get_current_user)):
    book = await db.books.find_one({"id": book_id, "user_id": user["id"]})
    if not book:
        raise HTTPException(status_code=404, detail="Book not found")
    if not file.filename.endswith('.docx'):
        raise HTTPException(status_code=400, detail="Only .docx files supported")
    
    content = await file.read()
    sections = parse_docx(content)
    
    created = []
    for i, section in enumerate(sections):
        chapter_id = str(uuid.uuid4())
        now = datetime.now(timezone.utc).isoformat()
        chapter = {
            "id": chapter_id, "book_id": book_id, "title": section["title"],
            "content": section["content"], "type": section["type"],
            "order": i * 10, "word_count": len(section["content"].split()),
            "tags": [], "created_at": now, "updated_at": now
        }
        await db.chapters.insert_one(chapter)
        created.append(chapter_id)
    
    await update_book_stats(book_id)
    return {"imported": len(created), "chapters": created}

@api_router.post("/export/html")
async def export_html(export_req: ExportRequest, user: dict = Depends(get_current_user)):
    book = await db.books.find_one({"id": export_req.book_id, "user_id": user["id"]}, {"_id": 0})
    if not book:
        raise HTTPException(status_code=404, detail="Book not found")
    chapters = await db.chapters.find({"book_id": export_req.book_id}, {"_id": 0}).sort("order", 1).to_list(100)
    html = export_to_html(book, chapters)
    return {"format": "html", "filename": f"{book['title']}.html", "data": base64.b64encode(html.encode()).decode(), "content_type": "text/html"}

@api_router.post("/export/txt")
async def export_txt(export_req: ExportRequest, user: dict = Depends(get_current_user)):
    book = await db.books.find_one({"id": export_req.book_id, "user_id": user["id"]}, {"_id": 0})
    if not book:
        raise HTTPException(status_code=404, detail="Book not found")
    chapters = await db.chapters.find({"book_id": export_req.book_id}, {"_id": 0}).sort("order", 1).to_list(100)
    txt = export_to_txt(book, chapters)
    return {"format": "txt", "filename": f"{book['title']}.txt", "data": base64.b64encode(txt.encode()).decode(), "content_type": "text/plain"}

@api_router.post("/export/docx")
async def export_docx_file(export_req: ExportRequest, user: dict = Depends(get_current_user)):
    book = await db.books.find_one({"id": export_req.book_id, "user_id": user["id"]}, {"_id": 0})
    if not book:
        raise HTTPException(status_code=404, detail="Book not found")
    chapters = await db.chapters.find({"book_id": export_req.book_id}, {"_id": 0}).sort("order", 1).to_list(100)
    docx_bytes = export_to_docx(book, chapters)
    return {"format": "docx", "filename": f"{book['title']}.docx", "data": base64.b64encode(docx_bytes).decode(), "content_type": "application/vnd.openxmlformats-officedocument.wordprocessingml.document"}

# ==================== TAGS & SEARCH ====================

@api_router.put("/chapters/{chapter_id}/tags")
async def update_tags(chapter_id: str, tags: List[str], user: dict = Depends(get_current_user)):
    chapter = await db.chapters.find_one({"id": chapter_id}, {"_id": 0})
    if not chapter:
        raise HTTPException(status_code=404, detail="Chapter not found")
    book = await db.books.find_one({"id": chapter["book_id"], "user_id": user["id"]})
    if not book:
        raise HTTPException(status_code=403, detail="Access denied")
    await db.chapters.update_one({"id": chapter_id}, {"$set": {"tags": tags}})
    return {"tags": tags}

@api_router.get("/search")
async def search_content(q: str, user: dict = Depends(get_current_user)):
    books = await db.books.find({"user_id": user["id"], "$or": [{"title": {"$regex": q, "$options": "i"}}, {"description": {"$regex": q, "$options": "i"}}]}, {"_id": 0}).to_list(50)
    chapters = []
    user_books = await db.books.find({"user_id": user["id"]}, {"_id": 0, "id": 1}).to_list(100)
    book_ids = [b["id"] for b in user_books]
    if book_ids:
        chapters = await db.chapters.find({"book_id": {"$in": book_ids}, "$or": [{"title": {"$regex": q, "$options": "i"}}, {"content": {"$regex": q, "$options": "i"}}, {"tags": {"$in": [q]}}]}, {"_id": 0, "content": 0}).to_list(50)
    return {"books": books, "chapters": chapters}

# ==================== AI ANALYSIS ====================

@api_router.post("/ai/analyze")
async def ai_analyze(data: dict, user: dict = Depends(get_current_user)):
    content = data.get("content", "")
    if not content:
        return {"suggestion": None}
    
    analysis = analyze_content_structure(content)
    
    if analysis["suggestions"]:
        return {"suggestion": analysis["suggestions"][0], "analysis": analysis}
    
    # Generate contextual suggestion
    word_count = analysis["word_count"]
    if word_count < 100:
        return {"suggestion": {"type": "question", "message": "Just getting started? Would you like some opening line suggestions?"}}
    elif word_count > 1000 and word_count % 500 < 50:
        return {"suggestion": {"type": "improvement", "message": f"Great progress! You've written {word_count} words. Want me to review your flow?"}}
    
    return {"suggestion": None, "analysis": analysis}

@api_router.post("/ai/detect-structure")
async def detect_structure(data: dict, user: dict = Depends(get_current_user)):
    content = data.get("content", "")
    split_by = data.get("split_by", "chapter")
    chapters = smart_split_content(content, split_by)
    return {"chapters": chapters, "count": len(chapters)}

# ==================== BATCH IMPORT & URL IMPORT ====================
import aiohttp
from bs4 import BeautifulSoup


def _extract_google_drive_file_id(url: str) -> Optional[str]:
    parsed = urlparse(url)
    if "drive.google.com" not in parsed.netloc:
        return None

    file_match = re.search(r"/file/d/([a-zA-Z0-9_-]+)", parsed.path)
    if file_match:
        return file_match.group(1)

    query = parse_qs(parsed.query)
    return query.get("id", [None])[0]


def _looks_like_docx(content_type: str, source_url: str, content: bytes) -> bool:
    content_type_lower = content_type.lower()
    if "application/vnd.openxmlformats-officedocument.wordprocessingml.document" in content_type_lower:
        return True
    if source_url.lower().endswith(".docx"):
        return True
    return content.startswith(b"PK\x03\x04")

@api_router.post("/import/batch")
async def batch_import(files: List[UploadFile] = File(...), user: dict = Depends(get_current_user)):
    """Import multiple .docx files at once"""
    results = []
    for i, file in enumerate(files):
        if not file.filename.endswith('.docx'):
            results.append({"filename": file.filename, "status": "skipped", "reason": "Not a .docx file"})
            continue
        try:
            content = await file.read()
            sections = parse_docx(content)
            results.append({"filename": file.filename, "status": "success", "sections": sections, "order": i})
        except Exception as e:
            results.append({"filename": file.filename, "status": "error", "reason": str(e)})
    return {"results": results, "total": len(results)}

@api_router.post("/import/url")
async def import_from_url(data: dict, user: dict = Depends(get_current_user)):
    """Import content from a URL (Google Docs, Google Drive, web pages)"""
    url = data.get("url", "")
    if not url:
        raise HTTPException(status_code=400, detail="URL required")
    
    try:
        # Handle Google Docs export
        if "docs.google.com" in url:
            doc_id = re.search(r'/d/([a-zA-Z0-9-_]+)', url)
            if doc_id:
                url = f"https://docs.google.com/document/d/{doc_id.group(1)}/export?format=txt"
        elif "drive.google.com" in url:
            file_id = _extract_google_drive_file_id(url)
            if not file_id:
                raise HTTPException(status_code=400, detail="Invalid Google Drive link")
            url = f"https://drive.google.com/uc?export=download&id={file_id}"
        
        async with aiohttp.ClientSession() as session:
            async with session.get(url, timeout=30) as resp:
                if resp.status != 200:
                    raise HTTPException(status_code=400, detail="Could not fetch URL")
                
                content_type = resp.headers.get('content-type', '')
                content = await resp.read()

                if _looks_like_docx(content_type, url, content):
                    sections = parse_docx(content)
                    return {"sections": sections, "count": len(sections), "source": url}
                
                if 'html' in content_type:
                    soup = BeautifulSoup(content, 'html.parser')
                    for tag in soup(['script', 'style', 'nav', 'header', 'footer']):
                        tag.decompose()
                    text = soup.get_text(separator='\n')
                    sections = smart_split_content(text, "chapter")
                else:
                    text = content.decode('utf-8', errors='ignore')
                    sections = smart_split_content(text, "chapter")
                
                return {"sections": sections, "count": len(sections), "source": url}
    except HTTPException:
        raise
    except Exception as e:
        raise HTTPException(status_code=400, detail=f"Import failed: {str(e)}")

@api_router.post("/import/smart-paste")
async def smart_paste(data: dict, user: dict = Depends(get_current_user)):
    """Clean up pasted content from Word, web, Google Docs"""
    content = data.get("content", "")
    if not content:
        raise HTTPException(status_code=400, detail="Content required")
    
    # Remove Word-specific junk
    content = re.sub(r'<o:p>.*?</o:p>', '', content, flags=re.DOTALL)
    content = re.sub(r'<!--.*?-->', '', content, flags=re.DOTALL)
    content = re.sub(r'<!\[if.*?\]>.*?<!\[endif\]>', '', content, flags=re.DOTALL)
    content = re.sub(r'class="[^"]*Mso[^"]*"', '', content)
    content = re.sub(r'style="[^"]*mso-[^"]*"', '', content)
    
    # Clean up common formatting issues
    content = re.sub(r'<span[^>]*>\s*</span>', '', content)
    content = re.sub(r'<p[^>]*>\s*</p>', '', content)
    content = re.sub(r'\s+', ' ', content)
    
    # Convert plain text line breaks to paragraphs if no HTML
    if '<p>' not in content and '<div>' not in content:
        paragraphs = content.split('\n\n')
        content = ''.join([f'<p>{p.strip()}</p>' for p in paragraphs if p.strip()])
    
    # Detect structure
    analysis = analyze_content_structure(content)
    
    return {"cleaned": content, "analysis": analysis}

@api_router.put("/books/{book_id}/reorder-chapters")
async def reorder_chapters(book_id: str, chapter_order: List[str], user: dict = Depends(get_current_user)):
    """Reorder chapters by providing list of chapter IDs in new order"""
    book = await db.books.find_one({"id": book_id, "user_id": user["id"]})
    if not book:
        raise HTTPException(status_code=404, detail="Book not found")
    
    for i, chapter_id in enumerate(chapter_order):
        await db.chapters.update_one(
            {"id": chapter_id, "book_id": book_id},
            {"$set": {"order": i * 10, "updated_at": datetime.now(timezone.utc).isoformat()}}
        )
    
    return {"reordered": len(chapter_order)}

@api_router.post("/books/{book_id}/batch-import")
async def batch_import_to_book(book_id: str, files: List[UploadFile] = File(...), user: dict = Depends(get_current_user)):
    """Import multiple files directly into a book"""
    book = await db.books.find_one({"id": book_id, "user_id": user["id"]})
    if not book:
        raise HTTPException(status_code=404, detail="Book not found")
    
    existing = await db.chapters.count_documents({"book_id": book_id})
    created = []
    
    for file_idx, file in enumerate(files):
        if not file.filename.endswith('.docx'):
            continue
        try:
            content = await file.read()
            sections = parse_docx(content)
            
            for sec_idx, section in enumerate(sections):
                chapter_id = str(uuid.uuid4())
                now = datetime.now(timezone.utc).isoformat()
                order = (existing + file_idx * 100 + sec_idx) * 10
                
                chapter = {
                    "id": chapter_id, "book_id": book_id,
                    "title": section["title"], "content": section["content"],
                    "type": section["type"], "order": order,
                    "word_count": len(section["content"].split()),
                    "tags": [], "created_at": now, "updated_at": now
                }
                await db.chapters.insert_one(chapter)
                created.append({"id": chapter_id, "title": section["title"]})
        except Exception as e:
            logger.error(f"Batch import error: {e}")
    
    await update_book_stats(book_id)
    return {"imported": len(created), "chapters": created}
