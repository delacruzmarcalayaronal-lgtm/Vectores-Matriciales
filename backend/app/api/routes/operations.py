from __future__ import annotations

from fastapi import APIRouter, Depends, HTTPException, Query, Request
from sqlalchemy.orm import Session

from ...core.deps import ensure_company, get_current_user, require_roles
from ...core.database import get_db
from ...models import User
from ...schemas import OperationExecuteIn, OperationOut, Page
from ...services.audit import record_audit
from ...services.operation_service import OperationService
from ..helpers import get_or_404
from ...models import Operation

router = APIRouter(tags=["operations"])

OPERATION_ROLES = ("admin", "analyst")


@router.get("/companies/{company_id}/operations", response_model=Page[OperationOut])
def list_operations(
    company_id: str,
    page: int | None = Query(default=None, ge=1),
    pageSize: int | None = Query(default=None, ge=1),
    user: User = Depends(get_current_user),
    db: Session = Depends(get_db),
) -> Page[OperationOut]:
    ensure_company(user, company_id)
    service = OperationService(db)
    return service.list_page(company_id, page, pageSize)


@router.post("/companies/{company_id}/operations", response_model=OperationOut, status_code=201)
def execute_operation(
    company_id: str,
    body: OperationExecuteIn,
    request: Request,
    user: User = Depends(require_roles(*OPERATION_ROLES)),
    db: Session = Depends(get_db),
) -> OperationOut:
    ensure_company(user, company_id)
    service = OperationService(db)
    try:
        operation = service.execute(company_id, body, user)
    except HTTPException as exc:
        record_audit(
            db, user, action="execute", module="operaciones",
            entity_type="operation", status="failure",
            error=str(exc.detail), request=request,
        )
        db.commit()
        raise
    record_audit(
        db, user, action="execute", module="operaciones",
        entity_type="operation", entity_id=operation.id,
        new_values={"type": body.type, "name": body.name}, request=request,
    )
    db.commit()
    db.refresh(operation)
    return OperationOut.model_validate(operation)


@router.get("/operations/{operation_id}", response_model=OperationOut)
def get_operation(
    operation_id: str,
    user: User = Depends(get_current_user),
    db: Session = Depends(get_db),
) -> OperationOut:
    operation = get_or_404(db, Operation, operation_id, "Operación")
    ensure_company(user, operation.companyId)
    return OperationOut.model_validate(operation)


@router.delete("/operations/{operation_id}", status_code=200)
def delete_operation(
    operation_id: str,
    request: Request,
    user: User = Depends(require_roles(*OPERATION_ROLES)),
    db: Session = Depends(get_db),
) -> dict:
    operation = get_or_404(db, Operation, operation_id, "Operación")
    ensure_company(user, operation.companyId)
    record_audit(
        db, user, action="delete", module="operaciones",
        entity_type="operation", entity_id=operation.id,
        old_values={"name": operation.name}, request=request,
    )
    db.delete(operation)
    db.commit()
    return {"message": "Operación eliminada"}
