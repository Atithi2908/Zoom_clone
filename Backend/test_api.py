import sys
import os
from datetime import datetime, timedelta
sys.path.append(os.path.dirname(os.path.abspath(__file__)))

from fastapi.testclient import TestClient
from app.main import app

client = TestClient(app)

def test_endpoints():
    print("1. Testing Health Check...")
    r = client.get("/health")
    assert r.status_code == 200, f"Health check failed: {r.text}"
    print("   [OK] Health check OK:", r.json())

    print("2. Testing Get Upcoming Meetings...")
    r = client.get("/meetings/upcoming")
    assert r.status_code == 200, f"Upcoming failed: {r.text}"
    upcoming = r.json()
    assert len(upcoming) >= 1, "Expected at least 1 upcoming meeting"
    print(f"   [OK] Upcoming meetings: {len(upcoming)} meetings found.")

    print("3. Testing Get Recent Meetings...")
    r = client.get("/meetings/recent")
    assert r.status_code == 200, f"Recent failed: {r.text}"
    recent = r.json()
    assert len(recent) >= 1, "Expected at least 1 recent meeting"
    print(f"   [OK] Recent meetings: {len(recent)} meetings found.")

    print("4. Testing Instant Meeting Creation...")
    r = client.post("/meetings", json={"title": "Test Instant Meeting", "host_name": "Atithi (Host)"})
    assert r.status_code == 201, f"Create instant failed: {r.text}"
    created = r.json()
    meeting_id = created["meeting_id"]
    assert "invite_link" in created
    assert created["status"] == "active"
    print(f"   [OK] Instant meeting created: {meeting_id}, link: {created['invite_link']}")

    print("5. Testing Meeting Validation (Valid ID)...")
    r = client.get(f"/meetings/{meeting_id}/validate")
    assert r.status_code == 200, f"Validate failed: {r.text}"
    val = r.json()
    assert val["exists"] is True
    print(f"   [OK] Validation for {meeting_id} succeeded.")

    print("6. Testing Meeting Validation (Invalid ID)...")
    r = client.get("/meetings/999-999-9999/validate")
    assert r.status_code == 404, f"Expected 404, got: {r.status_code}"
    print("   [OK] Validation for non-existent meeting returned 404 as expected.")

    print("7. Testing Schedule Meeting...")
    future_time = (datetime.now() + timedelta(days=2)).isoformat()
    r = client.post("/meetings/schedule", json={
        "title": "Scheduled Team Sync",
        "description": "Discuss sprint 4 items",
        "scheduled_at": future_time,
        "duration_minutes": 45
    })
    assert r.status_code == 201, f"Schedule failed: {r.text}"
    sched = r.json()
    assert sched["status"] == "scheduled"
    print(f"   [OK] Meeting scheduled successfully: ID {sched['meeting_id']}")

    print("8. Testing Participant Registration...")
    r = client.post(f"/meetings/{meeting_id}/participants", json={
        "display_name": "Rahul",
        "role": "participant",
        "session_id": "test-session-123"
    })
    assert r.status_code == 200, f"Register participant failed: {r.text}"
    p = r.json()
    assert p["display_name"] == "Rahul"
    print(f"   [OK] Participant registered: {p['display_name']} ({p['role']})")

    print("\nALL BACKEND API TESTS PASSED SUCCESSFULLY! (8/8)")

if __name__ == "__main__":
    test_endpoints()
