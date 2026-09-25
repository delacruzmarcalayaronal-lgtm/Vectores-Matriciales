from __future__ import annotations

from fastapi import APIRouter, Depends, Query
from sqlalchemy import select
from sqlalchemy.orm import Session

from ...core.deps import ensure_company, require_roles
from ...db import get_db
from ...models import AuditLog, User
from ...schemas import AuditLogOut, Page

router = APIRouter(tags=["audit"])


@router.get("/companies/{company_id}/audit", response_model=Page[AuditLogOut])
def list_audit(
    company_id: str,
    userId: str | None = Query(default=None),
    module: str | None = Query(default=None),
    startDate: str | None = Query(default=None),
    endDate: str | None = Query(default=None),
    page: int | None = Query(default=None, ge=1),
    pageSize: int | None = Query(default=None, ge=1),
    user: User = Depends(require_roles("admin", "analyst")),
    db: Session = Depends(get_db),
) -> Page[AuditLogOut]:
    ensure_company(user, company_id)
    query = select(AuditLog).where(AuditLog.companyId == company_id)
    if userId:
        query = query.where(AuditLog.userId == userId)
    if module:
        query = query.where(AuditLog.module == module)
    if startDate:
        query = query.where(AuditLog.createdAt >= startDate)
    if endDate:
        query = query.where(AuditLog.createdAt <= f"{endDate}T23:59:59.999999")
    query = query.order_by(AuditLog.createdAt.desc())
    rows = list(db.scalars(query).all())
    total = len(rows)
    if page is not None:
        size = pageSize or 20
        rows = rows[(page - 1) * size : (page - 1) * size + size]
    return Page[AuditLogOut](data=[AuditLogOut.model_validate(r) for r in rows], total=total)
