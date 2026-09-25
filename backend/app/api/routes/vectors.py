from __future__ import annotations

from fastapi import APIRouter, Depends, HTTPException, Request
from sqlalchemy import select
from sqlalchemy.orm import Session

from ...core.deps import ensure_company, require_roles
from ...db import get_db
from ...models import User, Vector
from ...schemas import VectorOut, VectorUpsert
from ...services.audit import record_audit
from ..helpers import apply_changes, get_or_404, new_id

router = APIRouter(tags=["vectors"])

VECTOR_ROLES = ("admin", "analyst")


@router.get("/companies/{company_id}/vectors", response_model=list[VectorOut])
def list_vectors(
    company_id: str,
    user: User = Depends(require_roles(*VECTOR_ROLES)),
    db: Session = Depends(get_db),
) -> list[VectorOut]:
    ensure_company(user, company_id)
    vectors = db.scalars(
        select(Vector).where(Vector.companyId == company_id).order_by(Vector.createdAt.desc())
    ).all()
    return [VectorOut.model_validate(v) for v in vectors]


@router.post("/companies/{company_id}/vectors", response_model=VectorOut, status_code=201)
def create_vector(
    company_id: str,
    body: VectorUpsert,
    request: Request,
    user: User = Depends(require_roles(*VECTOR_ROLES)),
    db: Session = Depends(get_db),
) -> VectorOut:
    ensure_company(user, company_id)
    changes = body.model_dump(exclude_unset=True)
    if not changes.get("name"):
        raise HTTPException(status_code=400, detail="El nombre es obligatorio")
    values = [float(x) for x in (changes.get("values") or [])]
    if not values:
        raise HTTPException(status_code=400, detail="El vector debe contener al menos un valor")
    vector = Vector(
        id=new_id(),
        companyId=company_id,
        name=changes.pop("name"),
        description=changes.pop("description", "") or "",
        values=values,
        dimension=len(values),
        source=changes.pop("source", "manual") or "manual",
        sourceConfig=changes.pop("sourceConfig", None),
    )
    db.add(vector)
    record_audit(
        db, user, action="create", module="vectores",
        entity_type="vector", entity_id=vector.id,
        new_values={"name": vector.name, "dimension": vector.dimension}, request=request,
    )
    db.commit()
    db.refresh(vector)
    return VectorOut.model_validate(vector)


@router.get("/vectors/{vector_id}", response_model=VectorOut)
def get_vector(
    vector_id: str,
    user: User = Depends(require_roles(*VECTOR_ROLES)),
    db: Session = Depends(get_db),
) -> VectorOut:
    vector = get_or_404(db, Vector, vector_id, "Vector")
    ensure_company(user, vector.companyId)
    return VectorOut.model_validate(vector)


@router.put("/vectors/{vector_id}", response_model=VectorOut)
def update_vector(
    vector_id: str,
    body: VectorUpsert,
    request: Request,
    user: User = Depends(require_roles(*VECTOR_ROLES)),
    db: Session = Depends(get_db),
) -> VectorOut:
    vector = get_or_404(db, Vector, vector_id, "Vector")
    ensure_company(user, vector.companyId)
    changes = body.model_dump(exclude_unset=True)
    if "values" in changes:
        values = [float(x) for x in (changes["values"] or [])]
        if not values:
            raise HTTPException(status_code=400, detail="El vector debe contener al menos un valor")
        changes["values"] = values
        changes["dimension"] = len(values)
    apply_changes(vector, changes)
    record_audit(
        db, user, action="update", module="vectores",
        entity_type="vector", entity_id=vector.id, new_values=changes, request=request,
    )
    db.commit()
    db.refresh(vector)
    return VectorOut.model_validate(vector)


@router.delete("/vectors/{vector_id}", status_code=200)
def delete_vector(
    vector_id: str,
    request: Request,
    user: User = Depends(require_roles(*VECTOR_ROLES)),
    db: Session = Depends(get_db),
) -> dict:
    vector = get_or_404(db, Vector, vector_id, "Vector")
    ensure_company(user, vector.companyId)
    record_audit(
        db, user, action="delete", module="vectores",
        entity_type="vector", entity_id=vector.id,
        old_values={"name": vector.name}, request=request,
    )
    db.delete(vector)
    db.commit()
    return {"message": "Vector eliminado"}
