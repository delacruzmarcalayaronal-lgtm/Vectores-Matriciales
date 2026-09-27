from __future__ import annotations

import json

from fastapi import HTTPException, Request
from sqlalchemy import select
from sqlalchemy.orm import Session

from ..api.helpers import new_id
from ..core.security import JWTError, create_access_token, create_refresh_token, decode_token
from ..models import Company, User, utcnow
from ..schemas import AuthResponse, FaceVerifyOut, UserOut
from .audit import record_audit
from .face import (
    DEFAULT_THRESHOLD,
    MAX_POINTS,
    clamp_threshold,
    face_score,
    score_ok,
    validate_vector,
)


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


def login_with_face(
    db: Session,
    dni: str | None,
    face_vector: list[float] | None,
    request: Request,
) -> User:
    dni = (dni or "").strip()

    # Sin descriptor en la petición se conserva el acceso clásico por DNI.
    if face_vector is None:
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

    try:
        probe = validate_vector(face_vector)
    except ValueError as exc:
        raise HTTPException(status_code=400, detail=str(exc)) from exc

    if dni:
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
        stored = load_face_template(user)
        if stored is None:
            raise HTTPException(
                status_code=400,
                detail="Este DNI no tiene un rostro registrado. Regístralo en Identidad Facial.",
            )
        threshold = clamp_threshold(None, user.faceThreshold)
        score = face_score(stored, probe)
        if not score_ok(score, threshold):
            record_audit(
                db, user, action="login_face", module="identidad", status="failure",
                error=f"Rostro no coincide ({score * 100:.0f}% < {threshold}%)", request=request,
            )
            db.commit()
            raise HTTPException(
                status_code=400,
                detail=f"El rostro no coincide (confianza {score * 100:.0f}% · umbral {threshold}%)",
            )
        record_audit(db, user, action="login_face", module="identidad", request=request)
        db.commit()
        return user

    # Identificación 1:N: mejor coincidencia entre los rostros registrados.
    candidates = db.scalars(
        select(User).where(User.faceTemplate.is_not(None), User.isActive.is_(True))
    ).all()
    if not candidates:
        raise HTTPException(
            status_code=400,
            detail="Aún no hay rostros registrados. Registra tu rostro en Identidad Facial.",
        )
    best: User | None = None
    best_score = -1.0
    for candidate in candidates:
        stored = load_face_template(candidate)
        if stored is None:
            continue
        score = face_score(stored, probe)
        if score > best_score:
            best, best_score = candidate, score
    if best is None:
        raise HTTPException(status_code=400, detail="No se pudo comparar contra ningún rostro registrado.")
    threshold = clamp_threshold(None, best.faceThreshold)
    if not score_ok(best_score, threshold):
        record_audit(
            db, best, action="login_face", module="identidad", status="failure",
            error=f"Sin coincidencia 1:N ({best_score * 100:.0f}% < {threshold}%)", request=request,
        )
        db.commit()
        raise HTTPException(
            status_code=400,
            detail=f"Ningún rostro registrado coincide (mejor {best_score * 100:.0f}% · umbral {threshold}%)",
        )
    record_audit(db, best, action="login_face", module="identidad", request=request)
    db.commit()
    return best


def register_user(
    db: Session,
    dni: str,
    name: str,
    request: Request,
    face_vector: list[float] | None = None,
    face_points: int | None = None,
) -> User:
    dni = dni.strip()
    name = name.strip()
    if not valid_dni(dni):
        raise HTTPException(status_code=400, detail="El DNI debe tener exactamente 8 dígitos")
    if len(name) < 3:
        raise HTTPException(status_code=400, detail="Ingresa tu nombre completo")
    existing = db.scalar(select(User).where(User.dni == dni))
    if existing is not None:
        raise HTTPException(status_code=400, detail="Este DNI ya tiene una cuenta registrada")
    template_json: str | None = None
    points: int | None = None
    if face_vector is not None:
        try:
            template_json = json.dumps(validate_vector(face_vector))
        except ValueError as exc:
            raise HTTPException(status_code=400, detail=str(exc)) from exc
        points = max(1, min(MAX_POINTS, int(face_points or MAX_POINTS)))
    company = db.scalar(select(Company).limit(1))
    user = User(
        id=new_id(),
        companyId=company.id if company else "1",
        name=name,
        dni=dni,
        role="operator",
        faceTemplate=template_json,
        facePoints=points,
        faceThreshold=DEFAULT_THRESHOLD if template_json else None,
        faceRegisteredAt=utcnow() if template_json else None,
    )
    db.add(user)
    record_audit(
        db, user, action="register", module="identidad",
        entity_type="user", entity_id=user.id,
        new_values={"dni": dni, "name": name, "face": bool(template_json)},
        request=request,
    )
    db.commit()
    db.refresh(user)
    return user


def load_face_template(user: User) -> list[float] | None:
    if not user.faceTemplate:
        return None
    try:
        data = json.loads(user.faceTemplate)
        return [float(x) for x in data]
    except (ValueError, TypeError, json.JSONDecodeError):
        return None


def save_face_template(
    db: Session,
    user: User,
    vector: list[float],
    points: int | None,
    threshold: int | None,
    request: Request,
) -> User:
    try:
        template_json = json.dumps(validate_vector(vector))
    except ValueError as exc:
        raise HTTPException(status_code=400, detail=str(exc)) from exc
    user.faceTemplate = template_json
    user.facePoints = max(1, min(MAX_POINTS, int(points or MAX_POINTS)))
    user.faceThreshold = clamp_threshold(threshold, DEFAULT_THRESHOLD)
    user.faceRegisteredAt = utcnow()
    user.updatedAt = utcnow()
    record_audit(
        db, user, action="register_face", module="identidad",
        entity_type="user", entity_id=user.id,
        new_values={"points": user.facePoints, "threshold": user.faceThreshold},
        request=request,
    )
    db.commit()
    db.refresh(user)
    return user


def delete_face_template(db: Session, user: User, request: Request) -> User:
    user.faceTemplate = None
    user.facePoints = None
    user.faceThreshold = None
    user.faceRegisteredAt = None
    user.updatedAt = utcnow()
    record_audit(
        db, user, action="delete_face", module="identidad",
        entity_type="user", entity_id=user.id, request=request,
    )
    db.commit()
    db.refresh(user)
    return user


def verify_face_template(
    db: Session,
    user: User,
    vector: list[float],
    threshold: int | None,
) -> FaceVerifyOut:
    stored = load_face_template(user)
    if stored is None:
        return FaceVerifyOut(
            ok=False, score=0.0,
            threshold=clamp_threshold(threshold, DEFAULT_THRESHOLD),
            points=None, registered=False,
            user=UserOut.model_validate(user),
        )
    try:
        probe = validate_vector(vector)
    except ValueError as exc:
        raise HTTPException(status_code=400, detail=str(exc)) from exc
    effective = clamp_threshold(threshold, user.faceThreshold)
    score = face_score(stored, probe)
    return FaceVerifyOut(
        ok=score_ok(score, effective),
        score=round(score, 4),
        threshold=effective,
        points=user.facePoints,
        registered=True,
        user=UserOut.model_validate(user),
    )


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
