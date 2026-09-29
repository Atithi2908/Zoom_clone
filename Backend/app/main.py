import os
from contextlib import asynccontextmanager
from fastapi import FastAPI
from fastapi.middleware.cors import CORSMiddleware

from .database import engine, Base, SessionLocal
from .models import Meeting, Participant
from .routes import meetings, websocket, auth

# Lifespan event to create tables and seed initial data automatically
@asynccontextmanager
async def lifespan(app: FastAPI):
    # Create SQLite database tables if not created
    Base.metadata.create_all(bind=engine)
    yield

app = FastAPI(
    title="Zoom Clone API",
    description="Backend API for Zoom Clone Web Conferencing Platform",
    version="1.0.0",
    lifespan=lifespan
)

# Production-safe CORS middleware using configured FRONTEND_URL
frontend_env = os.getenv("FRONTEND_URL", "http://localhost:3000")
cors_origins = [u.strip().rstrip("/") for u in frontend_env.split(",") if u.strip()]
for dev_origin in ["http://localhost:3000", "http://127.0.0.1:3000"]:
    if dev_origin not in cors_origins:
        cors_origins.append(dev_origin)

app.add_middleware(
    CORSMiddleware,
    allow_origins=cors_origins,
    allow_credentials=True,
    allow_methods=["*"],
    allow_headers=["*"],
)

# Register API and WebSocket routers
app.include_router(auth.router)
app.include_router(meetings.router)
app.include_router(websocket.router)

@app.get("/")
def root():
    return {
        "service": "Zoom Clone API",
        "status": "online",
        "docs_url": "/docs"
    }

@app.get("/health")
def health_check():
    return {"status": "healthy"}
