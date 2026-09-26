from __future__ import annotations

from sqlalchemy.orm import Session


class BaseRepository:
    """Base común de los repositorios: sesión de BD y utilidades CRUD."""

    def __init__(self, db: Session) -> None:
        self.db = db

    def add(self, obj) -> None:
        self.db.add(obj)

    def delete(self, obj) -> None:
        self.db.delete(obj)

    def get_or_none(self, model, entity_id: str):
        return self.db.get(model, entity_id)
