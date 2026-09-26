from __future__ import annotations

from fastapi import HTTPException, Request
from sqlalchemy import select
from sqlalchemy.orm import Session

from ..api.helpers import new_id
from ..core.security import JWTError, create_access_token, create_refresh_token, decode_token
from ..models import Company, User
from ..schemas import AuthResponse, UserOut
from .audit import record_audit


def valid_dni(dni: str) -> bool:
    return len(dni) == 8 and dni.isdigit()


def auth_response(user: User) -> AuthResponse:
    return AuthResponse(
        user=UserOut.model_validate(user),
        accessToken=create_access_token(user.id, user.role),
        refreshToken=create_refresh_token(user.id, user.role),
    )


def login_by_dni(db: Session, dni: str, request: Request) -> User:
    dni = dni.strip()
    if not valid_dni(dni):
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
    return user


def login_with_face(db: Session, dni: str | None, request: Request) -> User:
    dni = (dni or "").strip()
    if not dni:
        user = db.scalar(select(User).where(User.role == "admin").limit(1))
        if user is None:
            raise HTTPException(status_code=400, detail="No hay usuarios administradores disponibles")
    else:
        if not valid_dni(dni):
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
    return user


def register_user(db: Session, dni: str, name: str, request: Request) -> User:
    dni = dni.strip()
    name = name.strip()
    if not valid_dni(dni):
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
    return user


def refresh_user(db: Session, refresh_token: str) -> User:
    try:
        payload = decode_token(refresh_token)
    except JWTError:
        raise HTTPException(status_code=401, detail="Sesión expirada. Inicia sesión de nuevo.")
    if payload.get("type") != "refresh":
        raise HTTPException(status_code=401, detail="Tipo de token inválido")
    user = db.get(User, str(payload.get("sub")))
    if user is None or not user.isActive:
        raise HTTPException(status_code=401, detail="Usuario no disponible")
    return user
