"""
Root initialization seed script for Zoom Clone.
Populates SQLite with:
1. Default user (Atithi / atithi@zoom.clone)
2. 3 Upcoming scheduled meetings owned by the default user
3. 5 Recent completed meetings owned and attended by the default user
4. Valid Participant records linked via foreign keys

Usage:
    python seed.py
"""
import sys
import os

backend_dir = os.path.join(os.path.dirname(os.path.abspath(__file__)), "Backend")
if backend_dir not in sys.path:
    sys.path.insert(0, backend_dir)

from app.seed import seed_initial_data

if __name__ == "__main__":
    seed_initial_data()
