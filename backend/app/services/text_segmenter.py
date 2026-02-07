"""
Layout-agnostic paragraph segmentation for plain text imports.

Goal: keep paragraph boundaries close to source text when layout coordinates
are unavailable (e.g., pasted text / OCR / copied article).
"""

from __future__ import annotations

import re
from dataclasses import dataclass
from statistics import median
from typing import List


TERMINAL_STRONG_RE = re.compile(r"[.!?\u2026\u3002\uff01\uff1f][\"')\]\}\u201d\u2019]*$")
SOFT_BREAK_RE = re.compile(r"[,;:\uff0c\uff1b\uff1a\u3001][\"')\]\}\u201d\u2019]*$")
LIST_MARKER_RE = re.compile(
    r"^\s*(?:[-\u2022*]|\(?\d+[.)]|\([a-zA-Z]\)|[a-zA-Z][.)]|[ivxlcdm]+[.)]|[一二三四五六七八九十]+[、.)])\s+",
    re.IGNORECASE,
)
TITLE_CASE_RE = re.compile(r"^[A-Z][A-Za-z0-9'_-]*(?:\s+[A-Z][A-Za-z0-9'_-]*){0,8}$")
HEADING_HINT_RE = re.compile(
    r"^(?:chapter|section|part|appendix|introduction|conclusion|preface)\b",
    re.IGNORECASE,
)
CHAPTER_CN_RE = re.compile(r"^第[一二三四五六七八九十百千0-9]+[章节回篇部]")
LEADING_WRAP_RE = re.compile(r"^[\"'(\[\{<\u201c\u2018]+")
CJK_CHAR_RE = re.compile(r"[\u4e00-\u9fff]")
DOUBLE_QUOTE_RE = re.compile(r"[\"\u201c\u201d]")


@dataclass
class LineFeatures:
    text: str
    length: int
    indent: int
    starts_lower: bool
    starts_sentence_like: bool
    is_list_item: bool
    is_heading: bool
    is_dialogue: bool
    ends_terminal: bool
    ends_soft_break: bool
    ends_hyphen: bool


@dataclass
class WrapProfile:
    hard_wrapped: bool
    line_width: float
    verse_like: bool
    cjk_dominant: bool = False


def _safe_strip(line: str) -> str:
    return (line or "").strip()


def _first_visible_char(text: str) -> str:
    if not text:
        return ""
    trimmed = LEADING_WRAP_RE.sub("", text.strip())
    if trimmed:
        return trimmed[0]
    compact = text.strip()
    return compact[0] if compact else ""


def _starts_sentence_like(text: str) -> bool:
    first = _first_visible_char(text)
    if not first:
        return False
    if first.isdigit():
        return True
    if "A" <= first <= "Z":
        return True
    if CJK_CHAR_RE.match(first):
        return True
    return first in {"#", "@", "$"}


def _starts_lowercase_word(text: str) -> bool:
    first = _first_visible_char(text)
    return bool(first and first.isalpha() and first.islower())


def _is_heading_line(text: str) -> bool:
    compact = _safe_strip(text)
    if not compact:
        return False
    if LIST_MARKER_RE.match(compact):
        return False
    if len(compact) > 90:
        return False
    if compact.endswith(".") or compact.endswith("!") or compact.endswith("?"):
        return False
    words = compact.split()
    if compact.isupper() and len(words) <= 12:
        return True
    if TITLE_CASE_RE.match(compact) and len(words) <= 10:
        return True
    if HEADING_HINT_RE.match(compact):
        return True
    if CHAPTER_CN_RE.match(compact):
        return True
    if len(words) <= 8 and compact.endswith(":"):
        return True
    return False


