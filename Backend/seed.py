import os
import sys
from datetime import datetime, timedelta, timezone

# Add backend directory to path if running directly
sys.path.append(os.path.dirname(os.path.abspath(__file__)))

from app.database import SessionLocal, engine, Base
from app.models import Meeting, Participant

FRONTEND_URL = os.getenv("FRONTEND_URL", "http://localhost:3000")

def seed_initial_data(db=None):
    """Seed sample upcoming and recent meetings with participants into SQLite."""
    close_db_at_end = False
    if db is None:
        Base.metadata.create_all(bind=engine)
        db = SessionLocal()
        close_db_at_end = True

    try:
        # Check if database already has meetings
        existing_count = db.query(Meeting).count()
        if existing_count > 0:
            print(f"[Seed] Database already contains {existing_count} meetings. Skipping seed.")
            return

        now = datetime.now(timezone.utc).replace(tzinfo=None)

        sample_meetings = [
            # --- UPCOMING MEETINGS ---
            Meeting(
                meeting_id="942-510-7381",
                title="Weekly Engineering Standup & Sprint Sync",
                description="Review sprint blockers, progress on WebRTC features, and roadmap goals.",
                scheduled_at=now + timedelta(hours=2, minutes=30),
                duration_minutes=45,
                invite_link=f"{FRONTEND_URL}/meeting/942-510-7381/lobby",
                status="scheduled",
                created_at=now - timedelta(days=1),
            ),
            Meeting(
                meeting_id="814-639-2045",
                title="CS Final Year Capstone Project Review",
                description="Evaluation meeting for Fullstack Zoom Clone architecture and demo.",
                scheduled_at=now + timedelta(days=1, hours=4),
                duration_minutes=60,
                invite_link=f"{FRONTEND_URL}/meeting/814-639-2045/lobby",
                status="scheduled",
                created_at=now - timedelta(hours=6),
            ),
            Meeting(
                meeting_id="735-901-4428",
                title="Product & Design Walkthrough",
                description="High-fidelity UI audit matching modern Zoom web application standards.",
                scheduled_at=now + timedelta(days=2, hours=1),
                duration_minutes=30,
                invite_link=f"{FRONTEND_URL}/meeting/735-901-4428/lobby",
                status="scheduled",
                created_at=now - timedelta(hours=2),
            ),

            # --- RECENT MEETINGS ---
            Meeting(
                meeting_id="628-394-1102",
                title="Backend Architecture & SQLite Schema Review",
                description="Discussed API endpoints, relationship modeling, and FastAPI setup.",
                scheduled_at=now - timedelta(days=1, hours=3),
                duration_minutes=45,
                invite_link=f"{FRONTEND_URL}/meeting/628-394-1102/lobby",
                status="completed",
                created_at=now - timedelta(days=1, hours=4),
            ),
            Meeting(
                meeting_id="519-823-7460",
                title="WebRTC Signaling & Video Test",
                description="Initial verification of peer connection, SDP offer/answer exchange.",
                scheduled_at=now - timedelta(days=2, hours=5),
                duration_minutes=30,
                invite_link=f"{FRONTEND_URL}/meeting/519-823-7460/lobby",
                status="completed",
                created_at=now - timedelta(days=2, hours=6),
            ),
            Meeting(
                meeting_id="410-672-9931",
                title="1-on-1 Mentorship & Code Quality Check",
                description="Reviewed clean code principles, modularity, and interview readiness.",
                scheduled_at=now - timedelta(days=3, hours=2),
                duration_minutes=30,
                invite_link=f"{FRONTEND_URL}/meeting/410-672-9931/lobby",
                status="completed",
                created_at=now - timedelta(days=3, hours=3),
            ),
        ]

        for m in sample_meetings:
            db.add(m)
        db.commit()

        # Add sample participants to recent meetings for realistic history
        sample_participants = [
            Participant(
                meeting_id="628-394-1102",
                display_name="Atithi (Host)",
                role="host",
                session_id="host-sess-001",
                joined_at=now - timedelta(days=1, hours=4)
            ),
            Participant(
                meeting_id="628-394-1102",
                display_name="Rahul",
                role="participant",
                session_id="peer-sess-002",
                joined_at=now - timedelta(days=1, hours=3, minutes=58)
            ),
            Participant(
                meeting_id="519-823-7460",
                display_name="Atithi (Host)",
                role="host",
                session_id="host-sess-003",
                joined_at=now - timedelta(days=2, hours=6)
            ),
            Participant(
                meeting_id="519-823-7460",
                display_name="Sneha",
                role="participant",
                session_id="peer-sess-004",
                joined_at=now - timedelta(days=2, hours=5, minutes=55)
            ),
        ]

        for p in sample_participants:
            db.add(p)
        db.commit()

        print("[Seed] Successfully seeded 3 upcoming meetings and 3 recent meetings with participants into SQLite!")

    finally:
        if close_db_at_end:
            db.close()

if __name__ == "__main__":
    seed_initial_data()
