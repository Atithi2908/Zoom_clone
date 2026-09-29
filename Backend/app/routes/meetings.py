import os
import random
from datetime import datetime, timezone
from typing import List
from fastapi import APIRouter, Depends, HTTPException, status
from sqlalchemy.orm import Session
from sqlalchemy import desc, asc

from ..database import get_db
from ..models import Meeting, Participant
from ..schemas import (
    InstantMeetingCreate,
    ScheduledMeetingCreate,
    MeetingResponse,
    MeetingValidateResponse,
    ParticipantCreate,
    ParticipantResponse,
)

router = APIRouter(prefix="/meetings", tags=["meetings"])

FRONTEND_URL = os.getenv("FRONTEND_URL", "http://localhost:3000")

def generate_meeting_id() -> str:
    """Generate a clean Zoom-style 10-digit meeting ID: XXX-XXX-XXXX."""
    p1 = random.randint(100, 999)
    p2 = random.randint(100, 999)
    p3 = random.randint(1000, 9999)
    return f"{p1}-{p2}-{p3}"

def normalize_meeting_id(raw_id: str) -> str:
    """Normalize input like '8492913841' or '849-291-3841' to standard hyphenated form."""
    cleaned = raw_id.strip().replace(" ", "").replace("-", "")
    if len(cleaned) == 10:
        return f"{cleaned[:3]}-{cleaned[3:6]}-{cleaned[6:]}"
    return raw_id.strip()

@router.post("", response_model=MeetingResponse, status_code=status.HTTP_201_CREATED)
def create_instant_meeting(payload: InstantMeetingCreate, db: Session = Depends(get_db)):
    """
    Creates an instant meeting:
    1. Generates unique Meeting ID.
    2. Builds invite link.
    3. Saves meeting to SQLite with status='active'.
    4. Automatically adds host as first participant.
    """
    meeting_id = generate_meeting_id()
    # Ensure uniqueness
    while db.query(Meeting).filter(Meeting.meeting_id == meeting_id).first():
        meeting_id = generate_meeting_id()

    invite_link = f"{FRONTEND_URL}/meeting/{meeting_id}/lobby"
    now = datetime.now(timezone.utc)

    meeting = Meeting(
        meeting_id=meeting_id,
        title=payload.title or "Instant Meeting",
        description="Quick instant meeting started from dashboard",
        scheduled_at=now,
        duration_minutes=45,
        invite_link=invite_link,
        status="active",
        created_at=now,
    )
    db.add(meeting)
    db.commit()
    db.refresh(meeting)
    return meeting

@router.post("/schedule", response_model=MeetingResponse, status_code=status.HTTP_201_CREATED)
def schedule_meeting(payload: ScheduledMeetingCreate, db: Session = Depends(get_db)):
    """
    Schedules a meeting:
    1. Generates unique Meeting ID and invite link.
    2. Persists to SQLite with status='scheduled'.
    """
    meeting_id = generate_meeting_id()
    while db.query(Meeting).filter(Meeting.meeting_id == meeting_id).first():
        meeting_id = generate_meeting_id()

    invite_link = f"{FRONTEND_URL}/meeting/{meeting_id}/lobby"
    now = datetime.now(timezone.utc)

    # Ensure scheduled_at is naive UTC if timezone aware
    scheduled_dt = payload.scheduled_at
    if scheduled_dt.tzinfo is not None:
        scheduled_dt = scheduled_dt.astimezone(timezone.utc).replace(tzinfo=None)

    meeting = Meeting(
        meeting_id=meeting_id,
        title=payload.title,
        description=payload.description or "",
        scheduled_at=scheduled_dt,
        duration_minutes=payload.duration_minutes,
        invite_link=invite_link,
        status="scheduled",
        created_at=now.replace(tzinfo=None),
    )
    db.add(meeting)
    db.commit()
    db.refresh(meeting)
    return meeting

@router.get("/upcoming", response_model=List[MeetingResponse])
def get_upcoming_meetings(db: Session = Depends(get_db)):
    """
    Retrieve meetings scheduled for the future or currently marked scheduled.
    Ordered by scheduled_at ascending.
    """
    meetings = (
        db.query(Meeting)
        .filter(Meeting.status == "scheduled")
        .order_by(asc(Meeting.scheduled_at))
        .all()
    )
    return meetings