def _build_line_features(raw_line: str) -> LineFeatures:
    raw = (raw_line or "").rstrip()
    text = raw.strip()
    indent = len(raw) - len(raw.lstrip(" \t"))

    return LineFeatures(
        text=text,
        length=len(text),
        indent=indent,
        starts_lower=_starts_lowercase_word(text),
        starts_sentence_like=_starts_sentence_like(text),
        is_list_item=bool(LIST_MARKER_RE.match(text)),
        is_heading=_is_heading_line(text),
        is_dialogue=bool(re.match(r'^[\"\u201c\u2018\']', text) or re.match(r"^[\-\u2014]\s+", text)),
        ends_terminal=bool(TERMINAL_STRONG_RE.search(text)),
        ends_soft_break=bool(SOFT_BREAK_RE.search(text)),
        ends_hyphen=text.endswith("-"),
    )


def _detect_wrap_profile(raw_lines: List[str]) -> WrapProfile:
    non_empty = [_safe_strip(line) for line in raw_lines if _safe_strip(line)]
    if len(non_empty) < 4:
        return WrapProfile(hard_wrapped=False, line_width=0.0, verse_like=False, cjk_dominant=False)

    lengths = [len(line) for line in non_empty]
    line_width = float(median(lengths))
    if line_width <= 0:
        return WrapProfile(hard_wrapped=False, line_width=0.0, verse_like=False, cjk_dominant=False)

    mean_len = sum(lengths) / len(lengths)
    variance = sum((length - mean_len) ** 2 for length in lengths) / len(lengths)
    std_dev = variance ** 0.5
    coeff_var = std_dev / max(1.0, line_width)

    blank_ratio = (len(raw_lines) - len(non_empty)) / max(1, len(raw_lines))
    terminal_ratio = sum(1 for line in non_empty if TERMINAL_STRONG_RE.search(line)) / len(non_empty)
    hyphen_ratio = sum(1 for line in non_empty if line.endswith("-")) / len(non_empty)
    joined_text = "".join(non_empty)
    cjk_count = len(CJK_CHAR_RE.findall(joined_text))
    latin_count = len(re.findall(r"[A-Za-z]", joined_text))
    cjk_dominant = cjk_count >= 30 and cjk_count >= latin_count * 1.2

    verse_like = (
        line_width < 45
        and coeff_var < 0.55
        and blank_ratio < 0.2
        and terminal_ratio < 0.45
    )

    hard_wrapped = (
        45 <= line_width <= 120
        and coeff_var <= 0.34
        and blank_ratio <= 0.3
        and terminal_ratio <= 0.58
    ) or (
        35 <= line_width <= 120
        and coeff_var <= 0.4
        and hyphen_ratio >= 0.03
        and blank_ratio <= 0.35
    ) or (
        cjk_dominant
        and 18 <= line_width <= 55
        and coeff_var <= 0.42
        and blank_ratio <= 0.35
        and terminal_ratio <= 0.85
    )

    if verse_like:
        hard_wrapped = False

    return WrapProfile(
        hard_wrapped=hard_wrapped,
        line_width=line_width,
        verse_like=verse_like,
        cjk_dominant=cjk_dominant,
    )


def _count_quotes(text: str) -> int:
    return len(DOUBLE_QUOTE_RE.findall(text or ""))


def _join_line(previous: str, current: str) -> str:
    previous = (previous or "").rstrip()
    current = (current or "").lstrip()
    if not previous:
        return current
    if previous.endswith("-") and current and current[0].islower():
        return previous[:-1] + current
    if previous.endswith("/") or previous.endswith("("):
        return previous + current
    return f"{previous} {current}"


def _clean_paragraph_text(text: str) -> str:
    cleaned = (text or "").strip()
    cleaned = re.sub(r"[ \t]+", " ", cleaned)
    cleaned = re.sub(r"\s+([,.;:!?])", r"\1", cleaned)
    cleaned = re.sub(r"\s+([\u3002\uff01\uff1f\uff1b\uff1a\uff0c\u3001])", r"\1", cleaned)
    cleaned = re.sub(r"\(\s+", "(", cleaned)
    cleaned = re.sub(r"\s+\)", ")", cleaned)
    return cleaned.strip()


