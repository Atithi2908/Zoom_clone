import os
import sys
from datetime import datetime, timedelta, timezone

# Add backend directory to path if running directly
sys.path.append(os.path.dirname(os.path.abspath(__file__)))

from app.database import SessionLocal, engine, Base
from app.models import Meeting, Participant, User

FRONTEND_URL = os.getenv("FRONTEND_URL", "http://localhost:3000").rstrip("/")

def seed_initial_data(db=None):
    """Seed default user into SQLite if not present."""
    close_db_at_end = False
    if db is None:
        Base.metadata.create_all(bind=engine)
        db = SessionLocal()
        close_db_at_end = True

    try:
        # Seed or update default user
        import hashlib
        pwd_hash = hashlib.sha256(("zoom_clone_secure_salt_2024" + "password123").encode("utf-8")).hexdigest()
        u = db.query(User).filter(User.email == "atithi@zoom.clone").first()
        if not u:
            u = User(
                email="atithi@zoom.clone",
                full_name="Atithi",
                password_hash=pwd_hash
            )
            db.add(u)
            db.commit()
            print("[Seed] Seeded default user: atithi@zoom.clone (Atithi)")
        else:
            if u.full_name != "Atithi":
                u.full_name = "Atithi"
                db.commit()
                print("[Seed] Updated default user full_name to Atithi")
    finally:
        if close_db_at_end:
            db.close()

if __name__ == "__main__":
    seed_initial_data()
