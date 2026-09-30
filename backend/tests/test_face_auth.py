from __future__ import annotations

import random

from app.services.face import EMBED_DIM, MAX_POINTS, VECTOR_DIM

API = "/api/v1"


def _auth(token: str) -> dict:
    return {"Authorization": f"Bearer {token}"}


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


ADMIN_VECTOR = _vector(1234)
ADMIN_VECTOR_JITTER = _vector(1234, jitter=0.02)
OTHER_VECTOR = _vector(9876)
REGISTER_VECTOR = _vector(5555)


def test_register_with_face(client):
    r = client.post(
        f"{API}/auth/register",
        json={"dni": "77777777", "name": "Rosa Flores", "faceVector": REGISTER_VECTOR, "facePoints": MAX_POINTS},
    )
    assert r.status_code == 200, r.text
    user = r.json()["user"]
    assert user["faceRegistered"] is True
    assert user["facePoints"] == MAX_POINTS
    assert user["faceThreshold"] == 60

    r2 = client.post(f"{API}/auth/login", json={"dni": "77777777"})
    assert r2.status_code == 200
    assert r2.json()["user"]["faceRegistered"] is True


def test_register_rejects_bad_vector(client):
    r = client.post(
        f"{API}/auth/register",
        json={"dni": "77770001", "name": "Vector Corto", "faceVector": [0.1, 0.2]},
    )
    assert r.status_code == 400
    assert str(VECTOR_DIM) in r.json()["message"]


def test_save_face_template(client, admin_token):
    r = client.post(
        f"{API}/auth/face",
        headers=_auth(admin_token),
        json={"vector": ADMIN_VECTOR, "points": 500, "threshold": 10},
    )
    assert r.status_code == 200, r.text
    user = r.json()
    assert user["faceRegistered"] is True
    assert user["facePoints"] == MAX_POINTS, "nunca se guardan más de 400 puntos"
    assert user["faceThreshold"] == 30, "el umbral se recorta al rango 30-85"

    r2 = client.post(
        f"{API}/auth/face",
        headers=_auth(admin_token),
        json={"vector": ADMIN_VECTOR, "points": MAX_POINTS, "threshold": 95},
    )
    assert r2.status_code == 200
    assert r2.json()["faceThreshold"] == 85
    assert r2.json()["facePoints"] == MAX_POINTS


def test_login_face_match_and_mismatch(client):
    r = client.post(f"{API}/auth/login/face", json={"dni": "12345678", "faceVector": ADMIN_VECTOR_JITTER})
    assert r.status_code == 200, r.text
    assert r.json()["user"]["role"] == "admin"

    r2 = client.post(f"{API}/auth/login/face", json={"dni": "12345678", "faceVector": OTHER_VECTOR})
    assert r2.status_code == 400
    assert "no coincide" in r2.json()["message"]


def test_login_face_ignores_saved_threshold(client, admin_token):
    """El umbral guardado (slider de Identidad Facial) NO bloquea el acceso.

    test_save_face_template dejó la plantilla del admin con umbral 85; un rostro
    con confianza ~71% debe poder entrar porque el login usa siempre el corte
    fijo del servidor (DEFAULT_THRESHOLD=60). En Identidad el umbral guardado
    sigue gobernando la verificación.
    """
    from app.services.face import face_score

    mid = [round(a + b, 5) for a, b in zip(ADMIN_VECTOR, OTHER_VECTOR)]
    score = face_score(ADMIN_VECTOR, mid)
    assert 0.60 < score < 0.85, f"el vector intermedio debe caer entre 60 y 85 (score={score:.3f})"

    r = client.post(f"{API}/auth/login/face", json={"dni": "12345678", "faceVector": mid})
    assert r.status_code == 200, "el login facial ignora el umbral guardado del usuario"
    assert r.json()["user"]["dni"] == "12345678"

    v = client.post(
        f"{API}/auth/face/verify",
        headers=_auth(admin_token),
        json={"vector": mid},
    )
    assert v.status_code == 200
    assert v.json()["threshold"] == 85, "en Identidad el umbral guardado sigue activo"
    assert v.json()["ok"] is False


def test_login_face_without_template(client):
    r = client.post(f"{API}/auth/login/face", json={"dni": "22222222", "faceVector": ADMIN_VECTOR})
    assert r.status_code == 400
    assert "no tiene un rostro registrado" in r.json()["message"]


