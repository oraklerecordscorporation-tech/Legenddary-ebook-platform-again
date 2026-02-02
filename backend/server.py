from fastapi import FastAPI, APIRouter, HTTPException, Depends
from fastapi.security import HTTPBearer, HTTPAuthorizationCredentials
from dotenv import load_dotenv
from starlette.middleware.cors import CORSMiddleware
from motor.motor_asyncio import AsyncIOMotorClient
import os
import logging
from pathlib import Path
from pydantic import BaseModel, Field, EmailStr
from typing import List, Optional, Dict, Any
import uuid
from datetime import datetime, timezone
import jwt
import bcrypt
from bson import ObjectId
import base64
import io
from reportlab.lib.pagesizes import letter, A4
from reportlab.pdfgen import canvas as pdf_canvas
from reportlab.lib.units import inch
from reportlab.pdfbase import pdfmetrics
from reportlab.pdfbase.ttfonts import TTFont
from ebooklib import epub
import asyncio

ROOT_DIR = Path(__file__).parent
load_dotenv(ROOT_DIR / '.env')

# MongoDB connection
mongo_url = os.environ['MONGO_URL']
client = AsyncIOMotorClient(mongo_url)
db = client[os.environ['DB_NAME']]

# JWT Config
JWT_SECRET = os.environ.get('JWT_SECRET')
if not JWT_SECRET:
    JWT_SECRET = os.environ.get('EMERGENT_LLM_KEY', 'fallback-dev-only')  # Use LLM key as fallback for dev
JWT_ALGORITHM = "HS256"

# Emergent LLM Key
EMERGENT_LLM_KEY = os.environ.get('EMERGENT_LLM_KEY', '')

app = FastAPI(title="Legenddary API", version="1.0.0")
api_router = APIRouter(prefix="/api")
security = HTTPBearer()

# Configure logging
logging.basicConfig(level=logging.INFO, format='%(asctime)s - %(name)s - %(levelname)s - %(message)s')
logger = logging.getLogger(__name__)

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
    created_at: str

class TokenResponse(BaseModel):
    token: str
    user: UserResponse

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
    type: str = "chapter"  # preface, chapter, epilogue
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
    data: str  # base64 encoded image
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
    type: str = "content"  # content, footnote, style, publishing, marketing

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
    format: str  # pdf, epub

# ==================== AUTH HELPERS ====================

def hash_password(password: str) -> str:
    return bcrypt.hashpw(password.encode(), bcrypt.gensalt()).decode()

def verify_password(password: str, hashed: str) -> bool:
    return bcrypt.checkpw(password.encode(), hashed.encode())

def create_token(user_id: str) -> str:
    payload = {
        "user_id": user_id,
        "exp": datetime.now(timezone.utc).timestamp() + 86400 * 7  # 7 days
    }
    return jwt.encode(payload, JWT_SECRET, algorithm=JWT_ALGORITHM)

async def get_current_user(credentials: HTTPAuthorizationCredentials = Depends(security)) -> dict:
    try:
        payload = jwt.decode(credentials.credentials, JWT_SECRET, algorithms=[JWT_ALGORITHM])
        user = await db.users.find_one({"id": payload["user_id"]}, {"_id": 0})
        if not user:
            raise HTTPException(status_code=401, detail="User not found")
        return user
    except jwt.ExpiredSignatureError:
        raise HTTPException(status_code=401, detail="Token expired")
    except jwt.InvalidTokenError:
        raise HTTPException(status_code=401, detail="Invalid token")

# ==================== AI HELPERS ====================

async def call_ai(prompt: str, system_message: str = "") -> str:
    """Call GPT-5.2 via Emergent Integration"""
    try:
        from emergentintegrations.llm.chat import LlmChat, UserMessage
        
        chat = LlmChat(
            api_key=EMERGENT_LLM_KEY,
            session_id=f"legenddary-{uuid.uuid4()}",
            system_message=system_message or "You are a helpful writing assistant for authors."
        )
        chat.with_model("openai", "gpt-5.2")
        
        user_message = UserMessage(text=prompt)
        response = await chat.send_message(user_message)
        return response
    except Exception as e:
        logger.error(f"AI call failed: {e}")
        return f"AI suggestion unavailable: {str(e)}"

# ==================== AUTH ROUTES ====================

@api_router.post("/auth/register", response_model=TokenResponse)
async def register(user_data: UserCreate):
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
        "created_at": now
    }
    
    await db.users.insert_one(user)
    token = create_token(user_id)
    
    return TokenResponse(
        token=token,
        user=UserResponse(id=user_id, email=user_data.email, name=user_data.name, created_at=now)
    )

