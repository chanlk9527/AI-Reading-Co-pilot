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
import base64
import mimetypes
import posixpath
import re
import xml.etree.ElementTree as ET
import zipfile
from dataclasses import dataclass
from html.parser import HTMLParser
from typing import Dict, List, Optional, Set, Tuple
from urllib.parse import urlsplit

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
MAX_READER_HTML_LENGTH = 12_000_000
SCRIPT_BLOCK_RE = re.compile(r"<script\b[^>]*>.*?</script>", re.IGNORECASE | re.DOTALL)
HEAD_RE = re.compile(r"<head\b[^>]*>(.*?)</head>", re.IGNORECASE | re.DOTALL)
LINK_TAG_RE = re.compile(r"<link\b[^>]*>", re.IGNORECASE)
STYLE_BLOCK_RE = re.compile(r"<style\b[^>]*>(.*?)</style>", re.IGNORECASE | re.DOTALL)
BODY_RE = re.compile(r"<body\b[^>]*>(.*?)</body>", re.IGNORECASE | re.DOTALL)
TITLE_RE = re.compile(r"<title\b[^>]*>(.*?)</title>", re.IGNORECASE | re.DOTALL)
TAG_RE = re.compile(r"<[^>]+>")
SRC_LIKE_ATTR_RE = re.compile(
    r'(?P<prefix>\b(?:src|poster|data|xlink:href)\s*=\s*)(?P<quote>["\'])(?P<url>.*?)(?P=quote)',
    re.IGNORECASE,
)
SVG_IMAGE_HREF_RE = re.compile(
    r'(?P<prefix><image\b[^>]*?\bhref\s*=\s*)(?P<quote>["\'])(?P<url>.*?)(?P=quote)',
    re.IGNORECASE,
)
SRCSET_ATTR_RE = re.compile(
    r'(?P<prefix>\bsrcset\s*=\s*)(?P<quote>["\'])(?P<value>.*?)(?P=quote)',
    re.IGNORECASE,
)
CSS_URL_RE = re.compile(
    r"url\(\s*(?P<quote>['\"]?)(?P<url>[^)\"']+)(?P=quote)\s*\)",
    re.IGNORECASE,
)
CSS_IMPORT_RE = re.compile(
    r"@import\s+(?:url\(\s*)?(?P<quote>['\"]?)(?P<url>[^)\"';]+)(?P=quote)\s*\)?\s*;",
    re.IGNORECASE,
)


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


def _extract_html_head(content: str) -> str:
    if not content:
        return ""
    head_match = HEAD_RE.search(content)
    return head_match.group(1).strip() if head_match else ""


def _extract_html_body(content: str) -> str:
    if not content:
        return ""

    stripped_scripts = SCRIPT_BLOCK_RE.sub("", content)
    body_match = BODY_RE.search(stripped_scripts)
    body = body_match.group(1) if body_match else stripped_scripts
    return body.strip()


def _extract_tag_attr(tag: str, attr_name: str) -> str:
    if not tag:
        return ""
    match = re.search(
        rf"\b{re.escape(attr_name)}\s*=\s*(?P<quote>[\"'])(?P<value>.*?)(?P=quote)",
        tag,
        re.IGNORECASE,
    )
    if not match:
        return ""
    return html.unescape(match.group("value").strip())


def _should_skip_asset_rewrite(url: str) -> bool:
    candidate = (url or "").strip()
    if not candidate:
        return True

    lower = candidate.lower()
    if candidate.startswith("#") or candidate.startswith("//"):
        return True
    if lower.startswith(
        (
            "data:",
            "http:",
            "https:",
            "mailto:",
            "tel:",
            "javascript:",
            "blob:",
            "about:",
            "file:",
        )
    ):
        return True
    return False


