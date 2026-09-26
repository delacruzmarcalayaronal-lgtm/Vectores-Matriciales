from __future__ import annotations

from fastapi import APIRouter, Depends, HTTPException, Request
from sqlalchemy import select
from sqlalchemy.orm import Session

from ...core.deps import ensure_company, get_current_user, require_roles
from ...core.database import get_db
from ...models import Target, User
from ...schemas import TargetOut, TargetUpsert
from ...services.audit import record_audit
from ..helpers import apply_changes, get_or_404, new_id

router = APIRouter(tags=["targets"])

TARGET_ROLES = ("admin", "manager")


@router.get("/companies/{company_id}/targets", response_model=list[TargetOut])
def list_targets(
    company_id: str,
    user: User = Depends(get_current_user),
    db: Session = Depends(get_db),
) -> list[TargetOut]:
    ensure_company(user, company_id)
    targets = db.scalars(
        select(Target).where(Target.companyId == company_id).order_by(Target.period.desc())
    ).all()
    return [TargetOut.model_validate(t) for t in targets]


@router.post("/companies/{company_id}/targets", response_model=TargetOut, status_code=201)
def create_target(
    company_id: str,
    body: TargetUpsert,
    request: Request,
    user: User = Depends(require_roles(*TARGET_ROLES)),
    db: Session = Depends(get_db),
) -> TargetOut:
    ensure_company(user, company_id)
    changes = body.model_dump(exclude_unset=True)
    target = Target(id=new_id(), companyId=company_id, period=changes.pop("period", "") or "")
    apply_changes(target, changes)
    if not target.period:
        raise HTTPException(status_code=400, detail="El periodo es obligatorio")
    db.add(target)
    record_audit(
        db, user, action="create", module="reportes",
        entity_type="target", entity_id=target.id, new_values=changes, request=request,
    )
    db.commit()
    db.refresh(target)
    return TargetOut.model_validate(target)


@router.get("/targets/{target_id}", response_model=TargetOut)
def get_target(
    target_id: str,
    user: User = Depends(get_current_user),
    db: Session = Depends(get_db),
) -> TargetOut:
    target = get_or_404(db, Target, target_id, "Meta")
    ensure_company(user, target.companyId)
    return TargetOut.model_validate(target)


@router.put("/targets/{target_id}", response_model=TargetOut)
def update_target(
    target_id: str,
    body: TargetUpsert,
    request: Request,
    user: User = Depends(require_roles(*TARGET_ROLES)),
    db: Session = Depends(get_db),
) -> TargetOut:
    target = get_or_404(db, Target, target_id, "Meta")
    ensure_company(user, target.companyId)
    changes = body.model_dump(exclude_unset=True)
    apply_changes(target, changes)
    record_audit(
        db, user, action="update", module="reportes",
        entity_type="target", entity_id=target.id, new_values=changes, request=request,
    )
    db.commit()
    db.refresh(target)
    return TargetOut.model_validate(target)


@router.delete("/targets/{target_id}", status_code=200)
def delete_target(
    target_id: str,
    request: Request,
    user: User = Depends(require_roles(*TARGET_ROLES)),
    db: Session = Depends(get_db),
) -> dict:
    target = get_or_404(db, Target, target_id, "Meta")
    ensure_company(user, target.companyId)
    record_audit(
        db, user, action="delete", module="reportes",
        entity_type="target", entity_id=target.id, request=request,
    )
    db.delete(target)
    db.commit()
    return {"message": "Meta eliminada"}
