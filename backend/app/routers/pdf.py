from typing import Optional

from fastapi import APIRouter, HTTPException, Depends, UploadFile, File, Form
from app.models.pdf import UploadQualityReport
from app.routers.auth import get_current_user
from app.services.pdf_segmenter import PDFSegmenter
import fitz  # PyMuPDF
import logging

router = APIRouter(prefix="/pdf", tags=["PDF"])
logger = logging.getLogger(__name__)

# Limits
MAX_FILE_SIZE = 10 * 1024 * 1024  # 10MB
MAX_TEXT_LENGTH = 100000000  # 100,000,000 characters
MIN_TEXT_LENGTH = 100  # Minimum to detect scanned PDF


@router.post("/upload", response_model=UploadQualityReport)
async def upload_pdf(
    file: UploadFile = File(...),
    start_page: Optional[int] = Form(default=None),
    end_page: Optional[int] = Form(default=None),
    user = Depends(get_current_user)
):
    """
    Upload and extract text from a PDF file.
    - Supports text-based PDFs only (not scanned/image PDFs)
    - Max file size: 10MB
    - Max text length: 100,000,000 characters
    """
    logger.info(f"PDF upload by user {user['id']}: {file.filename}")
    
    # Validate file type
    if not file.filename.lower().endswith('.pdf'):
        raise HTTPException(status_code=400, detail="只支持 PDF 文件格式")
    
    # Read file content
    content = await file.read()
    
    # Check file size
    if len(content) > MAX_FILE_SIZE:
        raise HTTPException(
            status_code=400, 
            detail=f"文件过大，最大支持 {MAX_FILE_SIZE // (1024*1024)}MB"
        )
    
    # Extract coarse text for scan detection
    try:
        doc = fitz.open(stream=content, filetype="pdf")
        total_pages = doc.page_count
        if total_pages <= 0:
            doc.close()
            raise HTTPException(status_code=400, detail="PDF 页数无效或为空")

        effective_start = start_page if start_page is not None else 1
        effective_end = end_page if end_page is not None else total_pages
        if (
            effective_start < 1
            or effective_end < 1
            or effective_start > effective_end
            or effective_end > total_pages
        ):
            doc.close()
            raise HTTPException(
                status_code=400,
                detail={
                    "code": "PDF_INVALID_PAGE_RANGE",
                    "message": (
                        f"页码范围无效：start_page={effective_start}, end_page={effective_end}, "
                        f"总页数={total_pages}"
                    ),
                    "total_pages": total_pages,
                },
            )

        text_parts = []

        for page_idx in range(effective_start - 1, effective_end):
            page = doc[page_idx]
            page_text = page.get_text()
            text_parts.append(page_text)

        doc.close()
        full_text = "\n".join(text_parts).strip()

    except HTTPException:
        raise
    except Exception as e:
        logger.error(f"PDF parsing error: {e}")
        raise HTTPException(status_code=400, detail=f"PDF 解析失败: {str(e)}")

    # Check if it's a scanned PDF (too little text)
    if len(full_text) < MIN_TEXT_LENGTH:
        raise HTTPException(
            status_code=400,
            detail="检测到扫描版 PDF，暂不支持。请使用文字版 PDF 或直接粘贴文本。"
        )

    # Segment PDF with layout-aware pipeline
    try:
        segmenter = PDFSegmenter(max_text_length=MAX_TEXT_LENGTH)
        result = segmenter.segment(content, start_page=effective_start, end_page=effective_end)
    except Exception as e:
        logger.error("PDF segmentation error: %s", e)
        raise HTTPException(
            status_code=400,
            detail={
                "code": "PDF_SEGMENTATION_FAILED",
                "message": f"PDF 分段解析失败: {str(e)}",
                "engine_used": "unknown",
            },
        )

    cleaned_text = result.cleaned_text
    truncated = len(cleaned_text) >= MAX_TEXT_LENGTH
    if truncated:
        logger.info("PDF segmented text truncated to %s chars", MAX_TEXT_LENGTH)

    preview_size = 20
    preview = result.paragraphs[:preview_size]
    message = "PDF 文本提取成功"
    if truncated:
        message += "（文本过长，已截断）"

    layout_flags = dict(result.layout_flags)
    layout_flags["source_engine"] = result.engine_used
    layout_flags["total_pages"] = total_pages
    layout_flags["selected_page_range"] = {
        "start_page": effective_start,
        "end_page": effective_end,
    }

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
