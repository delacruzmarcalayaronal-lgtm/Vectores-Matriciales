"""Módulo de rastreo: workers, worker_locations, consent_logs, users.trackingEnabled

Revision ID: b2workertrack01
Revises: a1email0notif01
Create Date: 2026-09-26
"""

from typing import Sequence, Union

import sqlalchemy as sa
from alembic import op

revision: str = "b2workertrack01"
down_revision: Union[str, Sequence[str], None] = "a1email0notif01"
branch_labels: Union[str, Sequence[str], None] = None
depends_on: Union[str, Sequence[str], None] = None


def upgrade() -> None:
    op.create_table(
        "workers",
        sa.Column("id", sa.String(length=40), nullable=False),
        sa.Column("userId", sa.String(length=40), nullable=False),
        sa.Column("employeeCode", sa.String(length=50), nullable=False),
        sa.Column("position", sa.String(length=100), nullable=False),
        sa.Column("department", sa.String(length=100), nullable=False),
        sa.Column("hireDate", sa.String(length=40), nullable=True),
        sa.Column("isActive", sa.Boolean(), nullable=False),
        sa.Column("createdAt", sa.String(length=40), nullable=False),
        sa.ForeignKeyConstraint(["userId"], ["users.id"]),
        sa.PrimaryKeyConstraint("id"),
    )
    op.create_index("ix_workers_userId", "workers", ["userId"], unique=True)
    op.create_index("ix_workers_employeeCode", "workers", ["employeeCode"], unique=True)

    op.create_table(
        "worker_locations",
        sa.Column("id", sa.String(length=40), nullable=False),
        sa.Column("workerId", sa.String(length=40), nullable=False),
        sa.Column("latitude", sa.Float(), nullable=False),
        sa.Column("longitude", sa.Float(), nullable=False),
        sa.Column("accuracy", sa.Float(), nullable=True),
        sa.Column("speed", sa.Float(), nullable=True),
        sa.Column("heading", sa.Float(), nullable=True),
        sa.Column("batteryLevel", sa.Integer(), nullable=True),
        sa.Column("isWithinGeofence", sa.Boolean(), nullable=False),
        sa.Column("recordedAt", sa.String(length=40), nullable=False),
        sa.Column("createdAt", sa.String(length=40), nullable=False),
        sa.ForeignKeyConstraint(["workerId"], ["workers.id"]),
        sa.PrimaryKeyConstraint("id"),
    )
    op.create_index("ix_worker_locations_workerId", "worker_locations", ["workerId"])
    op.create_index("ix_worker_locations_recordedAt", "worker_locations", ["recordedAt"])
    op.create_index(
        "ix_worker_locations_worker_recorded",
        "worker_locations",
        ["workerId", "recordedAt"],
    )

    op.create_table(
        "consent_logs",
        sa.Column("id", sa.String(length=40), nullable=False),
        sa.Column("workerId", sa.String(length=40), nullable=False),
        sa.Column("consentStatus", sa.String(length=20), nullable=False),
        sa.Column("consentVersion", sa.String(length=20), nullable=False),
        sa.Column("ipAddress", sa.String(length=45), nullable=True),
        sa.Column("userAgent", sa.String(length=500), nullable=True),
        sa.Column("consentedAt", sa.String(length=40), nullable=False),
        sa.ForeignKeyConstraint(["workerId"], ["workers.id"]),
        sa.PrimaryKeyConstraint("id"),
    )
    op.create_index("ix_consent_logs_workerId", "consent_logs", ["workerId"])
    op.create_index("ix_consent_logs_consentedAt", "consent_logs", ["consentedAt"])

    op.add_column(
        "users",
        sa.Column("trackingEnabled", sa.Boolean(), nullable=False, server_default=sa.false()),
    )


def downgrade() -> None:
    op.drop_column("users", "trackingEnabled")
    op.drop_index("ix_consent_logs_consentedAt", table_name="consent_logs")
    op.drop_index("ix_consent_logs_workerId", table_name="consent_logs")
    op.drop_table("consent_logs")
    op.drop_index("ix_worker_locations_worker_recorded", table_name="worker_locations")
    op.drop_index("ix_worker_locations_recordedAt", table_name="worker_locations")
    op.drop_index("ix_worker_locations_workerId", table_name="worker_locations")
    op.drop_table("worker_locations")
    op.drop_index("ix_workers_employeeCode", table_name="workers")
    op.drop_index("ix_workers_userId", table_name="workers")
    op.drop_table("workers")
