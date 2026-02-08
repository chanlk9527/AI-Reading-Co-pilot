from typing import List
from fastapi import APIRouter, HTTPException, Depends
from app.database import get_db
from app.models.content import TextCreate, TextUpdate, TextResponse, TextProgressUpdate
from app.routers.auth import get_current_user
from app.services.nlp import sentencize
from app.services.text_segmenter import segment_text_into_paragraphs
import logging
import json
import re

router = APIRouter(prefix="/texts", tags=["Texts"])
logger = logging.getLogger(__name__)


def _split_imported_paragraphs(content: str) -> List[str]:
    if not content or not content.strip():
        return []
    return [segment.strip() for segment in re.split(r"\n\s*\n+", content) if segment.strip()]

@router.get("", response_model=List[TextResponse])
async def list_texts(user = Depends(get_current_user)):
    logger.info(f"Listing texts for User {user['id']}")
    with get_db() as conn:
        cursor = conn.cursor()
        cursor.execute(
            "SELECT * FROM texts WHERE user_id = ? ORDER BY updated_at DESC",
            (user["id"],)
        )
        texts = cursor.fetchall()
        result = []
        for t in texts:
            t = dict(t)
            result.append(TextResponse(
                id=t["id"],
                title=t["title"],
                content=t["content"],
                reading_mode=t["reading_mode"] or "flow",
                scaffold_level=t["scaffold_level"] or 2,
                vocab_level=t["vocab_level"] or "B1",
                current_paragraph_id=t["current_paragraph_id"],
                created_at=str(t["created_at"]),
                updated_at=str(t["updated_at"])
            ))
        return result

@router.post("", response_model=TextResponse, status_code=201)
async def create_text(data: TextCreate, user = Depends(get_current_user)):
    logger.info(f"User {user['id']} creating text: {data.title}")
    
    with get_db() as conn:
        cursor = conn.cursor()
        scaffolding_json = json.dumps(data.scaffolding_data) if data.scaffolding_data else None
        
        cursor.execute(
            "INSERT INTO texts (user_id, title, content, scaffolding_data) VALUES (?, ?, ?, ?)",
            (user["id"], data.title, data.content, scaffolding_json)
        )
        text_id = cursor.lastrowid

        source_engine = None
        segmentation_confidence = None
        preserve_paragraphs = False
        if data.scaffolding_data and isinstance(data.scaffolding_data, dict):
            for import_key in ("pdf_import", "epub_import"):
                import_meta = data.scaffolding_data.get(import_key) or {}
                if isinstance(import_meta, dict):
                    preserve_paragraphs = True
                    source_engine = import_meta.get("source_engine")
                    segmentation_confidence = import_meta.get("segmentation_confidence")
                    break

        if preserve_paragraphs:
            # Keep paragraph boundaries produced by file import pipelines.
            paragraphs = _split_imported_paragraphs(data.content)
        else:
            paragraphs = segment_text_into_paragraphs(data.content)

        if not paragraphs:
            paragraphs = [data.content.strip()] if data.content.strip() else []

        sent_values = []
        sentence_index = 0
        for paragraph_index, paragraph in enumerate(paragraphs):
            paragraph_sentences = sentencize(paragraph)
            if not paragraph_sentences:
                paragraph_sentences = [paragraph]

            for sentence_in_paragraph, sentence_text in enumerate(paragraph_sentences):
                sent_values.append(
                    (
                        text_id,
                        sentence_index,
                        paragraph_index,
                        sentence_in_paragraph,
                        sentence_text,
                        source_engine,
                        segmentation_confidence
                    )
                )
                sentence_index += 1

        if sent_values:
            cursor.executemany(
                """
                INSERT INTO sentences
                (
                    text_id,
                    sentence_index,
                    paragraph_index,
                    sentence_in_paragraph,
                    content,
                    source_engine,
                    segmentation_confidence
                )
                VALUES (?, ?, ?, ?, ?, ?, ?)
                """,
                sent_values
            )
        
        cursor.execute("SELECT * FROM texts WHERE id = ?", (text_id,))
        t = dict(cursor.fetchone())
        
        scaffolding_data = None
        if t.get("scaffolding_data"):
            try:
                scaffolding_data = json.loads(t["scaffolding_data"])
            except:
                pass
        
        return TextResponse(
            id=t["id"],
            title=t["title"],
            content=t["content"],
            reading_mode=t["reading_mode"] or "flow",
            scaffold_level=t["scaffold_level"] or 2,
            vocab_level=t["vocab_level"] or "B1",
            current_paragraph_id=t["current_paragraph_id"],
            scaffolding_data=scaffolding_data,
            created_at=str(t["created_at"]),
            updated_at=str(t["updated_at"])
        )

