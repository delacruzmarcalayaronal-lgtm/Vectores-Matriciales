from __future__ import annotations

from fastapi import APIRouter, Depends, HTTPException, Request
from sqlalchemy import delete, select
from sqlalchemy.orm import Session

from ...core.deps import ensure_company, get_current_user, require_roles
from ...core.security import hash_password
from ...core.database import get_db
from ...models import ConsentLog, User, Worker, WorkerLocation
from ...schemas import UserCreate, UserOut, UserUpdate
from ...services.audit import record_audit
from ..helpers import apply_changes, get_or_404, new_id

router = APIRouter(tags=["users"])


@router.get("/companies/{company_id}/users", response_model=list[UserOut])
def list_users(
    company_id: str,
    user: User = Depends(require_roles("admin")),
    db: Session = Depends(get_db),
) -> list[UserOut]:
    ensure_company(user, company_id)
    users = db.scalars(
        select(User).where(User.companyId == company_id).order_by(User.name)
    ).all()
    return [UserOut.model_validate(u) for u in users]


@router.post("/companies/{company_id}/users", response_model=UserOut, status_code=201)
def create_user(
    company_id: str,
    body: UserCreate,
    request: Request,
    user: User = Depends(require_roles("admin")),
    db: Session = Depends(get_db),
) -> UserOut:
    ensure_company(user, company_id)
    if len(body.password) < 6:
        raise HTTPException(status_code=400, detail="La contraseña debe tener al menos 6 caracteres")
    if body.dni:
        existing = db.scalar(select(User).where(User.dni == body.dni))
        if existing is not None:
            raise HTTPException(status_code=400, detail="Ese DNI ya está registrado")
    new_user = User(
        id=new_id(),
        companyId=company_id,
        name=body.name,
        dni=body.dni,
        role=body.role,
        avatar=body.avatar,
        isActive=body.isActive,
        passwordHash=hash_password(body.password),
    )
    db.add(new_user)
    record_audit(
        db, user, action="create", module="usuarios",
        entity_type="user", entity_id=new_user.id,
        new_values={"name": body.name, "role": body.role}, request=request,
    )
    db.commit()
    db.refresh(new_user)
    return UserOut.model_validate(new_user)


@router.get("/users/{user_id}", response_model=UserOut)
def get_user(
    user_id: str,
    user: User = Depends(get_current_user),
    db: Session = Depends(get_db),
) -> UserOut:
    target = get_or_404(db, User, user_id, "Usuario")
    if user.role != "admin":
        ensure_company(user, target.companyId)
    return UserOut.model_validate(target)


@router.put("/users/{user_id}", response_model=UserOut)
def update_user(
    user_id: str,
    body: UserUpdate,
    request: Request,
    user: User = Depends(require_roles("admin")),
    db: Session = Depends(get_db),
) -> UserOut:
    target = get_or_404(db, User, user_id, "Usuario")
    ensure_company(user, target.companyId)
    changes = body.model_dump(exclude_unset=True)
    password = changes.pop("password", None)
    if password is not None:
        if len(password) < 6:
            raise HTTPException(status_code=400, detail="La contraseña debe tener al menos 6 caracteres")
        target.passwordHash = hash_password(password)
    if changes.get("dni") and changes["dni"] != target.dni:
        existing = db.scalar(select(User).where(User.dni == changes["dni"]))
        if existing is not None:
            raise HTTPException(status_code=400, detail="Ese DNI ya está registrado")
    apply_changes(target, changes)
    record_audit(
        db, user, action="update", module="usuarios",
        entity_type="user", entity_id=target.id, new_values=changes, request=request,
    )
    db.commit()
    db.refresh(target)
    return UserOut.model_validate(target)


@router.delete("/users/{user_id}", status_code=200)
def delete_user(
    user_id: str,
    request: Request,
    user: User = Depends(require_roles("admin")),
    db: Session = Depends(get_db),
) -> dict:
    target = get_or_404(db, User, user_id, "Usuario")
    ensure_company(user, target.companyId)
    if target.id == user.id:
        raise HTTPException(status_code=400, detail="No puedes eliminar tu propia cuenta")
    # El perfil de rastreo (y sus registros GPS/consentimientos) dependen del
    # usuario por FK: sin borrarlos primero la restricción revienta con 500 y
    # el borrado "no hace nada" en la interfaz.
    worker_ids = list(db.scalars(select(Worker.id).where(Worker.userId == target.id)))
    if worker_ids:
        db.execute(delete(WorkerLocation).where(WorkerLocation.workerId.in_(worker_ids)))
        db.execute(delete(ConsentLog).where(ConsentLog.workerId.in_(worker_ids)))
        db.execute(delete(Worker).where(Worker.id.in_(worker_ids)))
    record_audit(
        db, user, action="delete", module="usuarios",
        entity_type="user", entity_id=target.id,
        old_values={"name": target.name}, request=request,
    )
    db.delete(target)
    db.commit()
    return {"message": "Usuario eliminado"}
