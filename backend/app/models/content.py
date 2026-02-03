from typing import Optional, List
from pydantic import BaseModel

# Texts
class TextCreate(BaseModel):
    title: str
    content: str
    scaffolding_data: Optional[dict] = None

class TextUpdate(BaseModel):
    title: Optional[str] = None
    content: Optional[str] = None
    scaffolding_data: Optional[dict] = None

class TextResponse(BaseModel):
    id: int
    title: str
    content: str
    scaffolding_data: Optional[dict] = None
    reading_mode: str = "flow"
    scaffold_level: int = 2
    vocab_level: str = "B1"
    current_paragraph_id: Optional[int] = None
    created_at: str
    updated_at: str

class TextProgressUpdate(BaseModel):
    reading_mode: Optional[str] = None
    scaffold_level: Optional[int] = None
    vocab_level: Optional[str] = None
    current_paragraph_id: Optional[int] = None

# Sentences
class SentenceResponse(BaseModel):
    id: int
    text_id: int
    sentence_index: int
    content: str
    translation: Optional[str]
    analysis: Optional[dict]

class SentenceUpdate(BaseModel):
    translation: Optional[str] = None
    analysis: Optional[dict] = None
