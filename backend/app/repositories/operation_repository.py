from __future__ import annotations

from sqlalchemy import select
from sqlalchemy.orm import Session

from ..models import Operation
from ..schemas import OperationOut, Page


class OperationRepository:
    """Acceso a datos del historial de operaciones (flujo 9.3 del Plan Maestro)."""

    def __init__(self, db: Session) -> None:
        self.db = db

    def list_page(
        self,
        company_id: str,
        page: int | None = None,
        page_size: int | None = None,
    ) -> Page[OperationOut]:
        rows = list(
            self.db.scalars(
                select(Operation)
                .where(Operation.companyId == company_id)
                .order_by(Operation.createdAt.desc())
            ).all()
        )
        total = len(rows)
        if page is not None:
            size = page_size or 20
            rows = rows[(page - 1) * size : (page - 1) * size + size]
        return Page[OperationOut](
            data=[OperationOut.model_validate(o) for o in rows], total=total
        )

    def add(self, operation: Operation) -> None:
        self.db.add(operation)

    def get(self, operation_id: str) -> Operation | None:
        return self.db.get(Operation, operation_id)

    def delete(self, operation: Operation) -> None:
        self.db.delete(operation)
