from __future__ import annotations

from fastapi import APIRouter, Depends, HTTPException, Request
from sqlalchemy import select
from sqlalchemy.orm import Session

from ...core.deps import ensure_company, get_current_user, require_roles
from ...db import get_db
from ...models import Branch, User
from ...schemas import BranchOut, BranchUpsert
from ...services.audit import record_audit
from ..helpers import apply_changes, get_or_404, new_id

router = APIRouter(tags=["branches"])


@router.get("/companies/{company_id}/branches", response_model=list[BranchOut])
def list_branches(
    company_id: str,
    user: User = Depends(get_current_user),
    db: Session = Depends(get_db),
) -> list[BranchOut]:
    ensure_company(user, company_id)
    branches = db.scalars(
        select(Branch).where(Branch.companyId == company_id).order_by(Branch.name)
    ).all()
    return [BranchOut.model_validate(b) for b in branches]


@router.post(
    "/companies/{company_id}/branches",
    response_model=BranchOut,
    status_code=201,
)
def create_branch(
    company_id: str,
    body: BranchUpsert,
    request: Request,
    user: User = Depends(require_roles("admin", "manager")),
    db: Session = Depends(get_db),
) -> BranchOut:
    ensure_company(user, company_id)
    changes = body.model_dump(exclude_unset=True)
    if not changes.get("name"):
        raise HTTPException(status_code=400, detail="El nombre es obligatorio")
    branch = Branch(id=new_id(), companyId=company_id, name=changes.pop("name"))
    apply_changes(branch, changes)
    db.add(branch)
    record_audit(
        db, user, action="create", module="sucursales",
        entity_type="branch", entity_id=branch.id, new_values=changes, request=request,
    )
    db.commit()
    db.refresh(branch)
    return BranchOut.model_validate(branch)


@router.get("/branches/{branch_id}", response_model=BranchOut)
def get_branch(
    branch_id: str,
    user: User = Depends(get_current_user),
    db: Session = Depends(get_db),
) -> BranchOut:
    branch = get_or_404(db, Branch, branch_id, "Sede")
    ensure_company(user, branch.companyId)
    return BranchOut.model_validate(branch)


@router.put("/branches/{branch_id}", response_model=BranchOut)
def update_branch(
    branch_id: str,
    body: BranchUpsert,
    request: Request,
    user: User = Depends(require_roles("admin", "manager")),
    db: Session = Depends(get_db),
) -> BranchOut:
    branch = get_or_404(db, Branch, branch_id, "Sede")
    ensure_company(user, branch.companyId)
    changes = body.model_dump(exclude_unset=True)
    apply_changes(branch, changes)
    record_audit(
        db, user, action="update", module="sucursales",
        entity_type="branch", entity_id=branch.id, new_values=changes, request=request,
    )
    db.commit()
    db.refresh(branch)
    return BranchOut.model_validate(branch)


@router.delete("/branches/{branch_id}", status_code=200)
def delete_branch(
    branch_id: str,
    request: Request,
    user: User = Depends(require_roles("admin", "manager")),
    db: Session = Depends(get_db),
) -> dict:
    branch = get_or_404(db, Branch, branch_id, "Sede")
    ensure_company(user, branch.companyId)
    record_audit(
        db, user, action="delete", module="sucursales",
        entity_type="branch", entity_id=branch.id,
        old_values={"name": branch.name}, request=request,
    )
    db.delete(branch)
    db.commit()
    return {"message": "Sede eliminada"}
