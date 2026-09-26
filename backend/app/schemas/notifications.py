from __future__ import annotations

from typing import Literal

from pydantic import BaseModel, ConfigDict

NotificationType = Literal["stock", "target", "operation", "system", "sales", "security"]


class NotificationOut(BaseModel):
    model_config = ConfigDict(from_attributes=True)

    id: str
    companyId: str
    userId: str | None = None
    type: NotificationType
    title: str
    message: str
    link: str
    dedupKey: str = ""
    createdAt: str
    isRead: bool = False
    isDismissed: bool = False


class NotificationUpsert(BaseModel):
    type: NotificationType = "system"
    title: str
    message: str = ""
    link: str = "/dashboard"
    dedupKey: str
    userId: str | None = None
