"""
EPUB segmentation based on ZIP container + XHTML text extraction.

Design goals:
- No extra third-party dependencies
- Keep chapter order via OPF spine
- Preserve paragraph boundaries for downstream sentence splitting
"""

from __future__ import annotations

import html
import io
import logging
import posixpath
import re
import xml.etree.ElementTree as ET
import zipfile
from dataclasses import dataclass
from html.parser import HTMLParser
from typing import Dict, List

from app.models.pdf import ParagraphCandidate
from app.services.text_segmenter import segment_text_into_paragraphs

logger = logging.getLogger(__name__)

HTML_MEDIA_TYPES = {
    "application/xhtml+xml",
    "application/html+xml",
    "text/html",
    "application/xml",
}
MAX_PREVIEW_PARAGRAPHS = 200


@dataclass
class EpubSegmentResult:
    cleaned_text: str
    paragraphs: List[ParagraphCandidate]
    layout_flags: Dict[str, object]
    engine_used: str


def _local_name(tag: str) -> str:
    if not tag:
        return ""
    return tag.split("}", 1)[-1]


def _resolve_href(opf_path: str, href: str) -> str:
    base_dir = posixpath.dirname(opf_path)
    return posixpath.normpath(posixpath.join(base_dir, href))


def _extract_opf_path(epub_zip: zipfile.ZipFile) -> str:
    try:
        container_xml = epub_zip.read("META-INF/container.xml")
    except KeyError as exc:
        raise ValueError("EPUB 缺少 META-INF/container.xml") from exc

    try:
        root = ET.fromstring(container_xml)
    except ET.ParseError as exc:
        raise ValueError("EPUB container.xml 解析失败") from exc

    for elem in root.iter():
        if _local_name(elem.tag) == "rootfile":
            full_path = elem.attrib.get("full-path")
            if full_path:
                return full_path

    raise ValueError("EPUB 未找到 OPF 包描述文件")


def _parse_opf(epub_zip: zipfile.ZipFile, opf_path: str) -> tuple[Dict[str, Dict[str, str]], List[str]]:
    try:
        opf_xml = epub_zip.read(opf_path)
    except KeyError as exc:
        raise ValueError(f"EPUB OPF 文件不存在: {opf_path}") from exc

    try:
        root = ET.fromstring(opf_xml)
    except ET.ParseError as exc:
        raise ValueError("EPUB OPF 解析失败") from exc

    manifest: Dict[str, Dict[str, str]] = {}
    spine: List[str] = []

    for elem in root.iter():
        name = _local_name(elem.tag)
        if name == "item":
            item_id = elem.attrib.get("id")
            href = elem.attrib.get("href")
            media_type = (elem.attrib.get("media-type") or "").lower()
            if item_id and href:
                manifest[item_id] = {
                    "href": href,
                    "media_type": media_type,
                }
        elif name == "itemref":
            idref = elem.attrib.get("idref")
            if idref:
                spine.append(idref)

    if not manifest:
        raise ValueError("EPUB manifest 为空，无法读取章节")
    if not spine:
        raise ValueError("EPUB spine 为空，无法确定阅读顺序")

    return manifest, spine


def _decode_html_bytes(blob: bytes) -> str:
    if not blob:
        return ""

    head = blob[:300].decode("ascii", errors="ignore")
    match = re.search(r'encoding=["\']([A-Za-z0-9._-]+)["\']', head, re.IGNORECASE)
    candidates: List[str] = []
    if match:
        candidates.append(match.group(1))
    candidates.extend(["utf-8", "utf-16", "latin-1"])

    for encoding in candidates:
        try:
            return blob.decode(encoding)
        except (LookupError, UnicodeDecodeError):
            continue

    return blob.decode("utf-8", errors="ignore")


