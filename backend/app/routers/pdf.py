from fastapi import APIRouter, HTTPException, Depends, UploadFile, File
from app.routers.auth import get_current_user
import fitz  # PyMuPDF
import logging

router = APIRouter(prefix="/pdf", tags=["PDF"])
logger = logging.getLogger(__name__)

# Limits
MAX_FILE_SIZE = 10 * 1024 * 1024  # 10MB
MAX_TEXT_LENGTH = 100000000  # 100,000,000 characters
MIN_TEXT_LENGTH = 100  # Minimum to detect scanned PDF


@router.post("/upload")
async def upload_pdf(
    file: UploadFile = File(...),
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
    
    # Extract text from PDF
    try:
        doc = fitz.open(stream=content, filetype="pdf")
        text_parts = []
        
        for page_num in range(doc.page_count):
            page = doc[page_num]
            page_text = page.get_text()
            text_parts.append(page_text)
        
        doc.close()
        full_text = "\n".join(text_parts).strip()
        
    except Exception as e:
        logger.error(f"PDF parsing error: {e}")
        raise HTTPException(status_code=400, detail=f"PDF 解析失败: {str(e)}")
    
    # Check if it's a scanned PDF (too little text)
    if len(full_text) < MIN_TEXT_LENGTH:
        raise HTTPException(
            status_code=400,
            detail="检测到扫描版 PDF，暂不支持。请使用文字版 PDF 或直接粘贴文本。"
        )
    
    # Truncate if too long
    truncated = False
    if len(full_text) > MAX_TEXT_LENGTH:
        full_text = full_text[:MAX_TEXT_LENGTH]
        truncated = True
        logger.info(f"PDF text truncated from {len(full_text)} to {MAX_TEXT_LENGTH} chars")
    
    # Clean up text (remove excessive whitespace and merge broken lines)
    # Strategy: 
    # 1. Split into lines
    # 2. If a line ends with a hyphen, remove it and join with next line
    # 3. If a line ends with punctuation (.!?) OR contains mostly whitespace, keep the newline
    # 4. Otherwise, replace newline with space (merging lines)
    
    lines = full_text.split('\n')
    cleaned_lines = []
    current_paragraph = []
    
    for line in lines:
        stripped = line.strip()
        if not stripped:
            # Empty line -> end of paragraph
            if current_paragraph:
                cleaned_lines.append(" ".join(current_paragraph))
                current_paragraph = []
            cleaned_lines.append("") # Keep empty line for structure
            continue
            
        # Check if this line looks like the end of a sentence/paragraph
        # (ends with punctuation, or purely title-like)
        is_end_of_sentence = stripped[-1] in '.!?"\''
        
        # Heuristic: If line is very short relative to page width (unreliable without bbox, 
        # but let's assume extremely short lines might be titles or endings)
        
        if stripped.endswith('-'):
            # Hyphenation word - remove hyphen and join
            current_paragraph.append(stripped[:-1])
        else:
            current_paragraph.append(stripped)
            
        # If it looks like a paragraph end (e.g. empty line follows, handled above), 
        # but here we rely on the loop structure. 
        # Simple approach: just accumulate. Merging happens at the end or empty lines.
        # But wait, PDF extraction often leaves newlines after every visual line.
        # We generally want to merge them UNLESS double newline.
    
    # Simple rigorous cleaning:
    # 1. Replace single newlines with spaces
    # 2. Replace multiple newlines with double newline (paragraph break)
    
    # Let's try a different regex-based approach for robustness
    import re
    # Normalize hyphens
    text = full_text.replace('-\n', '') 
    # Replace single newlines that are NOT followed by another newline with space
    # (Matches newline not followed by newline)
    text = re.sub(r'(?<!\n)\n(?!\n)', ' ', text)
    # Collapse multiple spaces
    text = re.sub(r'[ \t]+', ' ', text)
    # Ensure paragraphs are separated by \n
    cleaned_text = text.strip()
    
    return {
        "success": True,
        "filename": file.filename,
        "text": cleaned_text,
        "char_count": len(cleaned_text),
        "truncated": truncated,
        "message": "PDF 文本提取成功" + ("（文本过长，已截断）" if truncated else "")
    }
