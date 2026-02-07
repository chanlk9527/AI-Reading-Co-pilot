"""
PDF segmentation based on user-provided logic:
- pdfplumber word extraction
- header/footer filtering
- line clustering
- dominant left-margin indent paragraph split
"""

from __future__ import annotations

import io
import json
import logging
import os
import re
from collections import Counter
from dataclasses import dataclass
from statistics import median
from typing import Dict, List, Optional

import pdfplumber
import spacy

from app.models.pdf import ParagraphCandidate

logger = logging.getLogger(__name__)

HEADER_MARGIN = 50
FOOTER_MARGIN = 50
LINE_CLUSTER_Y_TOL = 5
INDENT_THRESHOLD = 15
CID_TOKEN_RE = re.compile(r"\(cid:\d+\)")
STRONG_SENTENCE_END_RE = re.compile(r'[.!?]["\')\]”’]*$')
LOWER_ALPHA_START_RE = re.compile(r"^[^A-Za-z]*[a-z]")
CHAPTER_TITLE_RE = re.compile(r"^(chapter|book|part)\b", re.IGNORECASE)
ORNAMENT_ONLY_RE = re.compile(r"^[\W_]+$")
STAR_PAGE_RE = re.compile(r"^[\W_]*\d+[\W_]*$")
DIALOGUE_START_RE = re.compile(r'^[\"“‘\']')
PARAGRAPH_GAP_MULTIPLIER = 1.6


try:
    nlp = spacy.load("en_core_web_sm")
except OSError:
    # Keep server runnable even when model is missing.
    nlp = spacy.blank("en")
    if "sentencizer" not in nlp.pipe_names:
        nlp.add_pipe("sentencizer")
    logger.warning("Spacy model en_core_web_sm not found, fallback to sentencizer.")


@dataclass
class SegmentResult:
    cleaned_text: str
    paragraphs: List[ParagraphCandidate]
    layout_flags: Dict[str, object]
    engine_used: str


def get_pdf_segmenter_runtime_info() -> Dict[str, object]:
    return {
        "engine": "pdfplumber",
        "default_strategy": "indent_margin",
    }


def split_sentences(text: str, para_id: int) -> List[Dict[str, str]]:
    doc = nlp(text)
    sentences: List[Dict[str, str]] = []
    for i, sent in enumerate(doc.sents):
        s_text = sent.text.strip()
        if len(s_text) > 1:
            sentences.append(
                {
                    "id": f"p{para_id}_s{i + 1}",
                    "text": s_text,
                    "translation": "",
                    "analysis": "",
                }
            )
    return sentences


def _clean_extracted_text(text: str) -> str:
    text = CID_TOKEN_RE.sub("", text or "")
    text = re.sub(r"\s+", " ", text)
    return text.strip()


def _should_continue_across_page(prev_text: str, curr_text: str) -> bool:
    prev = (prev_text or "").strip()
    curr = (curr_text or "").strip()
    if not prev or not curr:
        return False

    # Chapter titles / separators should never be treated as continuation.
    if _is_structural_break_line(curr):
        return False

    # If previous chunk does not end with a strong sentence terminator,
    # treat the first line on next page as continuation.
    if prev.endswith("-") or not STRONG_SENTENCE_END_RE.search(prev):
        return True

    # Even with a terminator, lowercase start usually indicates continuation.
    return bool(LOWER_ALPHA_START_RE.match(curr))


def _is_structural_break_line(
    text: str,
    line_top: Optional[float] = None,
    line_x0: Optional[float] = None,
    line_x1: Optional[float] = None,
    page_height: Optional[float] = None,
    page_width: Optional[float] = None,
) -> bool:
    compact = (text or "").strip()
    if not compact:
        return True

    # Normalize spaced capitals (e.g. "C H A P T E R  O N E").
    collapsed = re.sub(r"[\s\W_]+", "", compact).upper()
    if collapsed.startswith("CHAPTER") or collapsed.startswith("BOOK") or collapsed.startswith("PART"):
        return True

    if CHAPTER_TITLE_RE.match(compact):
        return True

    if STAR_PAGE_RE.match(compact):
        return True

    if ORNAMENT_ONLY_RE.match(compact):
        return True

    # Running headers are usually centered near the top.
    if (
        page_height is not None
        and page_width is not None
        and line_top is not None
        and line_x0 is not None
        and line_x1 is not None
        and line_top <= page_height * 0.28
    ):
        has_alpha = any(ch.isalpha() for ch in compact)
        if has_alpha and compact.upper() == compact and len(collapsed) <= 30:
            center_x = (line_x0 + line_x1) / 2.0
            if abs(center_x - page_width / 2.0) <= page_width * 0.2:
                return True

    # Short ALL-CAPS lines are usually headings, not paragraph body.
    words = compact.split()
    alpha_words = [w for w in words if any(ch.isalpha() for ch in w)]
    if alpha_words and len(alpha_words) <= 6 and compact.upper() == compact and len(compact) <= 50:
        return True

    return False


