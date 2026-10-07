import os
import sys
import hashlib
from datetime import datetime, timedelta

# Add backend directory to path if running directly
sys.path.append(os.path.dirname(os.path.abspath(__file__)))

from sqlalchemy import func
from app.database import SessionLocal, engine, Base
from app.models import Meeting, Participant, User

FRONTEND_URL = os.getenv("FRONTEND_URL", "http://localhost:3000").rstrip("/")
PASSWORD_SALT = os.getenv("PASSWORD_SALT", "zoom_clone_secure_salt_2024")
DEFAULT_USER_EMAIL = os.getenv("DEFAULT_USER_EMAIL", "atithi@zoom.clone").strip().lower()
DEFAULT_USER_NAME = "Atithi"
DEFAULT_USER_PASSWORD = "password123"

def seed_initial_data(db=None):
    """
    Populates SQLite with:
    1. Default user (Atithi / atithi@zoom.clone)
    2. 3 Upcoming scheduled meetings owned by the default user
    3. 3 Recent completed meetings owned and attended by the default user
    4. Valid Participant records linked via foreign keys

    Idempotent: Running this function multiple times will update records in-place
    without generating duplicates.
    """
    close_db_at_end = False
    if db is None:
        Base.metadata.create_all(bind=engine)
        db = SessionLocal()
        close_db_at_end = True

    try:
        now = datetime.now()

        # -------------------------------------------------------------
        # 1. Seed or Update Default User
        # -------------------------------------------------------------
        pwd_hash = hashlib.sha256((PASSWORD_SALT + DEFAULT_USER_PASSWORD).encode("utf-8")).hexdigest()
        u = db.query(User).filter(func.lower(User.email) == DEFAULT_USER_EMAIL).first()
        if not u:
            u = User(
                email=DEFAULT_USER_EMAIL,
                full_name=DEFAULT_USER_NAME,
                password_hash=pwd_hash,
                created_at=now - timedelta(days=10)
            )
            db.add(u)
            db.commit()
            db.refresh(u)
            print(f"[Seed] Created default user: {u.email} ({u.full_name}, ID: {u.id})")
        else:
            u.full_name = DEFAULT_USER_NAME
            u.password_hash = pwd_hash
            db.commit()
            db.refresh(u)
            print(f"[Seed] Verified default user: {u.email} ({u.full_name}, ID: {u.id})")

        # -------------------------------------------------------------
        # 2. Seed 3 Upcoming Meetings (Future Scheduled)
        # -------------------------------------------------------------
        upcoming_seeds = [
            {
                "meeting_id": "845-4875-7459",
                "title": "Weekly Product & Engineering Sync",
                "description": "Sprint 4 roadmap review, deliverables, and backend architecture sync.",
                "scheduled_at": now + timedelta(days=1, hours=2),
                "duration_minutes": 45,
                "status": "scheduled",
                "created_at": now - timedelta(days=1)
            },
            {
                "meeting_id": "923-4120-6814",
                "title": "Zoom Workplace Architecture Review",
                "description": "Review WebRTC full mesh topology and signaling performance.",
                "scheduled_at": now + timedelta(days=2, hours=4),
                "duration_minutes": 60,
                "status": "scheduled",
                "created_at": now - timedelta(days=2)
            },
            {
                "meeting_id": "714-9831-2560",
                "title": "Client Quarterly Progress Demo",
                "description": "Quarterly progress demonstration, feedback session, and Q&A.",
                "scheduled_at": now + timedelta(days=3, hours=1),
                "duration_minutes": 30,
                "status": "scheduled",
                "created_at": now - timedelta(days=3)
            }
        ]

        print("\n--- Seeding Upcoming Meetings ---")
        for item in upcoming_seeds:
            m = db.query(Meeting).filter(Meeting.meeting_id == item["meeting_id"]).first()
            invite_link = f"{FRONTEND_URL}/meeting/{item['meeting_id']}/lobby"
            if not m:
                m = Meeting(
                    meeting_id=item["meeting_id"],
                    title=item["title"],
                    description=item["description"],
                    scheduled_at=item["scheduled_at"],
                    duration_minutes=item["duration_minutes"],
                    invite_link=invite_link,
                    status=item["status"],
                    host_id=u.id,
                    host_email=u.email,
                    created_at=item["created_at"]
                )
                db.add(m)
                print(f"  [+] Added upcoming meeting: {m.meeting_id} - {m.title}")
            else:
                m.title = item["title"]
                m.description = item["description"]
                m.scheduled_at = item["scheduled_at"]
                m.duration_minutes = item["duration_minutes"]
                m.invite_link = invite_link
                m.status = item["status"]
                m.host_id = u.id
                m.host_email = u.email
                print(f"  [=] Updated existing upcoming meeting: {m.meeting_id} - {m.title}")
        db.commit()

        # -------------------------------------------------------------
        # 3. Seed 3 Recent Meetings (Completed & Attended)
        # -------------------------------------------------------------
        recent_seeds = [
            {
                "meeting_id": "531-7294-8102",
                "title": "Sprint 3 Retrospective",
                "description": "Post-mortem on sprint 3 deployment and performance metrics.",
                "scheduled_at": now - timedelta(days=1, hours=4),
                "duration_minutes": 45,
                "status": "completed",
                "created_at": now - timedelta(days=2),
                "participant_session_id": "sess_seed_rec_1"
            },
            {
                "meeting_id": "642-1983-5071",
                "title": "Frontend UI/UX Design Review",
                "description": "Review of Zoom dark room design tokens and responsive video grid.",
                "scheduled_at": now - timedelta(days=3, hours=2),
                "duration_minutes": 30,
                "status": "completed",
                "created_at": now - timedelta(days=4),
                "participant_session_id": "sess_seed_rec_2"
            },
            {
                "meeting_id": "389-4562-1708",
                "title": "Ad-Hoc Architecture Sync",
                "description": "Quick sync on video tile layout and host control bar.",
                "scheduled_at": now - timedelta(days=5, hours=3),
                "duration_minutes": 40,
                "status": "completed",
                "created_at": now - timedelta(days=6),
                "participant_session_id": "sess_seed_rec_3"
            }
        ]

        print("\n--- Seeding Recent Meetings ---")
        for item in recent_seeds:
            m = db.query(Meeting).filter(Meeting.meeting_id == item["meeting_id"]).first()
            invite_link = f"{FRONTEND_URL}/meeting/{item['meeting_id']}/lobby"
            if not m:
                m = Meeting(
                    meeting_id=item["meeting_id"],
                    title=item["title"],
                    description=item["description"],
                    scheduled_at=item["scheduled_at"],
                    duration_minutes=item["duration_minutes"],
                    invite_link=invite_link,
                    status=item["status"],
                    host_id=u.id,
                    host_email=u.email,
                    created_at=item["created_at"]
                )
                db.add(m)
                print(f"  [+] Added recent meeting: {m.meeting_id} - {m.title}")
            else:
                m.title = item["title"]
                m.description = item["description"]
                m.scheduled_at = item["scheduled_at"]
                m.duration_minutes = item["duration_minutes"]
                m.invite_link = invite_link
                m.status = item["status"]
                m.host_id = u.id
                m.host_email = u.email
                print(f"  [=] Updated existing recent meeting: {m.meeting_id} - {m.title}")

            # Ensure host attendance Participant record exists for recent history queries
            p = db.query(Participant).filter(Participant.session_id == item["participant_session_id"]).first()
            if not p:
                p = Participant(
                    meeting_id=item["meeting_id"],
                    display_name=u.full_name,
                    role="host",
                    session_id=item["participant_session_id"],
                    user_email=u.email,
                    joined_at=item["scheduled_at"]
                )
                db.add(p)
                print(f"      [+] Added host participant record for meeting {item['meeting_id']}")
            else:
                p.meeting_id = item["meeting_id"]
                p.display_name = u.full_name
                p.role = "host"
                p.user_email = u.email
                print(f"      [=] Verified participant record for meeting {item['meeting_id']}")
        db.commit()

        print("\n[Seed] Database successfully populated with 1 user, 3 upcoming meetings, and 3 recent meetings.")
    finally:
        if close_db_at_end:
            db.close()

if __name__ == "__main__":
    seed_initial_data()
