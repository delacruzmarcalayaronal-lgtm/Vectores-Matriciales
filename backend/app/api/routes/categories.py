from __future__ import annotations

from fastapi import APIRouter, Depends, HTTPException, Request
from sqlalchemy import select
from sqlalchemy.orm import Session

from ...core.deps import ensure_company, get_current_user, require_roles
from ...core.database import get_db
from ...models import Category, Product, User
from ...schemas import CategoryOut, CategoryUpsert
from ...services.audit import record_audit
from ..helpers import apply_changes, get_or_404, new_id

router = APIRouter(tags=["categories"])


@router.get("/companies/{company_id}/categories", response_model=list[CategoryOut])
def list_categories(
    company_id: str,
    user: User = Depends(get_current_user),
    db: Session = Depends(get_db),
) -> list[CategoryOut]:
    ensure_company(user, company_id)
    categories = db.scalars(
        select(Category).where(Category.companyId == company_id).order_by(Category.name)
    ).all()
    return [CategoryOut.model_validate(c) for c in categories]


@router.post("/companies/{company_id}/categories", response_model=CategoryOut, status_code=201)
def create_category(
    company_id: str,
    body: CategoryUpsert,
    request: Request,
    user: User = Depends(require_roles("admin", "manager")),
    db: Session = Depends(get_db),
) -> CategoryOut:
    ensure_company(user, company_id)
    changes = body.model_dump(exclude_unset=True)
    if not changes.get("name"):
        raise HTTPException(status_code=400, detail="El nombre es obligatorio")
    category = Category(id=new_id(), companyId=company_id, name=changes.pop("name"))
    apply_changes(category, changes)
    db.add(category)
    record_audit(
        db, user, action="create", module="productos",
        entity_type="category", entity_id=category.id, new_values=changes, request=request,
    )
    db.commit()
    db.refresh(category)
    return CategoryOut.model_validate(category)


@router.get("/categories/{category_id}", response_model=CategoryOut)
def get_category(
    category_id: str,
    user: User = Depends(get_current_user),
    db: Session = Depends(get_db),
) -> CategoryOut:
    category = get_or_404(db, Category, category_id, "Categoría")
    ensure_company(user, category.companyId)
    return CategoryOut.model_validate(category)


@router.put("/categories/{category_id}", response_model=CategoryOut)
def update_category(
    category_id: str,
    body: CategoryUpsert,
    request: Request,
    user: User = Depends(require_roles("admin", "manager")),
    db: Session = Depends(get_db),
) -> CategoryOut:
    category = get_or_404(db, Category, category_id, "Categoría")
    ensure_company(user, category.companyId)
    changes = body.model_dump(exclude_unset=True)
    apply_changes(category, changes)
    record_audit(
        db, user, action="update", module="productos",
        entity_type="category", entity_id=category.id, new_values=changes, request=request,
    )
    db.commit()
    db.refresh(category)
    return CategoryOut.model_validate(category)


@router.delete("/categories/{category_id}", status_code=200)
def delete_category(
    category_id: str,
    request: Request,
    user: User = Depends(require_roles("admin", "manager")),
    db: Session = Depends(get_db),
) -> dict:
    category = get_or_404(db, Category, category_id, "Categoría")
    ensure_company(user, category.companyId)
    in_use = db.scalar(select(Product).where(Product.categoryId == category_id).limit(1))
    if in_use is not None:
        raise HTTPException(status_code=409, detail="Hay productos que usan esta categoría")
    record_audit(
        db, user, action="delete", module="productos",
        entity_type="category", entity_id=category.id,
        old_values={"name": category.name}, request=request,
    )
    db.delete(category)
    db.commit()
    return {"message": "Categoría eliminada"}
