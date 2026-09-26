from __future__ import annotations

from fastapi import APIRouter, Depends, HTTPException, Request, Query
from sqlalchemy import select
from sqlalchemy.orm import Session

from ...core.deps import ensure_company, get_current_user, require_roles
from ...core.database import get_db
from ...models import Product, User
from ...schemas import ProductOut, ProductUpsert
from ...services.audit import record_audit
from ..helpers import apply_changes, get_or_404, new_id

router = APIRouter(tags=["products"])


@router.get("/companies/{company_id}/products", response_model=list[ProductOut])
def list_products(
    company_id: str,
    categoryId: str | None = Query(default=None),
    isActive: bool | None = Query(default=None),
    user: User = Depends(get_current_user),
    db: Session = Depends(get_db),
) -> list[ProductOut]:
    ensure_company(user, company_id)
    query = select(Product).where(Product.companyId == company_id)
    if categoryId:
        query = query.where(Product.categoryId == categoryId)
    if isActive is not None:
        query = query.where(Product.isActive == isActive)
    products = db.scalars(query.order_by(Product.name)).all()
    return [ProductOut.model_validate(p) for p in products]


@router.post("/companies/{company_id}/products", response_model=ProductOut, status_code=201)
def create_product(
    company_id: str,
    body: ProductUpsert,
    request: Request,
    user: User = Depends(require_roles("admin", "manager")),
    db: Session = Depends(get_db),
) -> ProductOut:
    ensure_company(user, company_id)
    changes = body.model_dump(exclude_unset=True)
    if not changes.get("name"):
        raise HTTPException(status_code=400, detail="El nombre es obligatorio")
    product = Product(id=new_id(), companyId=company_id, name=changes.pop("name"))
    apply_changes(product, changes)
    db.add(product)
    record_audit(
        db, user, action="create", module="productos",
        entity_type="product", entity_id=product.id, new_values=changes, request=request,
    )
    db.commit()
    db.refresh(product)
    return ProductOut.model_validate(product)


@router.get("/products/{product_id}", response_model=ProductOut)
def get_product(
    product_id: str,
    user: User = Depends(get_current_user),
    db: Session = Depends(get_db),
) -> ProductOut:
    product = get_or_404(db, Product, product_id, "Producto")
    ensure_company(user, product.companyId)
    return ProductOut.model_validate(product)


@router.put("/products/{product_id}", response_model=ProductOut)
def update_product(
    product_id: str,
    body: ProductUpsert,
    request: Request,
    user: User = Depends(require_roles("admin", "manager")),
    db: Session = Depends(get_db),
) -> ProductOut:
    product = get_or_404(db, Product, product_id, "Producto")
    ensure_company(user, product.companyId)
    changes = body.model_dump(exclude_unset=True)
    apply_changes(product, changes)
    record_audit(
        db, user, action="update", module="productos",
        entity_type="product", entity_id=product.id, new_values=changes, request=request,
    )
    db.commit()
    db.refresh(product)
    return ProductOut.model_validate(product)


@router.delete("/products/{product_id}", status_code=200)
def delete_product(
    product_id: str,
    request: Request,
    user: User = Depends(require_roles("admin", "manager")),
    db: Session = Depends(get_db),
) -> dict:
    product = get_or_404(db, Product, product_id, "Producto")
    ensure_company(user, product.companyId)
    record_audit(
        db, user, action="delete", module="productos",
        entity_type="product", entity_id=product.id,
        old_values={"name": product.name}, request=request,
    )
    db.delete(product)
    db.commit()
    return {"message": "Producto eliminado"}
