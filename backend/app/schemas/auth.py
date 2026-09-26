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


class RegisterIn(BaseModel):
    dni: str
    name: str


class RefreshIn(BaseModel):
    refreshToken: str