def _resolve_asset_path(base_path: str, raw_url: str) -> Tuple[Optional[str], str]:
    if _should_skip_asset_rewrite(raw_url):
        return None, ""

    parsed = urlsplit((raw_url or "").strip())
    path = (parsed.path or "").strip()
    if not path:
        return None, ""

    if path.startswith("/"):
        resolved = posixpath.normpath(path.lstrip("/"))
    else:
        resolved = posixpath.normpath(posixpath.join(posixpath.dirname(base_path), path))

    if not resolved or resolved in {".", "/"}:
        return None, ""
    if resolved.startswith("../"):
        return None, ""

    fragment_suffix = f"#{parsed.fragment}" if parsed.fragment else ""
    return resolved, fragment_suffix


def _guess_media_type(asset_path: str, manifest_media_types: Dict[str, str]) -> str:
    manifest_mime = manifest_media_types.get(asset_path) or ""
    if manifest_mime:
        return manifest_mime

    guessed, _ = mimetypes.guess_type(asset_path)
    if guessed:
        return guessed

    lowered = asset_path.lower()
    if lowered.endswith(".xhtml") or lowered.endswith(".html"):
        return "application/xhtml+xml"
    if lowered.endswith(".css"):
        return "text/css"
    return "application/octet-stream"


def _build_data_uri(asset_bytes: bytes, media_type: str) -> str:
    payload = base64.b64encode(asset_bytes or b"").decode("ascii")
    return f"data:{media_type};base64,{payload}"


def _load_asset_data_uri(
    epub_zip: zipfile.ZipFile,
    *,
    asset_path: str,
    manifest_media_types: Dict[str, str],
    asset_cache: Dict[str, Optional[str]],
) -> Optional[str]:
    if asset_path in asset_cache:
        return asset_cache[asset_path]

    try:
        blob = epub_zip.read(asset_path)
    except KeyError:
        logger.warning("EPUB raw reader asset missing in zip: %s", asset_path)
        asset_cache[asset_path] = None
        return None

    if not blob:
        asset_cache[asset_path] = None
        return None

    media_type = _guess_media_type(asset_path, manifest_media_types)
    data_uri = _build_data_uri(blob, media_type)
    asset_cache[asset_path] = data_uri
    return data_uri


def _rewrite_css_urls(
    css_text: str,
    *,
    css_base_path: str,
    epub_zip: zipfile.ZipFile,
    manifest_media_types: Dict[str, str],
    asset_cache: Dict[str, Optional[str]],
) -> str:
    if not css_text:
        return ""

    def _replace_css_url(match: re.Match[str]) -> str:
        original_url = html.unescape((match.group("url") or "").strip())
        resolved_path, fragment_suffix = _resolve_asset_path(css_base_path, original_url)
        if not resolved_path:
            return match.group(0)

        data_uri = _load_asset_data_uri(
            epub_zip,
            asset_path=resolved_path,
            manifest_media_types=manifest_media_types,
            asset_cache=asset_cache,
        )
        if not data_uri:
            return match.group(0)

        return f"url('{data_uri}{fragment_suffix}')"

    return CSS_URL_RE.sub(_replace_css_url, css_text)


def _inline_css_imports(
    css_text: str,
    *,
    css_base_path: str,
    epub_zip: zipfile.ZipFile,
    manifest_media_types: Dict[str, str],
    asset_cache: Dict[str, Optional[str]],
    visited_css_paths: Set[str],
) -> str:
    if not css_text:
        return ""

    def _replace_import(match: re.Match[str]) -> str:
        import_url = html.unescape((match.group("url") or "").strip())
        import_path, _ = _resolve_asset_path(css_base_path, import_url)
        if not import_path or import_path in visited_css_paths:
            return ""

        try:
            import_blob = epub_zip.read(import_path)
        except KeyError:
            logger.warning("EPUB stylesheet import missing: %s", import_path)
            return ""

        visited_css_paths.add(import_path)
        imported_css = _decode_html_bytes(import_blob)
        expanded_css = _inline_css_imports(
            imported_css,
            css_base_path=import_path,
            epub_zip=epub_zip,
            manifest_media_types=manifest_media_types,
            asset_cache=asset_cache,
            visited_css_paths=visited_css_paths,
        )
        return _rewrite_css_urls(
            expanded_css,
            css_base_path=import_path,
            epub_zip=epub_zip,
            manifest_media_types=manifest_media_types,
            asset_cache=asset_cache,
        )

    return CSS_IMPORT_RE.sub(_replace_import, css_text)