@api_router.post("/auth/login", response_model=TokenResponse)
async def login(credentials: UserLogin):
    user = await db.users.find_one({"email": credentials.email}, {"_id": 0})
    if not user or not verify_password(credentials.password, user["password"]):
        raise HTTPException(status_code=401, detail="Invalid credentials")
    
    token = create_token(user["id"])
    return TokenResponse(
        token=token,
        user=UserResponse(id=user["id"], email=user["email"], name=user["name"], created_at=user["created_at"])
    )

@api_router.get("/auth/me", response_model=UserResponse)
async def get_me(user: dict = Depends(get_current_user)):
    return UserResponse(id=user["id"], email=user["email"], name=user["name"], created_at=user["created_at"])

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

# ==================== SIGNATURE ROUTES ====================

@api_router.post("/signatures", response_model=SignatureResponse)
async def create_signature(sig_data: SignatureCreate, user: dict = Depends(get_current_user)):
    sig_id = str(uuid.uuid4())
    now = datetime.now(timezone.utc).isoformat()
    
    signature = {
        "id": sig_id,
        "user_id": user["id"],
        "name": sig_data.name,
        "data": sig_data.data,
        "created_at": now
    }
    
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

# ==================== AI ROUTES ====================

@api_router.post("/ai/suggest", response_model=AIResponse)
async def ai_suggest(request: AIRequest, user: dict = Depends(get_current_user)):
    prompts = {
        "content": f"As a writing assistant, provide creative content suggestions for the following context. Keep suggestions concise and helpful:\n\nContext: {request.context}\n\nRequest: {request.prompt}",
        "footnote": f"Suggest relevant footnotes for this text. Provide 2-3 footnote suggestions with proper academic style:\n\nText: {request.context}\n\nTopic: {request.prompt}",
        "style": f"Provide style, grammar, and flow improvements for this text. Be specific and actionable:\n\nText: {request.prompt}",
        "publishing": f"Provide publishing recommendations for this book. Include platform suggestions (Amazon KDP, Apple Books, Kobo, etc.) and tips:\n\nBook details: {request.prompt}\n\nGenre: {request.context}",
        "marketing": f"Provide marketing strategies and promotion tips for this book:\n\nBook details: {request.prompt}\n\nTarget audience: {request.context}"
    }
    
    system_messages = {
        "content": "You are a creative writing assistant helping authors craft compelling narratives.",
        "footnote": "You are an academic writing assistant specializing in footnotes and citations.",
        "style": "You are a professional editor focusing on style, grammar, and readability.",
        "publishing": "You are a publishing expert with deep knowledge of self-publishing platforms.",
        "marketing": "You are a book marketing specialist helping authors promote their work."
    }
    
    prompt = prompts.get(request.type, prompts["content"])
    system = system_messages.get(request.type, system_messages["content"])
    
    result = await call_ai(prompt, system)
    return AIResponse(result=result, type=request.type)

# ==================== IMAGE SEARCH ROUTES ====================

@api_router.post("/images/search", response_model=List[ImageResult])
async def search_images(request: ImageSearchRequest, user: dict = Depends(get_current_user)):
    """Search Unsplash for images - returns mock results for now, integrate with real API"""
    import aiohttp
    
    results = []
    
    # Unsplash API (using demo access)
    unsplash_url = f"https://api.unsplash.com/search/photos?query={request.query}&per_page={request.count}"
    
    try:
        async with aiohttp.ClientSession() as session:
            async with session.get(
                unsplash_url,
                headers={"Authorization": "Client-ID demo"}
            ) as resp:
                if resp.status == 200:
                    data = await resp.json()
                    for photo in data.get("results", [])[:request.count]:
                        results.append(ImageResult(
                            url=photo["urls"]["regular"],
                            thumb_url=photo["urls"]["thumb"],
                            alt=photo.get("alt_description", ""),
                            photographer=photo["user"]["name"],
                            source="Unsplash"
                        ))
    except Exception as e:
        logger.warning(f"Unsplash search failed: {e}")
    
    # If no results, provide placeholder
    if not results:
        for i in range(request.count):
            results.append(ImageResult(
                url=f"https://picsum.photos/seed/{request.query}{i}/800/600",
                thumb_url=f"https://picsum.photos/seed/{request.query}{i}/200/150",
                alt=f"Image for {request.query}",
                photographer="Lorem Picsum",
                source="Placeholder"
            ))
    
    return results

# ==================== EXPORT ROUTES ====================