def _boundary_score(
    prev: LineFeatures,
    curr: LineFeatures,
    blank_lines: int,
    profile: WrapProfile,
    open_quotes_count: int,
) -> float:
    score = 0.0

    if blank_lines > 0:
        score += 5.0 + min(blank_lines, 2) * 0.4

    if profile.verse_like and blank_lines == 0:
        score += 1.8
    elif not profile.hard_wrapped and blank_lines == 0:
        score += 0.7

    if curr.is_heading:
        score += 3.2

    if curr.is_list_item and not prev.is_list_item:
        score += 2.3
    elif curr.is_list_item and prev.is_list_item:
        score += 1.9

    if curr.indent > prev.indent + 1:
        score += 1.4

    if prev.ends_terminal and curr.starts_sentence_like:
        score += 1.5

    if prev.ends_terminal and curr.is_dialogue:
        score += 0.8

    if profile.line_width:
        if profile.hard_wrapped:
            short_factor = 0.82 if profile.cjk_dominant else 0.62
            short_line_threshold = max(10, int(profile.line_width * short_factor))
        else:
            short_line_threshold = max(28, int(profile.line_width * 0.7))
    else:
        short_line_threshold = 40

    if prev.length <= short_line_threshold and curr.starts_sentence_like and prev.ends_terminal:
        score += 1.2

    if prev.is_heading and curr.starts_sentence_like:
        score += 2.0

    if prev.ends_hyphen and curr.starts_lower:
        score -= 4.0

    if not prev.ends_terminal and curr.starts_lower:
        score -= 1.8

    if prev.ends_soft_break and curr.starts_lower:
        score -= 1.4

    if prev.ends_soft_break and curr.starts_sentence_like and profile.hard_wrapped:
        score -= 0.8

    if profile.hard_wrapped:
        near_wrap_width = prev.length >= max(20, int(profile.line_width * 0.85))
        if near_wrap_width and not prev.ends_terminal:
            score -= 1.3
        if abs(prev.length - profile.line_width) <= 6 and not prev.ends_terminal:
            score -= 0.9

    if open_quotes_count % 2 == 1 and not curr.is_heading and not curr.is_list_item:
        score -= 1.2

    return score


def _boundary_threshold(profile: WrapProfile) -> float:
    if profile.verse_like:
        return 1.1
    if profile.hard_wrapped:
        return 2.5
    return 1.2


def segment_text_into_paragraphs(text: str) -> List[str]:
    if not text or not text.strip():
        return []

    normalized = text.replace("\r\n", "\n").replace("\r", "\n")
    raw_lines = normalized.split("\n")
    profile = _detect_wrap_profile(raw_lines)

    paragraphs: List[str] = []
    current_text = ""
    previous_line: LineFeatures | None = None
    blank_lines = 0
    open_quotes_count = 0

    for raw_line in raw_lines:
        if not _safe_strip(raw_line):
            blank_lines += 1
            continue

        current_line = _build_line_features(raw_line)

        if previous_line is None:
            current_text = current_line.text
            previous_line = current_line
            open_quotes_count = _count_quotes(current_line.text)
            blank_lines = 0
            continue

        score = _boundary_score(previous_line, current_line, blank_lines, profile, open_quotes_count)
        if score >= _boundary_threshold(profile):
            paragraph = _clean_paragraph_text(current_text)
            if paragraph:
                paragraphs.append(paragraph)
            current_text = current_line.text
            open_quotes_count = _count_quotes(current_line.text)
        else:
            current_text = _join_line(current_text, current_line.text)
            open_quotes_count += _count_quotes(current_line.text)

        previous_line = current_line
        blank_lines = 0

    tail = _clean_paragraph_text(current_text)
    if tail:
        paragraphs.append(tail)

    return paragraphs
