from __future__ import annotations

from fastapi import APIRouter, Depends, HTTPException, Request
from sqlalchemy import select
from sqlalchemy.orm import Session

from ...core.deps import ensure_company, get_current_user, require_roles
from ...db import get_db
from ...models import Company, User
from ...schemas import CompanyOut, CompanyUpsert
from ...services.audit import record_audit
from ..helpers import apply_changes, get_or_404, new_id

router = APIRouter(tags=["companies"])


@router.get("/companies", response_model=list[CompanyOut])
def list_companies(
    user: User = Depends(get_current_user),
    db: Session = Depends(get_db),
) -> list[CompanyOut]:
    query = select(Company)
    if user.role != "admin":
        query = query.where(Company.id == user.companyId)
    companies = db.scalars(query.order_by(Company.name)).all()
    return [CompanyOut.model_validate(c) for c in companies]


@router.post("/companies", response_model=CompanyOut, status_code=201)
def create_company(
    body: CompanyUpsert,
    request: Request,
    user: User = Depends(require_roles("admin")),
    db: Session = Depends(get_db),
) -> CompanyOut:
    changes = body.model_dump(exclude_unset=True)
    if not changes.get("name"):
        raise HTTPException(status_code=400, detail="El nombre es obligatorio")
    company = Company(id=new_id(), name=changes.pop("name"))
    apply_changes(company, changes)
    db.add(company)
    record_audit(
        db, user, action="create", module="empresa",
        entity_type="company", entity_id=company.id, new_values=changes, request=request,
    )
    db.commit()
    db.refresh(company)
    return CompanyOut.model_validate(company)


@router.get("/companies/{company_id}", response_model=CompanyOut)
def get_company(
    company_id: str,
    user: User = Depends(get_current_user),
    db: Session = Depends(get_db),
) -> CompanyOut:
    company = get_or_404(db, Company, company_id, "Empresa")
    if user.role != "admin":
        ensure_company(user, company_id)
    return CompanyOut.model_validate(company)


@router.put("/companies/{company_id}", response_model=CompanyOut)
def update_company(
    company_id: str,
    body: CompanyUpsert,
    request: Request,
    user: User = Depends(require_roles("admin", "manager")),
    db: Session = Depends(get_db),
) -> CompanyOut:
    company = get_or_404(db, Company, company_id, "Empresa")
    ensure_company(user, company_id)
    changes = body.model_dump(exclude_unset=True)
    apply_changes(company, changes)
    record_audit(
        db, user, action="update", module="empresa",
        entity_type="company", entity_id=company.id, new_values=changes, request=request,
    )
    db.commit()
    db.refresh(company)
    return CompanyOut.model_validate(company)


@router.delete("/companies/{company_id}", status_code=200)
def delete_company(
    company_id: str,
    request: Request,
    user: User = Depends(require_roles("admin")),
    db: Session = Depends(get_db),
) -> dict:
    company = get_or_404(db, Company, company_id, "Empresa")
    record_audit(
        db, user, action="delete", module="empresa",
        entity_type="company", entity_id=company.id,
        old_values={"name": company.name}, request=request,
    )
    db.delete(company)
    db.commit()
    return {"message": "Empresa eliminada"}
