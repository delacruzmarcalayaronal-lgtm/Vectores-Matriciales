from __future__ import annotations

from fastapi import HTTPException, Request
from sqlalchemy.orm import Session

from ..api.helpers import apply_changes, new_id
from ..models import User, Vector
from ..schemas import VectorOut, VectorUpsert
from .audit import record_audit


def validate_values(raw_values: list | None) -> list[float]:
    values = [float(x) for x in (raw_values or [])]
    if not values:
        raise HTTPException(status_code=400, detail="El vector debe contener al menos un valor")
    return values


def create_vector(
    db: Session,
    company_id: str,
    body: VectorUpsert,
    user: User,
    request: Request,
) -> Vector:
    changes = body.model_dump(exclude_unset=True)
    if not changes.get("name"):
        raise HTTPException(status_code=400, detail="El nombre es obligatorio")
    values = validate_values(changes.get("values"))
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
    return vector


def update_vector(
    db: Session,
    vector: Vector,
    body: VectorUpsert,
    user: User,
    request: Request,
) -> Vector:
    changes = body.model_dump(exclude_unset=True)
    if "values" in changes:
        values = validate_values(changes["values"])
        changes["values"] = values
        changes["dimension"] = len(values)
    apply_changes(vector, changes)
    record_audit(
        db, user, action="update", module="vectores",
        entity_type="vector", entity_id=vector.id, new_values=changes, request=request,
    )
    db.commit()
    db.refresh(vector)
    return vector
