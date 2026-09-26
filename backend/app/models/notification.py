from __future__ import annotations

from sqlalchemy import ForeignKey, String, Text
from sqlalchemy.orm import Mapped, mapped_column, relationship

from .base import Base, utcnow


class Notification(Base):
    __tablename__ = "notifications"

    id: Mapped[str] = mapped_column(String(40), primary_key=True)
    companyId: Mapped[str] = mapped_column(String(40), index=True)
    userId: Mapped[str | None] = mapped_column(String(40), nullable=True, index=True)
    type: Mapped[str] = mapped_column(String(40), default="system")
    title: Mapped[str] = mapped_column(String(160))
    message: Mapped[str] = mapped_column(Text, default="")
    link: Mapped[str] = mapped_column(String(255), default="/dashboard")
    dedupKey: Mapped[str] = mapped_column(String(120), default="")
    createdAt: Mapped[str] = mapped_column(String(40), default=utcnow, index=True)
    updatedAt: Mapped[str] = mapped_column(String(40), default=utcnow)

    reads: Mapped[list["NotificationRead"]] = relationship(
        "NotificationRead",
        back_populates="notification",
        cascade="all, delete-orphan",
        lazy="selectin",
    )


class NotificationRead(Base):
    __tablename__ = "notification_reads"

    id: Mapped[str] = mapped_column(String(40), primary_key=True)
    notificationId: Mapped[str] = mapped_column(
        String(40), ForeignKey("notifications.id"), index=True
    )
    userId: Mapped[str] = mapped_column(String(40), index=True)
    readAt: Mapped[str | None] = mapped_column(String(40), nullable=True)
    dismissedAt: Mapped[str | None] = mapped_column(String(40), nullable=True)
    createdAt: Mapped[str] = mapped_column(String(40), default=utcnow)

    notification: Mapped["Notification"] = relationship("Notification", back_populates="reads")