@api_router.post("/export")
async def export_book(request: ExportRequest, user: dict = Depends(get_current_user)):
    book = await db.books.find_one({"id": request.book_id, "user_id": user["id"]}, {"_id": 0})
    if not book:
        raise HTTPException(status_code=404, detail="Book not found")
    
    chapters = await db.chapters.find({"book_id": request.book_id}, {"_id": 0}).sort("order", 1).to_list(100)
    
    if request.format == "pdf":
        return await generate_pdf(book, chapters)
    elif request.format == "epub":
        return await generate_epub(book, chapters)
    else:
        raise HTTPException(status_code=400, detail="Unsupported format")

async def generate_pdf(book: dict, chapters: list) -> dict:
    buffer = io.BytesIO()
    c = pdf_canvas.Canvas(buffer, pagesize=letter)
    width, height = letter
    
    # Title page
    c.setFont("Helvetica-Bold", 24)
    c.drawCentredString(width/2, height - 200, book["title"])
    
    if book.get("description"):
        c.setFont("Helvetica", 12)
        c.drawCentredString(width/2, height - 250, book["description"][:100])
    
    c.showPage()
    
    # Chapters
    for chapter in chapters:
        c.setFont("Helvetica-Bold", 18)
        c.drawString(72, height - 72, chapter["title"])
        
        c.setFont("Helvetica", 11)
        y = height - 120
        
        # Simple text wrapping
        content = chapter.get("content", "")
        # Strip HTML tags for PDF
        import re
        clean_content = re.sub('<[^<]+?>', '', content)
        
        words = clean_content.split()
        line = ""
        for word in words:
            test_line = line + " " + word if line else word
            if c.stringWidth(test_line, "Helvetica", 11) < width - 144:
                line = test_line
            else:
                c.drawString(72, y, line)
                y -= 14
                line = word
                
                if y < 72:
                    c.showPage()
                    y = height - 72
        
        if line:
            c.drawString(72, y, line)
        
        c.showPage()
    
    c.save()
    buffer.seek(0)
    pdf_base64 = base64.b64encode(buffer.read()).decode()
    
    return {
        "format": "pdf",
        "filename": f"{book['title']}.pdf",
        "data": pdf_base64,
        "content_type": "application/pdf"
    }

async def generate_epub(book: dict, chapters: list) -> dict:
    ebook = epub.EpubBook()
    ebook.set_identifier(book["id"])
    ebook.set_title(book["title"])
    ebook.set_language('en')
    
    # Add chapters
    epub_chapters = []
    for i, chapter in enumerate(chapters):
        c = epub.EpubHtml(title=chapter["title"], file_name=f'chapter_{i}.xhtml', lang='en')
        c.content = f'<h1>{chapter["title"]}</h1>{chapter.get("content", "")}'
        ebook.add_item(c)
        epub_chapters.append(c)
    
    # Table of contents
    ebook.toc = tuple(epub_chapters)
    ebook.add_item(epub.EpubNcx())
    ebook.add_item(epub.EpubNav())
    
    # Spine
    ebook.spine = ['nav'] + epub_chapters
    
    # Write to buffer
    buffer = io.BytesIO()
    epub.write_epub(buffer, ebook)
    buffer.seek(0)
    epub_base64 = base64.b64encode(buffer.read()).decode()
    
    return {
        "format": "epub",
        "filename": f"{book['title']}.epub",
        "data": epub_base64,
        "content_type": "application/epub+zip"
    }

# ==================== STATS ROUTE ====================

@api_router.get("/stats")
async def get_stats(user: dict = Depends(get_current_user)):
    books = await db.books.find({"user_id": user["id"]}, {"_id": 0}).to_list(100)
    total_books = len(books)
    total_words = sum(b.get("word_count", 0) for b in books)
    total_chapters = sum(b.get("chapter_count", 0) for b in books)
    
    return {
        "total_books": total_books,
        "total_words": total_words,
        "total_chapters": total_chapters
    }

# ==================== HEALTH CHECK ====================

@api_router.get("/")
async def root():
    return {"message": "Legenddary API v1.0", "status": "healthy"}

@api_router.get("/health")
async def health():
    return {"status": "healthy", "timestamp": datetime.now(timezone.utc).isoformat()}

# Include router
app.include_router(api_router)

app.add_middleware(
    CORSMiddleware,
    allow_credentials=True,
    allow_origins=os.environ.get('CORS_ORIGINS', '*').split(','),
    allow_methods=["*"],
    allow_headers=["*"],
)

@app.on_event("shutdown")
async def shutdown_db_client():
    client.close()