@router.get("/recent", response_model=List[MeetingResponse])
def get_recent_meetings(db: Session = Depends(get_db)):
    """
    Retrieve recent meetings (completed or active), ordered by creation/time descending.
    """
    meetings = (
        db.query(Meeting)
        .filter(Meeting.status.in_(["active", "completed"]))
        .order_by(desc(Meeting.created_at))
        .limit(20)
        .all()
    )
    return meetings

@router.get("/{meeting_id}/validate", response_model=MeetingValidateResponse)
def validate_meeting(meeting_id: str, db: Session = Depends(get_db)):
    """
    Validates whether a meeting exists in SQLite.
    Returns 404 if not found so frontend can show clear error message.
    """
    norm_id = normalize_meeting_id(meeting_id)
    meeting = db.query(Meeting).filter(Meeting.meeting_id == norm_id).first()
    if not meeting:
        # Also try raw
        meeting = db.query(Meeting).filter(Meeting.meeting_id == meeting_id).first()
    
    if not meeting:
        raise HTTPException(
            status_code=status.HTTP_404_NOT_FOUND,
            detail=f"Meeting '{meeting_id}' does not exist or has expired. Please verify your Meeting ID or invite link."
        )

    return MeetingValidateResponse(
        exists=True,
        meeting_id=meeting.meeting_id,
        title=meeting.title,
        status=meeting.status,
        scheduled_at=meeting.scheduled_at,
        duration_minutes=meeting.duration_minutes
    )

@router.get("/{meeting_id}", response_model=MeetingResponse)
def get_meeting(meeting_id: str, db: Session = Depends(get_db)):
    """Retrieve full details of a specific meeting by ID."""
    norm_id = normalize_meeting_id(meeting_id)
    meeting = db.query(Meeting).filter(Meeting.meeting_id == norm_id).first()
    if not meeting:
        meeting = db.query(Meeting).filter(Meeting.meeting_id == meeting_id).first()
    if not meeting:
        raise HTTPException(
            status_code=status.HTTP_404_NOT_FOUND,
            detail=f"Meeting '{meeting_id}' not found."
        )
    return meeting

@router.post("/{meeting_id}/participants", response_model=ParticipantResponse)
def register_participant(
    meeting_id: str,
    payload: ParticipantCreate,
    db: Session = Depends(get_db)
):
    """
    Register a participant when they enter the meeting room from the lobby.
    """
    norm_id = normalize_meeting_id(meeting_id)
    meeting = db.query(Meeting).filter(Meeting.meeting_id == norm_id).first()
    if not meeting:
        meeting = db.query(Meeting).filter(Meeting.meeting_id == meeting_id).first()
    if not meeting:
        raise HTTPException(
            status_code=status.HTTP_404_NOT_FOUND,
            detail=f"Meeting '{meeting_id}' not found."
        )

    now = datetime.now(timezone.utc).replace(tzinfo=None)
    participant = Participant(
        meeting_id=meeting.meeting_id,
        display_name=payload.display_name,
        role=payload.role,
        session_id=payload.session_id,
        joined_at=now
    )
    db.add(participant)
    
    # If meeting was scheduled, mark it active now that someone joined
    if meeting.status == "scheduled":
        meeting.status = "active"

    db.commit()
    db.refresh(participant)
    return participant

@router.patch("/{meeting_id}/status")
def update_meeting_status(
    meeting_id: str,
    new_status: str,
    db: Session = Depends(get_db)
):
    """Update meeting status to 'active' or 'completed'."""
    norm_id = normalize_meeting_id(meeting_id)
    meeting = db.query(Meeting).filter(Meeting.meeting_id == norm_id).first()
    if not meeting:
        meeting = db.query(Meeting).filter(Meeting.meeting_id == meeting_id).first()
    if not meeting:
        raise HTTPException(status_code=404, detail="Meeting not found")

    meeting.status = new_status
    db.commit()
    return {"message": "Status updated", "status": new_status}