def _load_stylesheet_text(
    epub_zip: zipfile.ZipFile,
    *,
    stylesheet_path: str,
    manifest_media_types: Dict[str, str],
    asset_cache: Dict[str, Optional[str]],
    stylesheet_cache: Dict[str, str],
) -> str:
    cached = stylesheet_cache.get(stylesheet_path)
    if cached is not None:
        return cached

    try:
        css_blob = epub_zip.read(stylesheet_path)
    except KeyError:
        logger.warning("EPUB stylesheet missing in zip: %s", stylesheet_path)
        stylesheet_cache[stylesheet_path] = ""
        return ""

    raw_css = _decode_html_bytes(css_blob)
    expanded_css = _inline_css_imports(
        raw_css,
        css_base_path=stylesheet_path,
        epub_zip=epub_zip,
        manifest_media_types=manifest_media_types,
        asset_cache=asset_cache,
        visited_css_paths={stylesheet_path},
    )
    rewritten_css = _rewrite_css_urls(
        expanded_css,
        css_base_path=stylesheet_path,
        epub_zip=epub_zip,
        manifest_media_types=manifest_media_types,
        asset_cache=asset_cache,
    )
    stylesheet_cache[stylesheet_path] = rewritten_css
    return rewritten_css


def _collect_section_styles(
    head_html: str,
    *,
    section_path: str,
    epub_zip: zipfile.ZipFile,
    manifest_media_types: Dict[str, str],
    asset_cache: Dict[str, Optional[str]],
    stylesheet_cache: Dict[str, str],
    seen_stylesheet_paths: Set[str],
) -> List[str]:
    if not head_html:
        return []

    collected: List[str] = []

    for style_match in STYLE_BLOCK_RE.finditer(head_html):
        style_text = (style_match.group(1) or "").strip()
        if not style_text:
            continue
        collected.append(
            _rewrite_css_urls(
                style_text,
                css_base_path=section_path,
                epub_zip=epub_zip,
                manifest_media_types=manifest_media_types,
                asset_cache=asset_cache,
            )
        )

    for link_match in LINK_TAG_RE.finditer(head_html):
        tag = link_match.group(0)
        rel = _extract_tag_attr(tag, "rel").lower()
        if "stylesheet" not in rel:
            continue

        href = _extract_tag_attr(tag, "href")
        stylesheet_path, _ = _resolve_asset_path(section_path, href)
        if not stylesheet_path:
            continue
        if stylesheet_path in seen_stylesheet_paths:
            continue

        seen_stylesheet_paths.add(stylesheet_path)
        stylesheet_text = _load_stylesheet_text(
            epub_zip,
            stylesheet_path=stylesheet_path,
            manifest_media_types=manifest_media_types,
            asset_cache=asset_cache,
            stylesheet_cache=stylesheet_cache,
        )
        if stylesheet_text.strip():
            collected.append(stylesheet_text)

    return collected


def _rewrite_srcset_value(
    srcset_value: str,
    *,
    section_path: str,
    epub_zip: zipfile.ZipFile,
    manifest_media_types: Dict[str, str],
    asset_cache: Dict[str, Optional[str]],
) -> str:
    rewritten_entries: List[str] = []

    for raw_entry in (srcset_value or "").split(","):
        entry = raw_entry.strip()
        if not entry:
            continue

        segments = entry.split()
        if not segments:
            continue

        src_url = html.unescape(segments[0])
        resolved_path, fragment_suffix = _resolve_asset_path(section_path, src_url)
        if resolved_path:
            data_uri = _load_asset_data_uri(
                epub_zip,
                asset_path=resolved_path,
                manifest_media_types=manifest_media_types,
                asset_cache=asset_cache,
            )
            if data_uri:
                segments[0] = f"{data_uri}{fragment_suffix}"

        rewritten_entries.append(" ".join(segments))

    return ", ".join(rewritten_entries)


