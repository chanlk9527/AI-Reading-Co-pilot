from typing import Dict, List, Optional, Tuple
from pydantic import BaseModel, Field


class ParagraphCandidate(BaseModel):
    text: str
    page_start: int
    page_end: int
    bbox: Optional[Tuple[float, float, float, float]] = None
    confidence: float = Field(ge=0.0, le=1.0)
    signals: Dict[str, float] = Field(default_factory=dict)


class UploadQualityReport(BaseModel):
    success: bool = True
    filename: str
    text: str
    char_count: int
    truncated: bool = False
    message: str
    paragraphs_preview: List[ParagraphCandidate] = Field(default_factory=list)
    quality_score: Optional[float] = Field(default=None, ge=0.0, le=1.0)
    layout_flags: Dict[str, object] = Field(default_factory=dict)
    engine_used: str
