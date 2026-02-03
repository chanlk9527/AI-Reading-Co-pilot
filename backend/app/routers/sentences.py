from typing import List
from fastapi import APIRouter, HTTPException, Depends
from app.database import get_db
from app.models.content import SentenceResponse, SentenceUpdate
from app.routers.auth import get_current_user
import logging
import json

router = APIRouter(prefix="", tags=["Sentences"])
logger = logging.getLogger(__name__)

@router.get("/texts/{text_id}/sentences", response_model=List[SentenceResponse])
async def get_text_sentences(text_id: int, user = Depends(get_current_user)):
    logger.info(f"Fetching sentences for text {text_id}")
    with get_db() as conn:
        cursor = conn.cursor()
        cursor.execute("SELECT id FROM texts WHERE id = ? AND user_id = ?", (text_id, user["id"]))
        if not cursor.fetchone():
            raise HTTPException(status_code=404, detail="Text not found")
            
        cursor.execute(
            "SELECT * FROM sentences WHERE text_id = ? ORDER BY sentence_index ASC",
            (text_id,)
        )
        rows = cursor.fetchall()
        result = []
        for r in rows:
            r = dict(r)
            analysis = None
            if r["analysis_json"]:
                try:
                    analysis = json.loads(r["analysis_json"])
                except:
                    pass
            result.append(SentenceResponse(
                id=r["id"],
                text_id=r["text_id"],
                sentence_index=r["sentence_index"],
                content=r["content"],
                translation=r["translation"],
                analysis=analysis
            ))
        return result

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
            content=r["content"],
            translation=r["translation"],
            analysis=analysis
        )
