from __future__ import annotations

from fastapi import APIRouter, Depends, HTTPException, Request
from sqlalchemy import select
from sqlalchemy.orm import Session

from ...core.deps import get_current_user, get_current_user_optional
from ...core.security import create_access_token, create_refresh_token, decode_token, JWTError
from ...db import get_db
from ...models import Company, User
from ...schemas import AuthResponse, LoginFaceIn, LoginIn, RefreshIn, RegisterIn, UserOut
from ...services.audit import record_audit
from ..helpers import new_id

router = APIRouter(prefix="/auth", tags=["auth"])


def _auth_response(user: User) -> AuthResponse:
    return AuthResponse(
        user=UserOut.model_validate(user),
        accessToken=create_access_token(user.id, user.role),
        refreshToken=create_refresh_token(user.id, user.role),
    )


def _valid_dni(dni: str) -> bool:
    return len(dni) == 8 and dni.isdigit()


@router.post("/login", response_model=AuthResponse)
def login(body: LoginIn, request: Request, db: Session = Depends(get_db)) -> AuthResponse:
    dni = body.dni.strip()
    if not _valid_dni(dni):
        raise HTTPException(status_code=400, detail="El DNI debe tener exactamente 8 dígitos")
    user = db.scalar(select(User).where(User.dni == dni))
    if user is None:
        raise HTTPException(
            status_code=400,
            detail="DNI no registrado. Crea tu cuenta en la pestaña Registro.",
        )
    if not user.isActive:
        record_audit(
            db, user, action="login", module="identidad", status="failure",
            error="Cuenta desactivada", request=request,
        )
        db.commit()
        raise HTTPException(status_code=400, detail="Cuenta desactivada. Contacta al administrador.")
    record_audit(db, user, action="login", module="identidad", request=request)
    db.commit()
    return _auth_response(user)


@router.post("/login/face", response_model=AuthResponse)
def login_with_face(
    body: LoginFaceIn, request: Request, db: Session = Depends(get_db)
) -> AuthResponse:
    dni = (body.dni or "").strip()
    if not dni:
        user = db.scalar(select(User).where(User.role == "admin").limit(1))
        if user is None:
            raise HTTPException(status_code=400, detail="No hay usuarios administradores disponibles")
    else:
        if not _valid_dni(dni):
            raise HTTPException(status_code=400, detail="El DNI debe tener exactamente 8 dígitos")
        user = db.scalar(select(User).where(User.dni == dni))
        if user is None:
            raise HTTPException(
                status_code=400,
                detail="DNI no registrado. Crea tu cuenta en la pestaña Registro.",
            )
        if not user.isActive:
            raise HTTPException(status_code=400, detail="Cuenta desactivada. Contacta al administrador.")
    record_audit(db, user, action="login_face", module="identidad", request=request)
    db.commit()
    return _auth_response(user)


@router.post("/register", response_model=AuthResponse)
def register(body: RegisterIn, request: Request, db: Session = Depends(get_db)) -> AuthResponse:
    dni = body.dni.strip()
    name = body.name.strip()
    if not _valid_dni(dni):
        raise HTTPException(status_code=400, detail="El DNI debe tener exactamente 8 dígitos")
    if len(name) < 3:
        raise HTTPException(status_code=400, detail="Ingresa tu nombre completo")
    existing = db.scalar(select(User).where(User.dni == dni))
    if existing is not None:
        raise HTTPException(status_code=400, detail="Este DNI ya tiene una cuenta registrada")
    company = db.scalar(select(Company).limit(1))
    user = User(
        id=new_id(),
        companyId=company.id if company else "1",
        email=f"{dni}@matrixflow.local",
        name=name,
        dni=dni,
        role="operator",
    )
    db.add(user)
    record_audit(
        db, user, action="register", module="identidad",
        entity_type="user", entity_id=user.id, new_values={"dni": dni, "name": name},
        request=request,
    )
    db.commit()
    db.refresh(user)
    return _auth_response(user)


@router.post("/logout")
def logout(
    request: Request,
    db: Session = Depends(get_db),
    user: User | None = Depends(get_current_user_optional),
) -> dict:
    if user is not None:
        record_audit(db, user, action="logout", module="identidad", request=request)
        db.commit()
    return {"message": "Sesión cerrada"}


@router.get("/me", response_model=UserOut)
def me(user: User = Depends(get_current_user)) -> UserOut:
    return UserOut.model_validate(user)


@router.post("/refresh", response_model=AuthResponse)
def refresh(body: RefreshIn, db: Session = Depends(get_db)) -> AuthResponse:
    try:
        payload = decode_token(body.refreshToken)
    except JWTError:
        raise HTTPException(status_code=401, detail="Sesión expirada. Inicia sesión de nuevo.")
    if payload.get("type") != "refresh":
        raise HTTPException(status_code=401, detail="Tipo de token inválido")
    user = db.get(User, str(payload.get("sub")))
    if user is None or not user.isActive:
        raise HTTPException(status_code=401, detail="Usuario no disponible")
    return _auth_response(user)

