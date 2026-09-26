from __future__ import annotations

from typing import Literal

from pydantic import BaseModel, ConfigDict

Role = Literal["admin", "manager", "analyst", "operator"]


class UserOut(BaseModel):
    model_config = ConfigDict(from_attributes=True)

    id: str
    name: str
    dni: str | None = None
    role: Role
    avatar: str | None = None
    companyId: str
    createdAt: str
    updatedAt: str


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


class UserCreate(BaseModel):
    name: str
    password: str
    dni: str | None = None
    role: Role = "operator"
    avatar: str | None = None
    isActive: bool = True


class UserUpdate(BaseModel):
    name: str | None = None
    dni: str | None = None
    role: Role | None = None
    avatar: str | None = None
    isActive: bool | None = None
    password: str | None = None


class MeUpdate(BaseModel):
    name: str | None = None
    role: Role | None = None
    avatar: str | None = None
