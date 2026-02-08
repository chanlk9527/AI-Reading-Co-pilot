from __future__ import annotations

import mimetypes
import re
from pathlib import Path
from typing import Dict, Optional
from uuid import uuid4


RAW_ASSET_ROOT = Path(__file__).resolve().parents[2] / "storage" / "raw_assets"
SAFE_FILENAME_RE = re.compile(r"[^A-Za-z0-9._-]+")

FORMAT_DEFAULTS = {
    "pdf": (".pdf", "application/pdf"),
    "epub": (".epub", "application/epub+zip"),
}


def _safe_filename(filename: str, fallback: str) -> str:
    raw_name = Path(filename or "").name
    if not raw_name:
        return fallback
    normalized = SAFE_FILENAME_RE.sub("_", raw_name).strip("._")
    return normalized or fallback


def _safe_extension(filename: str, fallback_ext: str) -> str:
    suffix = Path(filename or "").suffix.lower()
    if not suffix:
        return fallback_ext
    if len(suffix) > 10:
        return fallback_ext
    if not re.fullmatch(r"\.[a-z0-9]+", suffix):
        return fallback_ext
    return suffix


def save_raw_asset(
    *,
    user_id: int,
    filename: str,
    content: bytes,
    asset_format: str,
    mime_type: Optional[str] = None,
) -> Dict[str, object]:
    fmt = (asset_format or "").lower()
    default_ext, default_mime = FORMAT_DEFAULTS.get(fmt, (".bin", "application/octet-stream"))
    safe_original_name = _safe_filename(filename, f"raw_asset{default_ext}")
    extension = _safe_extension(safe_original_name, default_ext)

    resolved_mime = (
        mime_type
        or mimetypes.guess_type(f"file{extension}")[0]
        or default_mime
    )

    asset_id = uuid4().hex
    user_dir = RAW_ASSET_ROOT / f"user_{user_id}"
    user_dir.mkdir(parents=True, exist_ok=True)

    stored_name = f"{asset_id}{extension}"
    stored_path = user_dir / stored_name
    stored_path.write_bytes(content or b"")

    return {
        "asset_id": asset_id,
        "format": fmt or "binary",
        "mime_type": resolved_mime,
        "filename": safe_original_name,
        "byte_size": len(content or b""),
        "relative_path": f"user_{user_id}/{stored_name}",
    }


def resolve_raw_asset_path(
    relative_path: str,
    *,
    expected_user_id: Optional[int] = None,
) -> Optional[Path]:
    if not relative_path:
        return None

    root = RAW_ASSET_ROOT.resolve()
    candidate = (RAW_ASSET_ROOT / relative_path).resolve()

    try:
        candidate.relative_to(root)
    except ValueError:
        return None

    if expected_user_id is not None:
        user_root = (RAW_ASSET_ROOT / f"user_{expected_user_id}").resolve()
        try:
            candidate.relative_to(user_root)
        except ValueError:
            return None

    if not candidate.exists() or not candidate.is_file():
        return None

    return candidate