def save_paragraph(
    para_list: List[Dict[str, object]],
    p_id: int,
    text: str,
    page_start: int,
    page_end: int,
) -> None:
    clean_text = _clean_extracted_text(text)
    if not clean_text:
        return
    para_list.append(
        {
            "paragraph_id": p_id,
            "text": clean_text,
            "page_start": page_start,
            "page_end": page_end,
            "sentences": split_sentences(clean_text, p_id),
        }
    )


def _process_pdf_object(
    pdf,
    start_page: Optional[int] = None,
    end_page: Optional[int] = None,
) -> List[Dict[str, object]]:
    paragraphs: List[Dict[str, object]] = []
    paragraph_id = 1
    pending_text = ""
    pending_start_page: Optional[int] = None
    pending_end_page: Optional[int] = None

    total_pages = len(pdf.pages)
    if total_pages <= 0:
        return paragraphs

    selected_start = int(start_page) if start_page is not None else 1
    selected_end = int(end_page) if end_page is not None else total_pages
    if selected_start < 1 or selected_end < 1 or selected_start > selected_end or selected_end > total_pages:
        raise ValueError(
            f"Invalid page range: start_page={selected_start}, end_page={selected_end}, total_pages={total_pages}"
        )

    def flush_pending(default_page: int) -> None:
        nonlocal paragraph_id, pending_text, pending_start_page, pending_end_page
        if not pending_text:
            return
        save_paragraph(
            paragraphs,
            paragraph_id,
            pending_text,
            pending_start_page or default_page,
            pending_end_page or default_page,
        )
        paragraph_id += 1
        pending_text = ""
        pending_start_page = None
        pending_end_page = None

    for page_idx in range(selected_start - 1, selected_end):
        page_no = page_idx + 1
        page = pdf.pages[page_idx]
        page_height = page.height

        words = page.extract_words(
            x_tolerance=3,
            y_tolerance=3,
            keep_blank_chars=False,
        )
        if not words:
            continue

        filtered_words = []
        for w in words:
            if w["top"] < HEADER_MARGIN:
                continue
            if w["bottom"] > (page_height - FOOTER_MARGIN):
                continue
            filtered_words.append(w)

        if not filtered_words:
            continue

        words = filtered_words

        lines: List[List[Dict[str, object]]] = []
        current_line_words = [words[0]]
        for w in words[1:]:
            if abs(w["top"] - current_line_words[-1]["top"]) < LINE_CLUSTER_Y_TOL:
                current_line_words.append(w)
            else:
                lines.append(current_line_words)
                current_line_words = [w]
        lines.append(current_line_words)

        line_starts = [int(line[0]["x0"]) for line in lines]
        if not line_starts:
            continue
        common_margin = Counter(line_starts).most_common(1)[0][0]

        line_heights = [
            max(1.0, max(float(w["bottom"]) for w in line_words) - min(float(w["top"]) for w in line_words))
            for line_words in lines
            if line_words
        ]
        typical_line_height = float(median(line_heights)) if line_heights else 12.0
        prev_line_bottom: Optional[float] = None
        first_body_line_on_page = True

        for i, line_words in enumerate(lines):
            text = _clean_extracted_text(" ".join(w["text"] for w in line_words))
            if not text:
                continue

            if re.match(r"^\d+$", text):
                continue

            line_x0 = min(float(w["x0"]) for w in line_words)
            line_x1 = max(float(w["x1"]) for w in line_words)
            line_top = min(float(w["top"]) for w in line_words)
            line_bottom = max(float(w["bottom"]) for w in line_words)

            if _is_structural_break_line(
                text,
                line_top=line_top,
                line_x0=line_x0,
                line_x1=line_x1,
                page_height=float(page_height),
                page_width=float(page.width),
            ):
                # Structural lines are skipped. Only flush if they appear mid-body.
                if pending_text and page_height * 0.25 < line_top < page_height * 0.75:
                    flush_pending(page_no)
                prev_line_bottom = None
                continue

            start_x = line_x0
            is_indented = (start_x - common_margin) > INDENT_THRESHOLD
            is_dialogue_start = bool(DIALOGUE_START_RE.match(text))

            # Cross-page guard:
            # if not continuation, force flush before consuming page-start line.
            if (
                first_body_line_on_page
                and pending_text
                and pending_end_page is not None
                and page_no > pending_end_page
            ):
                if _should_continue_across_page(pending_text, text):
                    pending_text += " " + text
                    pending_end_page = page_no
                    prev_line_bottom = line_bottom
                    continue

                flush_pending(page_no)

            split_here = False
            if pending_text:
                pending_strip = pending_text.strip()
                prev_is_dialogue_para = bool(DIALOGUE_START_RE.match(pending_strip))

                if is_indented:
                    split_here = True
                elif is_dialogue_start:
                    # In novel pages, a new line that starts with an opening quote
                    # almost always indicates a new dialogue paragraph.
                    split_here = True
                elif (
                    prev_is_dialogue_para
                    and not is_dialogue_start
                    and STRONG_SENTENCE_END_RE.search(pending_strip)
                ):
                    # Dialogue paragraph followed by narrative line.
                    split_here = True
                elif prev_line_bottom is not None:
                    vertical_gap = line_top - prev_line_bottom
                    if vertical_gap > max(6.0, typical_line_height * PARAGRAPH_GAP_MULTIPLIER):
                        split_here = True

            if split_here:
                flush_pending(page_no)

            if pending_text:
                pending_text += " " + text
                pending_end_page = page_no
            else:
                pending_text = text
                pending_start_page = page_no
                pending_end_page = page_no

            prev_line_bottom = line_bottom
            first_body_line_on_page = False

    flush_pending(1)

    return paragraphs


