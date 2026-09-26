from __future__ import annotations

from datetime import datetime, timezone

from ..core.database import Base

__all__ = ["Base", "utcnow"]


def utcnow() -> str:
    return datetime.now(timezone.utc).isoformat()
