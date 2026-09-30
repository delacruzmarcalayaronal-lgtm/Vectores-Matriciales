from __future__ import annotations

import json
import random

from sqlalchemy import select

from app.core.database import SessionLocal
from app.models import User
from app.services.auth_service import load_face_template
from app.services.face import (
    DEFAULT_THRESHOLD,
    EMBED_DIM,
    MAX_THRESHOLD,
    MIN_THRESHOLD,
    VECTOR_DIM,
    clamp_threshold,
    face_score,
    score_ok,
    validate_vector,
)

API = "/api/v1"


def _vector(seed: int, jitter: float = 0.0) -> list[float]:
    rng = random.Random(seed)
    noise = random.Random(seed + 1)
    out: list[float] = []
    for _ in range(VECTOR_DIM):
        value = rng.uniform(-1.0, 1.0)
        if jitter:
            value += noise.uniform(-jitter, jitter)
        out.append(round(value, 5))
    return out


BASE = _vector(4242)
BASE_JITTER = _vector(4242, jitter=0.02)
OTHER = _vector(7777)


def test_threshold_range_v3():
    assert (MIN_THRESHOLD, MAX_THRESHOLD, DEFAULT_THRESHOLD) == (30, 85, 60)
    assert clamp_threshold(95) == 85
    assert clamp_threshold(10) == 30
    assert clamp_threshold(None) == 60
    assert clamp_threshold(None, 40) == 40


def test_score_orders_genuine_over_impostor():
    """El coseno del embedding separa de verdad: la misma persona con ruido
    pasa holgadamente, una ajena queda al piso."""
    genuine = face_score(BASE, BASE_JITTER)
    impostor = face_score(BASE, OTHER)
    assert genuine >= 0.8, f"misma persona debe puntuar alto (dio {genuine:.3f})"
    assert impostor <= 0.3, f"persona ajena debe quedar al piso (dio {impostor:.3f})"
    assert genuine - impostor >= 0.5
    assert face_score(BASE, BASE) >= 0.999
    assert score_ok(genuine, DEFAULT_THRESHOLD) is True
    assert score_ok(impostor, 30) is False


def test_score_zero_on_bad_dims():
    assert face_score([0.0] * 10, BASE) == 0.0
    assert face_score(BASE, [0.0] * 10) == 0.0


def test_load_template_v3_and_legacy():
    user = User(id="t-legacy", companyId="1", name="Legacy", dni="00000000", role="operator")
    user.faceTemplate = json.dumps({"v": 3, "d": BASE})
    assert load_face_template(user) == BASE

    user.faceTemplate = json.dumps({"v": 2, "d": BASE})
    assert load_face_template(user) is None, "la versión anterior de plantilla ya no vale"

    user.faceTemplate = json.dumps(BASE)
    assert load_face_template(user) is None, "la lista plana es aún más vieja y tampoco vale"

    user.faceTemplate = "no-es-json"
    assert load_face_template(user) is None

    user.faceTemplate = None
    assert load_face_template(user) is None


def test_validate_vector_keeps_dim():
    cleaned = validate_vector(_vector(9))
    assert len(cleaned) == VECTOR_DIM
    assert EMBED_DIM == 1024


def test_legacy_template_login_demands_reregistration(client, admin_token):
    """Una plantilla de versión anterior guardada en BD no autentica: exige re-registro."""
    db = SessionLocal()
    try:
        user = db.scalar(select(User).where(User.dni == "12345678"))
        assert user is not None
        saved = user.faceTemplate
        user.faceTemplate = json.dumps({"v": 2, "d": BASE})
        db.commit()
        r = client.post(f"{API}/auth/login/face", json={"dni": "12345678", "faceVector": BASE})
        assert r.status_code == 400
        assert "versión anterior" in r.json()["message"]
    finally:
        db.rollback()
        user.faceTemplate = saved
        db.commit()
        db.close()
