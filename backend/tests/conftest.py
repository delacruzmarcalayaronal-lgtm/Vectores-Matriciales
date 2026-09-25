from __future__ import annotations

import os
from pathlib import Path

import pytest

TEST_DB = Path(__file__).resolve().parent / "test_matrixflow.db"

os.environ["DATABASE_URL"] = f"sqlite:///{TEST_DB.as_posix()}"


def _fresh_db() -> None:
    try:
        if TEST_DB.exists():
            TEST_DB.unlink()
    except PermissionError:
        pass


def _dispose_engine() -> None:
    try:
        from app.db import engine

        engine.dispose()
    except Exception:
        pass


@pytest.fixture(scope="session")
def client():
    _fresh_db()
    from fastapi.testclient import TestClient

    from app.main import app

    with TestClient(app) as test_client:
        yield test_client
    _dispose_engine()
    _fresh_db()


@pytest.fixture(scope="session")
def admin_token(client) -> str:
    r = client.post("/api/v1/auth/login", json={"dni": "12345678"})
    assert r.status_code == 200, r.text
    return r.json()["accessToken"]


@pytest.fixture(scope="session")
def analyst_token(client) -> str:
    r = client.post("/api/v1/auth/login", json={"dni": "33333333"})
    assert r.status_code == 200, r.text
    return r.json()["accessToken"]


@pytest.fixture(scope="session")
def operator_token(client) -> str:
    r = client.post("/api/v1/auth/login", json={"dni": "44444444"})
    assert r.status_code == 200, r.text
    return r.json()["accessToken"]


@pytest.fixture(scope="session")
def manager_token(client) -> str:
    r = client.post("/api/v1/auth/login", json={"dni": "22222222"})
    assert r.status_code == 200, r.text
    return r.json()["accessToken"]
