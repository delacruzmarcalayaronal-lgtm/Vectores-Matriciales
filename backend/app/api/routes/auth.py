from __future__ import annotations

from fastapi import APIRouter, Depends, HTTPException, Request
from sqlalchemy import select
from sqlalchemy.orm import Session

from ...core.deps import get_current_user, get_current_user_optional
from ...core.database import get_db
from ...models import User
from ...schemas import AuthResponse, LoginFaceIn, LoginIn, MeUpdate, RefreshIn, RegisterIn, UserOut
from ...services import auth_service
from ...services.audit import record_audit

router = APIRouter(prefix="/auth", tags=["auth"])


@router.post("/login", response_model=AuthResponse)
def login(body: LoginIn, request: Request, db: Session = Depends(get_db)) -> AuthResponse:
    user = auth_service.login_by_dni(db, body.dni, request)
    return auth_service.auth_response(user)


@router.post("/login/face", response_model=AuthResponse)
def login_with_face(
    body: LoginFaceIn, request: Request, db: Session = Depends(get_db)
) -> AuthResponse:
    user = auth_service.login_with_face(db, body.dni, request)
    return auth_service.auth_response(user)


@router.post("/register", response_model=AuthResponse)
def register(body: RegisterIn, request: Request, db: Session = Depends(get_db)) -> AuthResponse:
    user = auth_service.register_user(db, body.dni, body.name, request)
    return auth_service.auth_response(user)


@router.post("/logout")
def logout(
    request: Request,
    db: Session = Depends(get_db),
    user: User | None = Depends(get_current_user_optional),
) -> dict:
    if user is not None:
        record_audit(db, user, action="logout", module="identidad", request=request)
        from ...models import Worker
        from ...services.location_cache import location_cache

        worker = db.scalar(select(Worker).where(Worker.userId == user.id))
        if worker is not None:
            location_cache.remove(worker.id)
        user.trackingEnabled = False
        db.commit()
    return {"message": "Sesión cerrada"}


@router.get("/me", response_model=UserOut)
def me(user: User = Depends(get_current_user)) -> UserOut:
    return UserOut.model_validate(user)


@router.put("/me", response_model=UserOut)
def update_me(
    body: MeUpdate,
    request: Request,
    user: User = Depends(get_current_user),
    db: Session = Depends(get_db),
) -> UserOut:
    changes: dict = {}
    if body.name is not None:
        name = body.name.strip()
        if len(name) < 2:
            raise HTTPException(status_code=400, detail="El nombre debe tener al menos 2 caracteres")
        if name != user.name:
            changes["name"] = name
            user.name = name
    # el rol solo lo puede cambiar un administrador
    if body.role is not None and body.role != user.role and user.role == "admin":
        changes["role"] = body.role
        user.role = body.role
    # "avatar" distingue entre no enviado (ausente) y borrado (null)
    if "avatar" in body.model_fields_set:
        if body.avatar is not None and not body.avatar.startswith("data:image/"):
            raise HTTPException(status_code=400, detail="La foto debe ser una imagen válida")
        if body.avatar is not None and len(body.avatar) > 500_000:
            raise HTTPException(status_code=400, detail="La imagen es demasiado grande (máx. 500 KB)")
        if (user.avatar or None) != (body.avatar or None):
            changes["avatar"] = body.avatar
            user.avatar = body.avatar
    if changes:
        record_audit(
            db, user, action="update_profile", module="usuarios",
            entity_type="user", entity_id=user.id, new_values=changes, request=request,
        )
        db.commit()
        db.refresh(user)
    return UserOut.model_validate(user)


@router.post("/refresh", response_model=AuthResponse)
def refresh(body: RefreshIn, db: Session = Depends(get_db)) -> AuthResponse:
    user = auth_service.refresh_user(db, body.refreshToken)
    return auth_service.auth_response(user)