def process_pdf(
    pdf_path: str,
    output_path: str | None = None,
    start_page: Optional[int] = None,
    end_page: Optional[int] = None,
) -> Optional[List[Dict[str, object]]]:
    if not os.path.exists(pdf_path):
        logger.error("File not found: %s", pdf_path)
        return None

    with pdfplumber.open(pdf_path) as pdf:
        paragraphs = _process_pdf_object(pdf, start_page=start_page, end_page=end_page)

    if output_path:
        with open(output_path, "w", encoding="utf-8") as f:
            json.dump(paragraphs, f, ensure_ascii=False, indent=2)

    return paragraphs


def process_pdf_bytes(
    content: bytes,
    start_page: Optional[int] = None,
    end_page: Optional[int] = None,
) -> List[Dict[str, object]]:
    with pdfplumber.open(io.BytesIO(content)) as pdf:
        return _process_pdf_object(pdf, start_page=start_page, end_page=end_page)


class PDFSegmenter:
    def __init__(self, max_text_length: int) -> None:
        self.max_text_length = max_text_length

    def segment(
        self,
        content: bytes,
        start_page: Optional[int] = None,
        end_page: Optional[int] = None,
    ) -> SegmentResult:
        raw_paragraphs = process_pdf_bytes(content, start_page=start_page, end_page=end_page)
        if not raw_paragraphs:
            raise ValueError("No paragraphs produced after segmentation")

        paragraphs: List[ParagraphCandidate] = []
        for item in raw_paragraphs:
            text = str(item.get("text", "")).strip()
            if not text:
                continue

            page_start = int(item.get("page_start", 1))
            page_end = int(item.get("page_end", page_start))

            paragraphs.append(
                ParagraphCandidate(
                    text=text,
                    page_start=page_start,
                    page_end=page_end,
                    bbox=None,
                    confidence=1.0,
                    signals={"indent_based": 1.0},
                )
            )

        if not paragraphs:
            raise ValueError("No paragraphs produced after segmentation")

        cleaned_text = "\n\n".join(p.text for p in paragraphs)
        if len(cleaned_text) > self.max_text_length:
            cleaned_text = cleaned_text[: self.max_text_length]

        selected_start = min(p.page_start for p in paragraphs)
        selected_end = max(p.page_end for p in paragraphs)
        layout_flags: Dict[str, object] = {
            "segmentation_strategy": "pdfplumber_indent",
            "header_margin": HEADER_MARGIN,
            "footer_margin": FOOTER_MARGIN,
            "indent_threshold": INDENT_THRESHOLD,
            "selected_page_range": {
                "start_page": selected_start,
                "end_page": selected_end,
            },
        }

        logger.info("[PDFSegmenter] paragraphs=%s engine=%s", len(paragraphs), "pdfplumber")

        return SegmentResult(
            cleaned_text=cleaned_text,
            paragraphs=paragraphs,
            layout_flags=layout_flags,
            engine_used="pdfplumber",
        )


if __name__ == "__main__":
    process_pdf("Harry_Potter_Test.pdf", "output.json")