def test_login_face_requires_vector(client):
    """Sin descriptor facial no hay acceso: se elimina el bypass por DNI solo."""
    r = client.post(f"{API}/auth/login/face", json={"dni": "12345678"})
    assert r.status_code == 400
    assert "Escanea tu rostro" in r.json()["message"]

    r2 = client.post(f"{API}/auth/login/face", json={})
    assert r2.status_code == 400
    assert "Escanea tu rostro" in r2.json()["message"]


def test_identify_one_to_many(client, admin_token):
    """La identificación busca en TODO el sistema y devuelve la cuenta más parecida."""
    ok = client.post(
        f"{API}/auth/face/identify",
        headers=_auth(admin_token),
        json={"vector": ADMIN_VECTOR_JITTER},
    )
    assert ok.status_code == 200, ok.text
    body = ok.json()
    assert body["ok"] is True
    assert body["user"]["dni"] == "12345678", "la plantilla más parecida es la propia"
    assert body["compared"] >= 1
    assert body["score"] >= 0.9

    other = client.post(
        f"{API}/auth/face/identify",
        headers=_auth(admin_token),
        json={"vector": REGISTER_VECTOR},
    )
    assert other.status_code == 200, other.text
    ob = other.json()
    assert ob["ok"] is True
    assert ob["user"]["dni"] == "77777777", "encuentra la cuenta ajena más parecida"

    miss = client.post(
        f"{API}/auth/face/identify",
        headers=_auth(admin_token),
        json={"vector": OTHER_VECTOR},
    )
    assert miss.status_code == 200
    mb = miss.json()
    assert mb["ok"] is False, "ninguna plantilla supera el umbral"
    assert mb["user"] is not None, "aun sin coincidencia devuelve la más parecida"
    assert mb["compared"] >= 2


def test_login_face_one_to_many(client):
    r = client.post(f"{API}/auth/login/face", json={"faceVector": ADMIN_VECTOR_JITTER})
    assert r.status_code == 200, r.text
    assert r.json()["user"]["dni"] == "12345678"

    r2 = client.post(f"{API}/auth/login/face", json={"faceVector": REGISTER_VECTOR})
    assert r2.status_code == 200, r2.text
    assert r2.json()["user"]["dni"] == "77777777"

    r3 = client.post(f"{API}/auth/login/face", json={"faceVector": OTHER_VECTOR})
    assert r3.status_code == 400
    assert "Ningún rostro" in r3.json()["message"]


def test_verify_own_face(client, admin_token):
    ok = client.post(
        f"{API}/auth/face/verify",
        headers=_auth(admin_token),
        json={"vector": ADMIN_VECTOR_JITTER},
    )
    assert ok.status_code == 200, ok.text
    body = ok.json()
    assert body["registered"] is True
    assert body["ok"] is True
    assert body["score"] >= 0.9
    assert body["threshold"] == 85
    assert body["user"]["role"] == "admin"

    bad = client.post(
        f"{API}/auth/face/verify",
        headers=_auth(admin_token),
        json={"vector": OTHER_VECTOR},
    )
    assert bad.status_code == 200
    assert bad.json()["ok"] is False
    assert bad.json()["score"] < 0.7


def test_verify_without_template(client, manager_token):
    r = client.post(
        f"{API}/auth/face/verify",
        headers=_auth(manager_token),
        json={"vector": ADMIN_VECTOR},
    )
    assert r.status_code == 200
    assert r.json()["ok"] is False
    assert r.json()["registered"] is False


def test_delete_face_template(client, analyst_token):
    saved = client.post(
        f"{API}/auth/face",
        headers=_auth(analyst_token),
        json={"vector": _vector(31337), "points": 120},
    )
    assert saved.status_code == 200, saved.text
    assert saved.json()["faceRegistered"] is True

    deleted = client.delete(f"{API}/auth/face", headers=_auth(analyst_token))
    assert deleted.status_code == 200
    assert deleted.json()["faceRegistered"] is False

    login = client.post(f"{API}/auth/login/face", json={"dni": "33333333", "faceVector": _vector(31337)})
    assert login.status_code == 400
    assert "no tiene un rostro registrado" in login.json()["message"]


def test_login_face_rejects_bad_vector(client):
    r = client.post(f"{API}/auth/login/face", json={"dni": "12345678", "faceVector": [0.0] * 10})
    assert r.status_code == 400
    assert str(VECTOR_DIM) in r.json()["message"]


def test_embedding_dim_is_embed():
    assert EMBED_DIM == 1024
    assert VECTOR_DIM == EMBED_DIM

