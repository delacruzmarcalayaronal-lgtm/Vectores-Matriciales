from __future__ import annotations

import random

from app.services.face import GEOM_DIM, MAX_POINTS, VECTOR_DIM

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
    assert user["faceThreshold"] == 50

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
    assert user["faceThreshold"] == 30, "el umbral se recorta al rango 30-70"

    r2 = client.post(
        f"{API}/auth/face",
        headers=_auth(admin_token),
        json={"vector": ADMIN_VECTOR, "points": MAX_POINTS, "threshold": 95},
    )
    assert r2.status_code == 200
    assert r2.json()["faceThreshold"] == 70
    assert r2.json()["facePoints"] == MAX_POINTS


def test_login_face_match_and_mismatch(client):
    r = client.post(f"{API}/auth/login/face", json={"dni": "12345678", "faceVector": ADMIN_VECTOR_JITTER})
    assert r.status_code == 200, r.text
    assert r.json()["user"]["role"] == "admin"

    r2 = client.post(f"{API}/auth/login/face", json={"dni": "12345678", "faceVector": OTHER_VECTOR})
    assert r2.status_code == 400
    assert "no coincide" in r2.json()["message"]


def test_login_face_without_template(client):
    r = client.post(f"{API}/auth/login/face", json={"dni": "22222222", "faceVector": ADMIN_VECTOR})
    assert r.status_code == 400
    assert "no tiene un rostro registrado" in r.json()["message"]


def test_login_face_legacy_without_vector(client):
    r = client.post(f"{API}/auth/login/face", json={"dni": "12345678"})
    assert r.status_code == 200
    assert r.json()["user"]["role"] == "admin"

    r2 = client.post(f"{API}/auth/login/face", json={})
    assert r2.status_code == 200
    assert r2.json()["user"]["role"] == "admin"


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
    assert body["threshold"] == 70
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


def test_geometry_split_is_reserved():
    assert GEOM_DIM == 400 * 3
    assert VECTOR_DIM == GEOM_DIM + 24 * 24

