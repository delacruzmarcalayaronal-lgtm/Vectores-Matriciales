"""Registro facial: users.faceTemplate, facePoints, faceThreshold, faceRegisteredAt

Revision ID: c3face001
Revises: b2workertrack01
Create Date: 2026-09-26
"""

from typing import Sequence, Union

import sqlalchemy as sa
from alembic import op

revision: str = "c3face001"
down_revision: Union[str, Sequence[str], None] = "b2workertrack01"
branch_labels: Union[str, Sequence[str], None] = None
depends_on: Union[str, Sequence[str], None] = None


def upgrade() -> None:
    op.add_column("users", sa.Column("faceTemplate", sa.Text(), nullable=True))
    op.add_column("users", sa.Column("facePoints", sa.Integer(), nullable=True))
    op.add_column("users", sa.Column("faceThreshold", sa.Integer(), nullable=True))
    op.add_column("users", sa.Column("faceRegisteredAt", sa.String(length=40), nullable=True))


def downgrade() -> None:
    op.drop_column("users", "faceRegisteredAt")
    op.drop_column("users", "faceThreshold")
    op.drop_column("users", "facePoints")
    op.drop_column("users", "faceTemplate")
