from fastapi import APIRouter, HTTPException, Depends, UploadFile, File
import logging

from app.models.pdf import UploadQualityReport
from app.routers.auth import get_current_user
from app.services.epub_segmenter import EPUBSegmenter

router = APIRouter(prefix="/epub", tags=["EPUB"])
logger = logging.getLogger(__name__)

# Limits
MAX_FILE_SIZE = 20 * 1024 * 1024  # 20MB
MAX_TEXT_LENGTH = 100000000  # 100,000,000 characters


@router.post("/upload", response_model=UploadQualityReport)
async def upload_epub(
    file: UploadFile = File(...),
    user = Depends(get_current_user),
):
    """
    Upload and extract text from an EPUB file.
    """
    logger.info("EPUB upload by user %s: %s", user["id"], file.filename)

    if not file.filename.lower().endswith(".epub"):
        raise HTTPException(status_code=400, detail="只支持 EPUB 文件格式")

    content = await file.read()
    if len(content) > MAX_FILE_SIZE:
        raise HTTPException(
            status_code=400,
            detail=f"文件过大，最大支持 {MAX_FILE_SIZE // (1024 * 1024)}MB",
        )

    try:
        segmenter = EPUBSegmenter(max_text_length=MAX_TEXT_LENGTH)
        result = segmenter.segment(content)
    except Exception as exc:
        logger.error("EPUB segmentation error: %s", exc)
        raise HTTPException(
            status_code=400,
            detail={
                "code": "EPUB_SEGMENTATION_FAILED",
                "message": f"EPUB 分段解析失败: {str(exc)}",
                "engine_used": "unknown",
            },
        ) from exc

    cleaned_text = result.cleaned_text
    truncated = len(cleaned_text) >= MAX_TEXT_LENGTH
    preview_size = 20
    preview = result.paragraphs[:preview_size]
    message = "EPUB 文本提取成功"
    if truncated:
        message += "（文本过长，已截断）"

    layout_flags = dict(result.layout_flags)
    layout_flags["source_engine"] = result.engine_used

    return UploadQualityReport(
        success=True,
        filename=file.filename,
        text=cleaned_text,
        char_count=len(cleaned_text),
        truncated=truncated,
        message=message,
        paragraphs_preview=preview,
        quality_score=None,
        layout_flags=layout_flags,
        engine_used=result.engine_used,
    )
