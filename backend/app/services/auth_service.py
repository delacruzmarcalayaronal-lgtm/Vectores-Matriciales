from __future__ import annotations

import json

from fastapi import HTTPException, Request
from sqlalchemy import select
from sqlalchemy.orm import Session

from ..api.helpers import new_id
from ..core.security import JWTError, create_access_token, create_refresh_token, decode_token
from ..models import Company, User, utcnow
from ..schemas import AuthResponse, FaceIdentifyOut, FaceVerifyOut, UserOut
from .audit import record_audit
from .face import (
    DEFAULT_THRESHOLD,
    FACE_TEMPLATE_VERSION,
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

    # El acceso facial siempre exige una captura real: sin descriptor no hay
    # comparación posible y se rechaza (el acceso por DNI es /auth/login).
    if face_vector is None:
        raise HTTPException(
            status_code=400,
            detail=(
                "Escanea tu rostro con la cámara para entrar. El acceso facial "
                "compara tu captura con las plantillas registradas antes de dejar pasar."
            ),
        )

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
            if user.faceTemplate:
                raise HTTPException(
                    status_code=400,
                    detail=(
                        "Tu rostro quedó en una versión anterior del escáner y ya no "
                        "es válido. Vuelve a registrarlo en Identidad Facial."
                    ),
                )
            raise HTTPException(
                status_code=400,
                detail="Este DNI no tiene un rostro registrado. Regístralo en Identidad Facial.",
            )
        # El umbral configurable (slider de Identidad Facial) solo gobierna la
        # verificación dentro de la sesión: registro y login usan siempre el
        # corte fijo del servidor para no bloquear el acceso por un ajuste.
        threshold = DEFAULT_THRESHOLD
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
    threshold = DEFAULT_THRESHOLD
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
            cleaned = validate_vector(face_vector)
        except ValueError as exc:
            raise HTTPException(status_code=400, detail=str(exc)) from exc
        template_json = json.dumps({"v": FACE_TEMPLATE_VERSION, "d": cleaned})
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
    """Lee la plantilla vigente (formato {"v": 3, "d": [...]}: embedding 1024-d).

    Los formatos anteriores (v1/v2, y la lista plana sin versión) quedan
    invalidados a propósito: el descriptor cambió de diseño y esas plantillas
    ya no son comparables, así que el usuario debe volver a registrar su rostro.
    """
    if not user.faceTemplate:
        return None
    try:
        data = json.loads(user.faceTemplate)
        if not isinstance(data, dict) or int(data.get("v", 0)) != FACE_TEMPLATE_VERSION:
            return None
        return [float(x) for x in data["d"]]
    except (ValueError, TypeError, KeyError, json.JSONDecodeError):
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
        cleaned = validate_vector(vector)
    except ValueError as exc:
        raise HTTPException(status_code=400, detail=str(exc)) from exc
    user.faceTemplate = json.dumps({"v": FACE_TEMPLATE_VERSION, "d": cleaned})
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


def identify_face_template(
    db: Session,
    user: User,
    vector: list[float],
    threshold: int | None,
) -> FaceIdentifyOut:
    """Identificación 1:N: busca en TODO el sistema la plantilla más parecida.

    Compara la captura contra todos los rostros registrados (usuarios activos
    con plantilla) y devuelve la cuenta más parecida. Si el puntaje supera el
    umbral (el de la petición o, si no viene, el de la cuenta hallada), la
    identificación es exitosa; si no, se devuelve igual la más parecida para
    que la interfaz pueda mostrarla.
    """
    try:
        probe = validate_vector(vector)
    except ValueError as exc:
        raise HTTPException(status_code=400, detail=str(exc)) from exc

    candidates = db.scalars(
        select(User).where(User.faceTemplate.is_not(None), User.isActive.is_(True))
    ).all()
    best: User | None = None
    best_score = -1.0
    compared = 0
    for candidate in candidates:
        stored = load_face_template(candidate)
        if stored is None:
            continue
        compared += 1
        score = face_score(stored, probe)
        # A igual puntaje gana la cuenta propia (empate estable y determinista).
        if score > best_score or (score == best_score and best is not None and candidate.id == user.id):
            best, best_score = candidate, score

    if best is None:
        return FaceIdentifyOut(
            ok=False, score=0.0,
            threshold=clamp_threshold(threshold, DEFAULT_THRESHOLD),
            points=None, registered=user.faceRegistered, compared=0,
            user=None,
        )

    effective = clamp_threshold(threshold, best.faceThreshold)
    return FaceIdentifyOut(
        ok=score_ok(best_score, effective),
        score=round(best_score, 4),
        threshold=effective,
        points=best.facePoints,
        registered=user.faceRegistered,
        compared=compared,
        user=UserOut.model_validate(best),
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
