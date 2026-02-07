from fastapi import FastAPI
from fastapi.middleware.cors import CORSMiddleware
from app.database import init_database
from app.services.nlp import init_spacy
from app.services.pdf_segmenter import get_pdf_segmenter_runtime_info
from app.routers import auth, texts, sentences, ai, tts, pdf
import logging

# Configure logging
logging.basicConfig(
    level=logging.INFO,
    format='%(asctime)s - %(name)s - %(levelname)s - %(message)s',
    handlers=[
        logging.StreamHandler()
    ]
)
logger = logging.getLogger(__name__)

# Initialize
init_database()
init_spacy()
pdf_runtime = get_pdf_segmenter_runtime_info()
logger.info(
    "PDF segmentation runtime: engine=%s default_strategy=%s",
    pdf_runtime["engine"],
    pdf_runtime["default_strategy"],
)

app = FastAPI(title="AI Reading Co-pilot API")

# Middleware
app.add_middleware(
    CORSMiddleware,
    allow_origins=["*"],
    allow_credentials=True,
    allow_methods=["*"],
    allow_headers=["*"],
    expose_headers=[
        "X-Paragraph-Page",
        "X-Paragraph-Page-Size",
        "X-Paragraph-Total",
        "X-Paragraph-Total-Pages",
    ],
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
