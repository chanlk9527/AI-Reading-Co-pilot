from fastapi import FastAPI
from fastapi.middleware.cors import CORSMiddleware
from app.database import init_database
from app.services.nlp import init_spacy
from app.routers import auth, texts, sentences, ai, tts, pdf
import logging

# Configure logging
logging.basicConfig(
    level=logging.INFO,
    format='%(asctime)s - %(name)s - %(levelname)s - %(message)s',
    handlers=[
        logging.FileHandler("server_debug.log"),
        logging.StreamHandler()
    ]
)
logger = logging.getLogger(__name__)

# Initialize
init_database()
init_spacy()

app = FastAPI(title="AI Reading Co-pilot API")

# Middleware
app.add_middleware(
    CORSMiddleware,
    allow_origins=["*"],
    allow_credentials=True,
    allow_methods=["*"],
    allow_headers=["*"],
)

# Routes
app.include_router(auth.router)
app.include_router(texts.router)
app.include_router(sentences.router)
app.include_router(ai.router)
app.include_router(tts.router)
app.include_router(pdf.router)

@app.get("/")
async def health_check():
    return {"status": "ok", "service": "AI Reading Co-pilot API"}
