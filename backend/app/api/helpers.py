from __future__ import annotations

from uuid import uuid4

from fastapi import HTTPException
from pydantic import BaseModel
from sqlalchemy.orm import Session

from ..models import utcnow


def new_id() -> str:
    return uuid4().hex


def get_or_404(db: Session, model, entity_id: str, label: str = "registro"):
    obj = db.get(model, entity_id)
    if obj is None:
        raise HTTPException(status_code=404, detail=f"{label} no encontrado")
    return obj


def apply_changes(obj, payload: BaseModel | dict) -> None:
    changes = payload if isinstance(payload, dict) else payload.model_dump(exclude_unset=True)
    for key, value in changes.items():
        setattr(obj, key, value)
    if hasattr(obj, "updatedAt"):
        obj.updatedAt = utcnow()
