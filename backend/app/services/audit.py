from __future__ import annotations

from uuid import uuid4

from fastapi import Request
from sqlalchemy.orm import Session

from ..models import AuditLog, User


def record_audit(
    db: Session,
    user: User | None,
    *,
    action: str,
    module: str = "",
    entity_type: str = "",
    entity_id: str = "",
    old_values: dict | None = None,
    new_values: dict | None = None,
    status: str = "success",
    error: str | None = None,
    request: Request | None = None,
    company_id: str | None = None,
) -> None:
    ip = None
    user_agent = None
    if request is not None:
        if request.client is not None:
            ip = request.client.host
        user_agent = request.headers.get("user-agent")
    log = AuditLog(
        id=uuid4().hex,
        companyId=company_id or (user.companyId if user else ""),
        userId=user.id if user else "",
        action=action,
        module=module,
        entityType=entity_type,
        entityId=entity_id,
        oldValues=old_values,
        newValues=new_values,
        ipAddress=ip,
        userAgent=user_agent,
        status=status,
        errorMessage=error,
    )
    db.add(log)
