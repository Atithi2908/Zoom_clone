"""
Backend database seed runner for Zoom Clone.
Delegates to app.seed for consistent, automated data population.
"""
import os
import sys

backend_dir = os.path.dirname(os.path.abspath(__file__))
if backend_dir not in sys.path:
    sys.path.insert(0, backend_dir)

from app.seed import seed_initial_data

if __name__ == "__main__":
    seed_initial_data()