def _rewrite_html_asset_urls(
    body_html: str,
    *,
    section_path: str,
    epub_zip: zipfile.ZipFile,
    manifest_media_types: Dict[str, str],
    asset_cache: Dict[str, Optional[str]],
) -> str:
    if not body_html:
        return ""

    def _replace_src_like(match: re.Match[str]) -> str:
        raw_url = html.unescape((match.group("url") or "").strip())
        resolved_path, fragment_suffix = _resolve_asset_path(section_path, raw_url)
        if not resolved_path:
            return match.group(0)

        data_uri = _load_asset_data_uri(
            epub_zip,
            asset_path=resolved_path,
            manifest_media_types=manifest_media_types,
            asset_cache=asset_cache,
        )
        if not data_uri:
            return match.group(0)

        quote = match.group("quote")
        prefix = match.group("prefix")
        return f"{prefix}{quote}{data_uri}{fragment_suffix}{quote}"

    rewritten = SRC_LIKE_ATTR_RE.sub(_replace_src_like, body_html)
    rewritten = SVG_IMAGE_HREF_RE.sub(_replace_src_like, rewritten)

    def _replace_srcset(match: re.Match[str]) -> str:
        quote = match.group("quote")
        prefix = match.group("prefix")
        rewritten_value = _rewrite_srcset_value(
            match.group("value") or "",
            section_path=section_path,
            epub_zip=epub_zip,
            manifest_media_types=manifest_media_types,
            asset_cache=asset_cache,
        )
        return f"{prefix}{quote}{rewritten_value}{quote}"

    rewritten = SRCSET_ATTR_RE.sub(_replace_srcset, rewritten)
    return rewritten


def _sanitize_style_text(css_text: str) -> str:
    return (css_text or "").replace("</style", "<\\/style")


def _extract_html_title(content: str) -> str:
    if not content:
        return ""
    match = TITLE_RE.search(content)
    if not match:
        return ""
    compact = TAG_RE.sub("", match.group(1))
    return html.unescape(compact or "").strip()