class _HtmlToTextParser(HTMLParser):
    BLOCK_TAGS = {
        "address",
        "article",
        "aside",
        "blockquote",
        "br",
        "caption",
        "dd",
        "div",
        "dl",
        "dt",
        "figcaption",
        "figure",
        "footer",
        "form",
        "h1",
        "h2",
        "h3",
        "h4",
        "h5",
        "h6",
        "header",
        "hr",
        "li",
        "main",
        "nav",
        "ol",
        "p",
        "pre",
        "section",
        "table",
        "tbody",
        "td",
        "tfoot",
        "th",
        "thead",
        "tr",
        "ul",
    }
    SKIP_TAGS = {"script", "style", "noscript", "svg", "math", "head"}

    def __init__(self) -> None:
        super().__init__(convert_charrefs=False)
        self.parts: List[str] = []
        self.skip_depth = 0

    def handle_starttag(self, tag: str, attrs) -> None:  # noqa: ANN001
        norm_tag = (tag or "").lower()
        if norm_tag in self.SKIP_TAGS:
            self.skip_depth += 1
            return
        if self.skip_depth > 0:
            return
        if norm_tag == "li":
            self.parts.append("\n- ")
        elif norm_tag in self.BLOCK_TAGS:
            self.parts.append("\n")

    def handle_endtag(self, tag: str) -> None:
        norm_tag = (tag or "").lower()
        if norm_tag in self.SKIP_TAGS:
            self.skip_depth = max(0, self.skip_depth - 1)
            return
        if self.skip_depth > 0:
            return
        if norm_tag in self.BLOCK_TAGS and norm_tag != "br":
            self.parts.append("\n")

    def handle_data(self, data: str) -> None:
        if self.skip_depth > 0:
            return
        if not data:
            return
        self.parts.append(html.unescape(data))

    def get_text(self) -> str:
        joined = "".join(self.parts)
        joined = joined.replace("\u00a0", " ")
        joined = re.sub(r"[ \t\f\v]+", " ", joined)
        joined = re.sub(r" *\n *", "\n", joined)
        joined = re.sub(r"\n{3,}", "\n\n", joined)
        return joined.strip()


def _extract_html_text(content: str) -> str:
    parser = _HtmlToTextParser()
    parser.feed(content or "")
    parser.close()
    return parser.get_text()


class EPUBSegmenter:
    def __init__(self, max_text_length: int = 100_000_000) -> None:
        self.max_text_length = max_text_length

    def segment(self, file_bytes: bytes) -> EpubSegmentResult:
        if not file_bytes:
            raise ValueError("EPUB 文件为空")

        try:
            epub_zip = zipfile.ZipFile(io.BytesIO(file_bytes))
        except Exception as exc:
            raise ValueError("EPUB 压缩包读取失败") from exc

        with epub_zip:
            opf_path = _extract_opf_path(epub_zip)
            manifest, spine = _parse_opf(epub_zip, opf_path)

            merged_paragraphs: List[str] = []
            paragraph_candidates: List[ParagraphCandidate] = []
            selected_sections = 0
            truncated = False
            current_size = 0

            for section_idx, item_id in enumerate(spine, start=1):
                item_meta = manifest.get(item_id)
                if not item_meta:
                    continue

                media_type = (item_meta.get("media_type") or "").lower()
                if media_type and media_type not in HTML_MEDIA_TYPES:
                    continue

                href = item_meta.get("href") or ""
                if not href:
                    continue

                section_path = _resolve_href(opf_path, href)
                try:
                    section_blob = epub_zip.read(section_path)
                except KeyError:
                    logger.warning("EPUB spine item missing in zip: %s", section_path)
                    continue

                section_html = _decode_html_bytes(section_blob)
                section_text = _extract_html_text(section_html)
                if not section_text:
                    continue

                section_paragraphs = segment_text_into_paragraphs(section_text)
                if not section_paragraphs:
                    continue

                selected_sections += 1
                for paragraph in section_paragraphs:
                    paragraph = paragraph.strip()
                    if not paragraph:
                        continue

                    separator_size = 2 if merged_paragraphs else 0
                    next_size = len(paragraph) + separator_size
                    if current_size + next_size > self.max_text_length:
                        remaining = self.max_text_length - current_size - separator_size
                        if remaining > 80:
                            clipped = paragraph[:remaining].strip()
                            if clipped:
                                merged_paragraphs.append(clipped)
                                current_size += len(clipped) + separator_size
                                if len(paragraph_candidates) < MAX_PREVIEW_PARAGRAPHS:
                                    paragraph_candidates.append(
                                        ParagraphCandidate(
                                            text=clipped,
                                            page_start=section_idx,
                                            page_end=section_idx,
                                            confidence=0.82,
                                            signals={"epub_section": float(section_idx)},
                                        )
                                    )
                        truncated = True
                        break

                    merged_paragraphs.append(paragraph)
                    current_size += next_size
                    if len(paragraph_candidates) < MAX_PREVIEW_PARAGRAPHS:
                        paragraph_candidates.append(
                            ParagraphCandidate(
                                text=paragraph,
                                page_start=section_idx,
                                page_end=section_idx,
                                confidence=0.82,
                                signals={"epub_section": float(section_idx)},
                            )
                        )

                if truncated:
                    break

        if not merged_paragraphs:
            raise ValueError("EPUB 未提取到可用文本")

        cleaned_text = "\n\n".join(merged_paragraphs)
        layout_flags: Dict[str, object] = {
            "section_count": selected_sections,
            "paragraph_count": len(merged_paragraphs),
            "truncated": truncated,
        }

        return EpubSegmentResult(
            cleaned_text=cleaned_text,
            paragraphs=paragraph_candidates,
            layout_flags=layout_flags,
            engine_used="epub_zip_html",
        )
