from __future__ import annotations

from fastapi import APIRouter, Depends
from sqlalchemy.orm import Session

from ...core.deps import ensure_company, get_current_user
from ...db import get_db
from ...models import User
from ...repositories.notification_repository import NotificationRepository
from ...schemas import NotificationOut, NotificationUpsert

router = APIRouter(tags=["notifications"])


@router.get("/companies/{company_id}/notifications", response_model=list[NotificationOut])
def list_notifications(
    company_id: str,
    user: User = Depends(get_current_user),
    db: Session = Depends(get_db),
) -> list[NotificationOut]:
    ensure_company(user, company_id)
    repo = NotificationRepository(db)
    rows = repo.list_for_user(company_id, user.id)
    db.commit()
    return [n for n in rows if not n.isDismissed]


@router.post("/companies/{company_id}/notifications", response_model=NotificationOut, status_code=201)
def upsert_notification(
    company_id: str,
    body: NotificationUpsert,
    user: User = Depends(get_current_user),
    db: Session = Depends(get_db),
) -> NotificationOut:
    ensure_company(user, company_id)
    repo = NotificationRepository(db)
    notification = repo.upsert(company_id, body)
    db.commit()
    assert notification is not None
    return NotificationOut(
        id=notification.id,
        companyId=notification.companyId,
        userId=notification.userId,
        type=notification.type,  # type: ignore[arg-type]
        title=notification.title,
        message=notification.message,
        link=notification.link,
        dedupKey=notification.dedupKey,
        createdAt=notification.createdAt,
        isRead=False,
        isDismissed=False,
    )


@router.post("/notifications/{notification_id}/read", response_model=dict)
def mark_read(
    notification_id: str,
    user: User = Depends(get_current_user),
    db: Session = Depends(get_db),
) -> dict:
    repo = NotificationRepository(db)
    repo.mark_read(notification_id, user.id)
    db.commit()
    return {"message": "Notificación marcada como leída"}


@router.post("/notifications/{notification_id}/dismiss", response_model=dict)
def dismiss(
    notification_id: str,
    user: User = Depends(get_current_user),
    db: Session = Depends(get_db),
) -> dict:
    repo = NotificationRepository(db)
    repo.dismiss(notification_id, user.id)
    db.commit()
    return {"message": "Notificación descartada"}


@router.post("/companies/{company_id}/notifications/read-all", response_model=dict)
def read_all(
    company_id: str,
    user: User = Depends(get_current_user),
    db: Session = Depends(get_db),
) -> dict:
    ensure_company(user, company_id)
    repo = NotificationRepository(db)
    count = repo.read_all(company_id, user.id)
    db.commit()
    return {"message": "Notificaciones marcadas como leídas", "count": count}


@router.post("/companies/{company_id}/notifications/dismiss-all", response_model=dict)
def dismiss_all(
    company_id: str,
    user: User = Depends(get_current_user),
    db: Session = Depends(get_db),
) -> dict:
    ensure_company(user, company_id)
    repo = NotificationRepository(db)
    count = repo.dismiss_all(company_id, user.id)
    db.commit()
    return {"message": "Notificaciones descartadas", "count": count}
