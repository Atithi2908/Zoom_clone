from contextlib import asynccontextmanager
from fastapi import FastAPI
from fastapi.middleware.cors import CORSMiddleware

from .database import engine, Base, SessionLocal
from .models import Meeting, Participant
from .routes import meetings, websocket

# Lifespan event to create tables and seed initial data automatically
@asynccontextmanager
async def lifespan(app: FastAPI):
    # Create SQLite database tables if not created
    Base.metadata.create_all(bind=engine)
    
    # Auto-seed sample meetings if the database is empty
    db = SessionLocal()
    try:
        try:
            from seed import seed_initial_data
        except ImportError:
            from ..seed import seed_initial_data
        seed_initial_data(db)
    except Exception as e:
        print(f"[Seed Warning] Could not seed database on startup: {e}")
    finally:
        db.close()

    yield

app = FastAPI(
    title="Zoom Clone API",
    description="Backend API for Zoom Clone Web Conferencing Platform",
    version="1.0.0",
    lifespan=lifespan
)

# CORS middleware for Next.js frontend communication
app.add_middleware(
    CORSMiddleware,
    allow_origins=["*"],  # Allows all origins for local development and deployment
    allow_credentials=True,
    allow_methods=["*"],
    allow_headers=["*"],
)

# Register API and WebSocket routers
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
