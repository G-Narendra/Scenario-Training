from fastapi import APIRouter, Depends
from sqlalchemy.ext.asyncio import AsyncSession

from backend.app.db.models import User
from backend.app.db.session import get_db
from backend.app.schemas.progress import TraineeProgressResponse
from backend.app.security.deps import get_current_user
from backend.app.services.progress_service import ProgressService

router = APIRouter(prefix="/api/progress", tags=["Progress"])


@router.get("/me", response_model=TraineeProgressResponse)
async def get_my_progress(
    current_user: User = Depends(get_current_user),
    db: AsyncSession = Depends(get_db),
):
    """Retrieve personal training progress, skill radar scores, streaks, and recommended drills."""
    return await ProgressService.get_trainee_progress(db, current_user)