def build_epub_reader_html(
    file_bytes: bytes,
    *,
    max_html_length: int = MAX_READER_HTML_LENGTH,
) -> str:
    if not file_bytes:
        raise ValueError("EPUB 文件为空")

    try:
        epub_zip = zipfile.ZipFile(io.BytesIO(file_bytes))
    except Exception as exc:
        raise ValueError("EPUB 压缩包读取失败") from exc

    sections: List[str] = []
    collected_styles: List[str] = []
    selected_sections = 0
    markup_size = 0
    style_size = 0
    truncated = False

    with epub_zip:
        opf_path = _extract_opf_path(epub_zip)
        manifest, spine = _parse_opf(epub_zip, opf_path)

        manifest_media_types: Dict[str, str] = {}
        for item_meta in manifest.values():
            href = item_meta.get("href") or ""
            if not href:
                continue
            resolved_path = _resolve_href(opf_path, href)
            manifest_media_types[resolved_path] = (item_meta.get("media_type") or "").lower()

        asset_cache: Dict[str, Optional[str]] = {}
        stylesheet_cache: Dict[str, str] = {}
        seen_stylesheet_paths: Set[str] = set()
        seen_style_blocks: Set[str] = set()

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
                logger.warning("EPUB raw reader section missing: %s", section_path)
                continue

            section_html = _decode_html_bytes(section_blob)
            section_head = _extract_html_head(section_html)
            section_styles = _collect_section_styles(
                section_head,
                section_path=section_path,
                epub_zip=epub_zip,
                manifest_media_types=manifest_media_types,
                asset_cache=asset_cache,
                stylesheet_cache=stylesheet_cache,
                seen_stylesheet_paths=seen_stylesheet_paths,
            )

            pending_styles: List[str] = []
            pending_style_size = 0
            for css_text in section_styles:
                compact_style = (css_text or "").strip()
                if not compact_style:
                    continue
                if compact_style in seen_style_blocks:
                    continue
                pending_styles.append(compact_style)
                pending_style_size += len(compact_style)

            section_body = _extract_html_body(section_html)
            if not section_body:
                continue

            rewritten_body = _rewrite_html_asset_urls(
                section_body,
                section_path=section_path,
                epub_zip=epub_zip,
                manifest_media_types=manifest_media_types,
                asset_cache=asset_cache,
            )
            if not rewritten_body.strip():
                continue

            title = _extract_html_title(section_html)
            title_block = (
                f'<header class="epub-reader-section-title">{html.escape(title)}</header>'
                if title
                else ""
            )
            section_markup = (
                f'<section class="epub-reader-section" data-section="{section_idx}">'
                f"{title_block}{rewritten_body}</section>"
            )

            projected_total = markup_size + style_size + pending_style_size + len(section_markup)
            if projected_total > max_html_length:
                fallback_total = markup_size + style_size + len(section_markup)
                if fallback_total > max_html_length:
                    truncated = True
                    break
                pending_styles = []
                pending_style_size = 0

            for pending_style in pending_styles:
                collected_styles.append(pending_style)
                seen_style_blocks.add(pending_style)
            style_size += pending_style_size

            sections.append(section_markup)
            markup_size += len(section_markup)
            selected_sections += 1

    if not sections:
        raise ValueError("EPUB 未提取到可渲染内容")

    source_style_block = ""
    if collected_styles:
        merged_styles = "\n\n".join(
            _sanitize_style_text(style_text)
            for style_text in collected_styles
            if style_text.strip()
        )
        if merged_styles.strip():
            source_style_block = f"<style id='epub-source-style'>{merged_styles}</style>"

    truncated_tip = (
        '<div class="epub-reader-truncated">内容过长，Raw 阅读模式仅展示前面章节。</div>'
        if truncated
        else ""
    )

    return (
        "<!doctype html>"
        "<html><head><meta charset='utf-8' />"
        "<meta name='viewport' content='width=device-width, initial-scale=1' />"
        "<title>EPUB Raw Reader</title>"
        "<style>"
        "html,body{margin:0;padding:0;background:#f5f1e8;color:#1f2937;}"
        "body{font-family:'Iowan Old Style','Palatino Linotype','Book Antiqua',Palatino,serif;"
        "line-height:1.75;text-rendering:optimizeLegibility;-webkit-font-smoothing:antialiased;}"
        ".epub-reader-root{max-width:760px;margin:0 auto;padding:56px 24px 96px;}"
        ".epub-reader-meta{font-size:12px;letter-spacing:.02em;color:#6b7280;margin:0 0 22px;}"
        ".epub-reader-truncated{margin:0 0 18px;padding:10px 14px;border-radius:10px;"
        "background:#fffbeb;color:#92400e;font-size:13px;border:1px solid #fcd34d;}"
        ".epub-reader-section{margin:0 0 2.4rem;}"
        ".epub-reader-section + .epub-reader-section{padding-top:1.8rem;border-top:1px solid rgba(15,23,42,.12);}"
        ".epub-reader-section-title{font-size:1.05rem;font-weight:600;letter-spacing:.01em;color:#334155;margin:0 0 .9rem;}"
        ".epub-reader-section img,.epub-reader-section svg,.epub-reader-section video,.epub-reader-section canvas{max-width:100%;height:auto;}"
        ".epub-reader-section table{max-width:100%;overflow:auto;display:block;}"
        ".epub-reader-section pre{white-space:pre-wrap;word-break:break-word;}"
        ".epub-reader-section iframe{max-width:100%;}"
        "@media (max-width:900px){.epub-reader-root{padding:42px 16px 72px;}}"
        "</style>"
        f"{source_style_block}"
        "</head><body>"
        "<main class='epub-reader-root'>"
        f"<div class='epub-reader-meta'>Section count: {selected_sections}</div>"
        f"{truncated_tip}"
        f"{''.join(sections)}"
        "</main></body></html>"
    )


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