@router.get("/{text_id}", response_model=TextResponse)
async def get_text(text_id: int, user = Depends(get_current_user)):
    with get_db() as conn:
        cursor = conn.cursor()
        cursor.execute(
            "SELECT * FROM texts WHERE id = ? AND user_id = ?",
            (text_id, user["id"])
        )
        t = cursor.fetchone()
        if not t:
            raise HTTPException(status_code=404, detail="Text not found")
        
        t = dict(t)
        scaffolding_data = None
        if t.get("scaffolding_data"):
            try:
                scaffolding_data = json.loads(t["scaffolding_data"])
            except:
                pass
                
        return TextResponse(
            id=t["id"],
            title=t["title"],
            content=t["content"],
            reading_mode=t["reading_mode"] or "flow",
            scaffold_level=t["scaffold_level"] or 2,
            vocab_level=t["vocab_level"] or "B1",
            current_paragraph_id=t["current_paragraph_id"],
            scaffolding_data=scaffolding_data,
            created_at=str(t["created_at"]),
            updated_at=str(t["updated_at"])
        )

@router.put("/{text_id}", response_model=TextResponse)
async def update_text(text_id: int, data: TextUpdate, user = Depends(get_current_user)):
    with get_db() as conn:
        cursor = conn.cursor()
        cursor.execute("SELECT * FROM texts WHERE id = ? AND user_id = ?", (text_id, user["id"]))
        if not cursor.fetchone():
            raise HTTPException(status_code=404, detail="Text not found")
        
        updates = []
        params = []
        if data.title is not None:
            updates.append("title = ?"); params.append(data.title)
        if data.content is not None:
            updates.append("content = ?"); params.append(data.content)
        if data.scaffolding_data is not None:
            updates.append("scaffolding_data = ?"); params.append(json.dumps(data.scaffolding_data))
        
        if updates:
            updates.append("updated_at = CURRENT_TIMESTAMP")
            params.append(text_id)
            cursor.execute(f"UPDATE texts SET {', '.join(updates)} WHERE id = ?", params)
        
        cursor.execute("SELECT * FROM texts WHERE id = ?", (text_id,))
        t = dict(cursor.fetchone())
        
        scaffolding = None
        if t["scaffolding_data"]:
            try:
                scaffolding = json.loads(t["scaffolding_data"])
            except:
                pass
        
        return TextResponse(
            id=t["id"],
            title=t["title"],
            content=t["content"],
            reading_mode=t["reading_mode"] or "flow",
            scaffold_level=t["scaffold_level"] or 2,
            vocab_level=t["vocab_level"] or "B1",
            current_paragraph_id=t["current_paragraph_id"],
            scaffolding_data=scaffolding,
            created_at=str(t["created_at"]),
            updated_at=str(t["updated_at"])
        )

@router.patch("/{text_id}/progress", response_model=TextResponse)
async def update_text_progress(text_id: int, data: TextProgressUpdate, user = Depends(get_current_user)):
    with get_db() as conn:
        cursor = conn.cursor()
        cursor.execute("SELECT * FROM texts WHERE id = ? AND user_id = ?", (text_id, user["id"]))
        if not cursor.fetchone():
            raise HTTPException(status_code=404, detail="Text not found")
        
        updates = []
        params = []
        if data.reading_mode is not None:
            updates.append("reading_mode = ?"); params.append(data.reading_mode)
        if data.scaffold_level is not None:
            updates.append("scaffold_level = ?"); params.append(data.scaffold_level)
        if data.vocab_level is not None:
            updates.append("vocab_level = ?"); params.append(data.vocab_level)
        if data.current_paragraph_id is not None:
            updates.append("current_paragraph_id = ?"); params.append(data.current_paragraph_id)
        
        if updates:
            updates.append("updated_at = CURRENT_TIMESTAMP")
            params.append(text_id)
            cursor.execute(f"UPDATE texts SET {', '.join(updates)} WHERE id = ?", params)
            conn.commit()
        
        # Return updated text
        cursor.execute("SELECT * FROM texts WHERE id = ?", (text_id,))
        t = dict(cursor.fetchone())
        
        scaffolding = None
        if t["scaffolding_data"]:
            try:
                scaffolding = json.loads(t["scaffolding_data"])
            except:
                pass
        
        return TextResponse(
            id=t["id"],
            title=t["title"],
            content=t["content"],
            reading_mode=t["reading_mode"] or "flow",
            scaffold_level=t["scaffold_level"] or 2,
            vocab_level=t["vocab_level"] or "B1",
            current_paragraph_id=t["current_paragraph_id"],
            scaffolding_data=scaffolding,
            created_at=str(t["created_at"]),
            updated_at=str(t["updated_at"])
        )

@router.delete("/{text_id}", status_code=204)
async def delete_text(text_id: int, user = Depends(get_current_user)):
    with get_db() as conn:
        cursor = conn.cursor()
        cursor.execute("SELECT id FROM texts WHERE id = ? AND user_id = ?", (text_id, user["id"]))
        if not cursor.fetchone():
            raise HTTPException(status_code=404, detail="Text not found")
        # Explicit cleanup for legacy databases that may lack effective FK cascade.
        cursor.execute("DELETE FROM sentences WHERE text_id = ?", (text_id,))
        cursor.execute("DELETE FROM texts WHERE id = ?", (text_id,))
