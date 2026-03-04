"""FastAPI application entry point for Cinemachine backend."""

import logging
from contextlib import asynccontextmanager
from uuid import UUID

from fastapi import FastAPI, WebSocket
from fastapi.middleware.cors import CORSMiddleware

from app.config import settings
from app.database import close_pool, create_pool
from app.routers import auth, export, kids, profile, shots, stories
from app.services.gemini_live import handle_voice_session

logging.basicConfig(
    level=logging.INFO,
    format="%(asctime)s [%(levelname)s] %(name)s: %(message)s",
)
logger = logging.getLogger(__name__)


@asynccontextmanager
async def lifespan(app: FastAPI):
    """Manage startup and shutdown of shared resources."""
    # Startup
    logger.info("Starting Cinemachine backend")
    await create_pool()
    yield
    # Shutdown
    logger.info("Shutting down Cinemachine backend")
    await close_pool()


app = FastAPI(
    title="Cinemachine API",
    description="Backend API for the Cinemachine kid-friendly movie-making app.",
    version="0.1.0",
    lifespan=lifespan,
    redirect_slashes=False,
)

# ---------------------------------------------------------------------------
# CORS middleware
# ---------------------------------------------------------------------------
origins = [o.strip() for o in settings.ALLOWED_ORIGINS.split(",")]
app.add_middleware(
    CORSMiddleware,
    allow_origins=origins,
    allow_credentials=True,
    allow_methods=["*"],
    allow_headers=["*"],
)

# ---------------------------------------------------------------------------
# Include routers
# ---------------------------------------------------------------------------
app.include_router(auth.router)
app.include_router(kids.router)
app.include_router(stories.router)
app.include_router(shots.router)
app.include_router(profile.router)
app.include_router(export.router)


# ---------------------------------------------------------------------------
# Health check
# ---------------------------------------------------------------------------
@app.get("/", tags=["health"])
async def root() -> dict:
    """Health check endpoint."""
    return {"status": "ok", "service": "cinemachine-api"}


# ---------------------------------------------------------------------------
# WebSocket route for Gemini Live voice sessions
# ---------------------------------------------------------------------------
@app.websocket("/ws/voice/{kid_id}")
async def voice_websocket(websocket: WebSocket, kid_id: UUID) -> None:
    """WebSocket endpoint for real-time voice interaction with Gemini Live.

    The mobile app connects here to stream audio to/from the Gemini Live
    API, receiving both audio responses and JSON control messages for
    the recording flow.
    """
    await handle_voice_session(websocket, kid_id)
