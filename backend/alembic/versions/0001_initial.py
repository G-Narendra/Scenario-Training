"""Initial baseline migration

Revision ID: 0001_initial
Revises:
Create Date: 2026-10-06 00:00:00.000000

"""

from typing import Sequence, Union

revision: str = "0001_initial"
down_revision: Union[str, None] = None
branch_labels: Union[str, Sequence[str], None] = None
depends_on: Union[str, Sequence[str], None] = None


def upgrade() -> None:
    # Baseline migration
    pass


def downgrade() -> None:
    pass
