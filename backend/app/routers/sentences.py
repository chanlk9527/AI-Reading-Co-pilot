from math import ceil
from typing import List, Optional
from fastapi import APIRouter, HTTPException, Depends, Query, Response
from app.database import get_db
from app.models.content import SentenceResponse, SentenceUpdate
from app.routers.auth import get_current_user
import logging
import json

router = APIRouter(prefix="", tags=["Sentences"])
logger = logging.getLogger(__name__)


def _row_to_sentence_response(row: dict) -> SentenceResponse:
    analysis = None
    if row["analysis_json"]:
        try:
            analysis = json.loads(row["analysis_json"])
        except Exception:
            pass

    return SentenceResponse(
        id=row["id"],
        text_id=row["text_id"],
        sentence_index=row["sentence_index"],
        paragraph_index=row.get("paragraph_index"),
        sentence_in_paragraph=row.get("sentence_in_paragraph"),
        content=row["content"],
        translation=row["translation"],
        analysis=analysis,
        source_engine=row.get("source_engine"),
        segmentation_confidence=row.get("segmentation_confidence")
    )


@router.get("/texts/{text_id}/sentences", response_model=List[SentenceResponse])
async def get_text_sentences(
    text_id: int,
    response: Response,
    paragraph_page: Optional[int] = Query(default=None, ge=1),
    paragraph_page_size: int = Query(default=20, ge=1, le=100),
    around_sentence_id: Optional[int] = Query(default=None, ge=1),
    user=Depends(get_current_user)
):
    logger.info(
        "Fetching sentences for text %s (paragraph_page=%s paragraph_page_size=%s around_sentence_id=%s)",
        text_id,
        paragraph_page,
        paragraph_page_size,
        around_sentence_id,
    )
    with get_db() as conn:
        cursor = conn.cursor()
        cursor.execute("SELECT id FROM texts WHERE id = ? AND user_id = ?", (text_id, user["id"]))
        if not cursor.fetchone():
            raise HTTPException(status_code=404, detail="Text not found")

        use_paragraph_paging = paragraph_page is not None or around_sentence_id is not None
        if not use_paragraph_paging:
            cursor.execute(
                "SELECT * FROM sentences WHERE text_id = ? ORDER BY sentence_index ASC",
                (text_id,)
            )
            rows = cursor.fetchall()
            return [_row_to_sentence_response(dict(r)) for r in rows]

        cursor.execute(
            """
            SELECT DISTINCT COALESCE(paragraph_index, sentence_index) AS paragraph_key
            FROM sentences
            WHERE text_id = ?
            ORDER BY paragraph_key ASC
            """,
            (text_id,)
        )
        paragraph_keys = [int(r["paragraph_key"]) for r in cursor.fetchall()]

        total_paragraphs = len(paragraph_keys)
        if total_paragraphs == 0:
            response.headers["X-Paragraph-Page"] = "1"
            response.headers["X-Paragraph-Page-Size"] = str(paragraph_page_size)
            response.headers["X-Paragraph-Total"] = "0"
            response.headers["X-Paragraph-Total-Pages"] = "1"
            return []

        total_pages = max(1, ceil(total_paragraphs / paragraph_page_size))

        resolved_page = paragraph_page if paragraph_page is not None else 1
        if around_sentence_id is not None and paragraph_page is None:
            cursor.execute(
                """
                SELECT COALESCE(paragraph_index, sentence_index) AS paragraph_key
                FROM sentences
                WHERE id = ? AND text_id = ?
                """,
                (around_sentence_id, text_id)
            )
            target_row = cursor.fetchone()
            if target_row:
                target_key = int(target_row["paragraph_key"])
                target_index = paragraph_keys.index(target_key) if target_key in paragraph_keys else 0
                resolved_page = (target_index // paragraph_page_size) + 1
            else:
                logger.warning(
                    "around_sentence_id=%s not found for text_id=%s, fallback to page 1",
                    around_sentence_id,
                    text_id
                )

        resolved_page = max(1, min(resolved_page, total_pages))
        start = (resolved_page - 1) * paragraph_page_size
        page_keys = paragraph_keys[start:start + paragraph_page_size]

        placeholders = ",".join("?" for _ in page_keys)
        cursor.execute(
            f"""
            SELECT *
            FROM sentences
            WHERE text_id = ?
              AND COALESCE(paragraph_index, sentence_index) IN ({placeholders})
            ORDER BY sentence_index ASC
            """,
            (text_id, *page_keys)
        )
        rows = cursor.fetchall()

        response.headers["X-Paragraph-Page"] = str(resolved_page)
        response.headers["X-Paragraph-Page-Size"] = str(paragraph_page_size)
        response.headers["X-Paragraph-Total"] = str(total_paragraphs)
        response.headers["X-Paragraph-Total-Pages"] = str(total_pages)
        return [_row_to_sentence_response(dict(r)) for r in rows]

@router.put("/sentences/{sent_id}", response_model=SentenceResponse)
async def update_sentence(sent_id: int, data: SentenceUpdate, user = Depends(get_current_user)):
    with get_db() as conn:
        cursor = conn.cursor()
        cursor.execute('''
            SELECT p.* FROM sentences p
            JOIN texts t ON p.text_id = t.id
            WHERE p.id = ? AND t.user_id = ?
        ''', (sent_id, user["id"]))
        
        if not cursor.fetchone():
            raise HTTPException(status_code=404, detail="Sentence not found")
            
        updates = []
        params = []
        if data.translation is not None:
            updates.append("translation = ?"); params.append(data.translation)
        if data.analysis is not None:
            updates.append("analysis_json = ?"); params.append(json.dumps(data.analysis))
            
        if updates:
            params.append(sent_id)
            cursor.execute(f"UPDATE sentences SET {', '.join(updates)} WHERE id = ?", params)
            
        conn.commit()
        cursor.execute("SELECT * FROM sentences WHERE id = ?", (sent_id,))
        r = dict(cursor.fetchone())
        
        analysis = None
        if r["analysis_json"]:
            try:
                analysis = json.loads(r["analysis_json"])
            except:
                pass
                
        return SentenceResponse(
            id=r["id"],
            text_id=r["text_id"],
            sentence_index=r["sentence_index"],
            paragraph_index=r.get("paragraph_index"),
            sentence_in_paragraph=r.get("sentence_in_paragraph"),
            content=r["content"],
            translation=r["translation"],
            analysis=analysis,
            source_engine=r.get("source_engine"),
            segmentation_confidence=r.get("segmentation_confidence")
        )
