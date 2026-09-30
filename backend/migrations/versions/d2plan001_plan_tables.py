"""Plan Maestro: tablas roles, vector_values, matrix_values, operation_inputs,
operation_results (modelo de datos Fase 3/Fase 4 del plan)

Revision ID: d2plan001
Revises: c3face001
Create Date: 2026-09-29
"""

from typing import Sequence, Union

import sqlalchemy as sa
from alembic import op

revision: str = "d2plan001"
down_revision: Union[str, Sequence[str], None] = "c3face001"
branch_labels: Union[str, Sequence[str], None] = None
depends_on: Union[str, Sequence[str], None] = None


def upgrade() -> None:
    op.create_table(
        "roles",
        sa.Column("id", sa.String(length=40), nullable=False),
        sa.Column("name", sa.String(length=60), nullable=False),
        sa.Column("label", sa.String(length=80), nullable=False),
        sa.Column("description", sa.Text(), nullable=False),
        sa.Column("permissions", sa.JSON(), nullable=False),
        sa.Column("createdAt", sa.String(length=40), nullable=False),
        sa.PrimaryKeyConstraint("id"),
    )
    op.create_index("ix_roles_name", "roles", ["name"], unique=True)

    op.create_table(
        "vector_values",
        sa.Column("id", sa.String(length=40), nullable=False),
        sa.Column("vectorId", sa.String(length=40), sa.ForeignKey("vectors.id"), nullable=False),
        sa.Column("position", sa.Integer(), nullable=False),
        sa.Column("value", sa.Float(), nullable=False),
        sa.PrimaryKeyConstraint("id"),
    )
    op.create_index("ix_vector_values_vectorId", "vector_values", ["vectorId"])

    op.create_table(
        "matrix_values",
        sa.Column("id", sa.String(length=40), nullable=False),
        sa.Column("matrixId", sa.String(length=40), sa.ForeignKey("matrices.id"), nullable=False),
        sa.Column("row", sa.Integer(), nullable=False),
        sa.Column("col", sa.Integer(), nullable=False),
        sa.Column("value", sa.Float(), nullable=False),
        sa.PrimaryKeyConstraint("id"),
    )
    op.create_index("ix_matrix_values_matrixId", "matrix_values", ["matrixId"])

    op.create_table(
        "operation_inputs",
        sa.Column("id", sa.String(length=40), nullable=False),
        sa.Column("operationId", sa.String(length=40), sa.ForeignKey("operations.id"), nullable=False),
        sa.Column("position", sa.Integer(), nullable=False),
        sa.Column("kind", sa.String(length=20), nullable=False),
        sa.Column("refId", sa.String(length=40), nullable=False),
        sa.Column("label", sa.String(length=160), nullable=False),
        sa.Column("values", sa.JSON(), nullable=False),
        sa.Column("createdAt", sa.String(length=40), nullable=False),
        sa.PrimaryKeyConstraint("id"),
    )
    op.create_index("ix_operation_inputs_operationId", "operation_inputs", ["operationId"])

    op.create_table(
        "operation_results",
        sa.Column("id", sa.String(length=40), nullable=False),
        sa.Column("operationId", sa.String(length=40), sa.ForeignKey("operations.id"), nullable=False),
        sa.Column("kind", sa.String(length=20), nullable=False),
        sa.Column("refId", sa.String(length=40), nullable=True),
        sa.Column("values", sa.JSON(), nullable=False),
        sa.Column("createdAt", sa.String(length=40), nullable=False),
        sa.PrimaryKeyConstraint("id"),
    )
    op.create_index("ix_operation_results_operationId", "operation_results", ["operationId"])


def downgrade() -> None:
    op.drop_index("ix_operation_results_operationId", table_name="operation_results")
    op.drop_table("operation_results")
    op.drop_index("ix_operation_inputs_operationId", table_name="operation_inputs")
    op.drop_table("operation_inputs")
    op.drop_index("ix_matrix_values_matrixId", table_name="matrix_values")
    op.drop_table("matrix_values")
    op.drop_index("ix_vector_values_vectorId", table_name="vector_values")
    op.drop_table("vector_values")
    op.drop_index("ix_roles_name", table_name="roles")
    op.drop_table("roles")
