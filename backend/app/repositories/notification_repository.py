from __future__ import annotations

from sqlalchemy import select
from sqlalchemy.orm import Session

from ..models import Notification, NotificationRead, utcnow
from ..schemas import NotificationOut, NotificationUpsert
from ..api.helpers import new_id


class NotificationRepository:
    def __init__(self, db: Session) -> None:
        self.db = db

    def list_for_user(self, company_id: str, user_id: str) -> list[NotificationOut]:
        notifications = self.db.scalars(
            select(Notification)
            .where(Notification.companyId == company_id)
            .where((Notification.userId.is_(None)) | (Notification.userId == user_id))
            .order_by(Notification.createdAt.desc())
        ).all()
        reads = {
            r.notificationId: r
            for r in self.db.scalars(
                select(NotificationRead).where(NotificationRead.userId == user_id)
            ).all()
        }
        out: list[NotificationOut] = []
        for n in notifications:
            row = reads.get(n.id)
            out.append(
                NotificationOut(
                    id=n.id,
                    companyId=n.companyId,
                    userId=n.userId,
                    type=n.type,  # type: ignore[arg-type]
                    title=n.title,
                    message=n.message,
                    link=n.link,
                    dedupKey=n.dedupKey,
                    createdAt=n.createdAt,
                    isRead=bool(row and row.readAt),
                    isDismissed=bool(row and row.dismissedAt),
                )
            )
        return out

    def upsert(self, company_id: str, body: NotificationUpsert) -> Notification | None:
        existing = self.db.scalar(
            select(Notification)
            .where(Notification.companyId == company_id)
            .where(Notification.dedupKey == body.dedupKey)
        )
        if existing is not None:
            if existing.title == body.title and existing.message == body.message:
                return existing
            existing.title = body.title
            existing.message = body.message
            existing.link = body.link
            existing.updatedAt = utcnow()
            self.db.add(existing)
            return existing
        notification = Notification(
            id=new_id(),
            companyId=company_id,
            userId=body.userId,
            type=body.type,
            title=body.title,
            message=body.message,
            link=body.link,
            dedupKey=body.dedupKey,
        )
        self.db.add(notification)
        return notification

    def _state(self, notification_id: str, user_id: str) -> NotificationRead:
        row = self.db.scalar(
            select(NotificationRead)
            .where(NotificationRead.notificationId == notification_id)
            .where(NotificationRead.userId == user_id)
        )
        if row is None:
            row = NotificationRead(
                id=new_id(), notificationId=notification_id, userId=user_id
            )
            self.db.add(row)
        return row

    def mark_read(self, notification_id: str, user_id: str) -> None:
        row = self._state(notification_id, user_id)
        if row.readAt is None:
            row.readAt = utcnow()

    def dismiss(self, notification_id: str, user_id: str) -> None:
        row = self._state(notification_id, user_id)
        if row.dismissedAt is None:
            row.dismissedAt = utcnow()
        if row.readAt is None:
            row.readAt = utcnow()

    def read_all(self, company_id: str, user_id: str) -> int:
        notifications = self.db.scalars(
            select(Notification)
            .where(Notification.companyId == company_id)
            .where((Notification.userId.is_(None)) | (Notification.userId == user_id))
        ).all()
        count = 0
        for n in notifications:
            row = self.db.scalar(
                select(NotificationRead)
                .where(NotificationRead.notificationId == n.id)
                .where(NotificationRead.userId == user_id)
            )
            if row is None:
                row = NotificationRead(
                    id=new_id(), notificationId=n.id, userId=user_id, readAt=utcnow()
                )
                self.db.add(row)
                count += 1
            elif row.readAt is None:
                row.readAt = utcnow()
                count += 1
        return count

    def dismiss_all(self, company_id: str, user_id: str) -> int:
        notifications = self.db.scalars(
            select(Notification)
            .where(Notification.companyId == company_id)
            .where((Notification.userId.is_(None)) | (Notification.userId == user_id))
        ).all()
        count = 0
        for n in notifications:
            row = self.db.scalar(
                select(NotificationRead)
                .where(NotificationRead.notificationId == n.id)
                .where(NotificationRead.userId == user_id)
            )
            if row is None:
                row = NotificationRead(
                    id=new_id(),
                    notificationId=n.id,
                    userId=user_id,
                    readAt=utcnow(),
                    dismissedAt=utcnow(),
                )
                self.db.add(row)
                count += 1
            elif row.dismissedAt is None:
                row.dismissedAt = utcnow()
                if row.readAt is None:
                    row.readAt = utcnow()
                count += 1
        return count
