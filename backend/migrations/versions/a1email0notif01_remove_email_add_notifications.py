"""remove email, add notifications

Revision ID: a1email0notif01
Revises: 9fd9f9fb6d8d
Create Date: 2026-09-26 12:00:00.000000

"""
from typing import Sequence, Union

from alembic import op
import sqlalchemy as sa


# revision identifiers, used by Alembic.
revision: str = 'a1email0notif01'
down_revision: Union[str, Sequence[str], None] = '9fd9f9fb6d8d'
branch_labels: Union[str, Sequence[str], None] = None
depends_on: Union[str, Sequence[str], None] = None


def upgrade() -> None:
    """Upgrade schema."""
    with op.batch_alter_table('users') as batch_op:
        batch_op.drop_column('email')
    with op.batch_alter_table('companies') as batch_op:
        batch_op.drop_column('email')
    with op.batch_alter_table('branches') as batch_op:
        batch_op.drop_column('email')

    op.create_table(
        'notifications',
        sa.Column('id', sa.String(length=40), nullable=False),
        sa.Column('companyId', sa.String(length=40), nullable=False),
        sa.Column('userId', sa.String(length=40), nullable=True),
        sa.Column('type', sa.String(length=40), nullable=False),
        sa.Column('title', sa.String(length=160), nullable=False),
        sa.Column('message', sa.Text(), nullable=False),
        sa.Column('link', sa.String(length=255), nullable=False),
        sa.Column('dedupKey', sa.String(length=120), nullable=False),
        sa.Column('createdAt', sa.String(length=40), nullable=False),
        sa.Column('updatedAt', sa.String(length=40), nullable=False),
        sa.PrimaryKeyConstraint('id'),
    )
    op.create_index('ix_notifications_companyId', 'notifications', ['companyId'])
    op.create_index('ix_notifications_dedup', 'notifications', ['companyId', 'dedupKey'], unique=True)

    op.create_table(
        'notification_reads',
        sa.Column('id', sa.String(length=40), nullable=False),
        sa.Column('notificationId', sa.String(length=40), nullable=False),
        sa.Column('userId', sa.String(length=40), nullable=False),
        sa.Column('readAt', sa.String(length=40), nullable=True),
        sa.Column('dismissedAt', sa.String(length=40), nullable=True),
        sa.Column('createdAt', sa.String(length=40), nullable=False),
        sa.PrimaryKeyConstraint('id'),
        sa.ForeignKeyConstraint(['notificationId'], ['notifications.id']),
    )
    op.create_index('ix_notification_reads_notificationId', 'notification_reads', ['notificationId'])
    op.create_index('ix_notification_reads_userId', 'notification_reads', ['userId'])
    op.create_index(
        'ix_notification_reads_unique',
        'notification_reads',
        ['notificationId', 'userId'],
        unique=True,
    )


def downgrade() -> None:
    """Downgrade schema."""
    op.drop_index('ix_notification_reads_unique', table_name='notification_reads')
    op.drop_index('ix_notification_reads_userId', table_name='notification_reads')
    op.drop_index('ix_notification_reads_notificationId', table_name='notification_reads')
    op.drop_table('notification_reads')
    op.drop_index('ix_notifications_dedup', table_name='notifications')
    op.drop_index('ix_notifications_companyId', table_name='notifications')
    op.drop_table('notifications')

    with op.batch_alter_table('branches') as batch_op:
        batch_op.add_column(sa.Column('email', sa.String(length=120), nullable=True))
    with op.batch_alter_table('companies') as batch_op:
        batch_op.add_column(sa.Column('email', sa.String(length=120), nullable=True))
    with op.batch_alter_table('users') as batch_op:
        batch_op.add_column(sa.Column('email', sa.String(length=120), nullable=True))
