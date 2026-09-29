from __future__ import annotations

from pydantic import BaseModel

from .user import UserOut


class AuthResponse(BaseModel):
    user: UserOut
    accessToken: str
    refreshToken: str


class LoginIn(BaseModel):
    dni: str


class LoginFaceIn(BaseModel):
    dni: str | None = None
    faceVector: list[float] | None = None


class RegisterIn(BaseModel):
    dni: str
    name: str
    faceVector: list[float] | None = None
    facePoints: int | None = None


class FaceSaveIn(BaseModel):
    vector: list[float]
    points: int | None = None
    threshold: int | None = None


class FaceVerifyIn(BaseModel):
    vector: list[float]
    threshold: int | None = None


class FaceVerifyOut(BaseModel):
    ok: bool
    score: float
    threshold: int
    points: int | None = None
    registered: bool = False
    user: UserOut | None = None


class FaceIdentifyIn(BaseModel):
    vector: list[float]
    threshold: int | None = None


class FaceIdentifyOut(BaseModel):
    ok: bool
    score: float
    threshold: int
    points: int | None = None
    registered: bool = False
    compared: int = 0
    user: UserOut | None = None


class RefreshIn(BaseModel):
    refreshToken: str
