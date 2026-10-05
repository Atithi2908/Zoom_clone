import os
import random
from datetime import datetime, timezone
from typing import List, Optional
from fastapi import APIRouter, Depends, HTTPException, status
from sqlalchemy.orm import Session
from sqlalchemy import desc, asc, func

from ..database import get_db
from ..models import Meeting, Participant, User
from ..schemas import (
    InstantMeetingCreate,
    ScheduledMeetingCreate,
    MeetingResponse,
    MeetingValidateResponse,
    ParticipantCreate,
    ParticipantResponse,
)

router = APIRouter(prefix="/meetings", tags=["meetings"])

FRONTEND_URL = os.getenv("FRONTEND_URL", "http://localhost:3000").rstrip("/")

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

def get_or_create_meeting(db: Session, raw_id: str) -> Optional[Meeting]:
    """Find meeting by normalized or raw ID."""
    norm_id = normalize_meeting_id(raw_id)
    meeting = db.query(Meeting).filter(Meeting.meeting_id == norm_id).first()
    if not meeting:
        meeting = db.query(Meeting).filter(Meeting.meeting_id == raw_id).first()
    return meeting

@router.post("", response_model=MeetingResponse, status_code=status.HTTP_201_CREATED)
def create_instant_meeting(payload: InstantMeetingCreate, db: Session = Depends(get_db)):
    """
    Creates an instant meeting:
    1. Generates unique Meeting ID.
    2. Builds invite link.
    3. Saves meeting to SQLite with status='active' and resolves host_id.
    """
    meeting_id = generate_meeting_id()
    while db.query(Meeting).filter(Meeting.meeting_id == meeting_id).first():
        meeting_id = generate_meeting_id()

    invite_link = f"{FRONTEND_URL}/meeting/{meeting_id}/lobby"
    now = datetime.now()

    host_id = payload.host_id
    host_email = payload.host_email
    if not host_id and host_email:
        u = db.query(User).filter(User.email == host_email.strip().lower()).first()
        if u:
            host_id = u.id

    meeting = Meeting(
        meeting_id=meeting_id,
        title=payload.title or "Instant Meeting",
        description="Quick instant meeting started from dashboard",
        scheduled_at=now,
        duration_minutes=45,
        invite_link=invite_link,
        status="active",
        host_id=host_id,
        host_email=host_email,
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
    2. Persists naive local wall-clock datetime to SQLite with status='scheduled' and resolves host_id.
    """
    meeting_id = generate_meeting_id()
    while db.query(Meeting).filter(Meeting.meeting_id == meeting_id).first():
        meeting_id = generate_meeting_id()

    invite_link = f"{FRONTEND_URL}/meeting/{meeting_id}/lobby"
    now = datetime.now()

    scheduled_dt = payload.scheduled_at
    if scheduled_dt.tzinfo is not None:
        scheduled_dt = scheduled_dt.replace(tzinfo=None)

    host_id = payload.host_id
    host_email = payload.host_email
    if not host_id and host_email:
        u = db.query(User).filter(User.email == host_email.strip().lower()).first()
        if u:
            host_id = u.id

    meeting = Meeting(
        meeting_id=meeting_id,
        title=payload.title,
        description=payload.description or "",
        scheduled_at=scheduled_dt,
        duration_minutes=payload.duration_minutes,
        invite_link=invite_link,
        status="scheduled",
        host_id=host_id,
        host_email=host_email,
        created_at=now,
    )
    db.add(meeting)
    db.commit()
    db.refresh(meeting)
    return meeting

@router.get("/upcoming", response_model=List[MeetingResponse])
def get_upcoming_meetings(host_email: Optional[str] = None, db: Session = Depends(get_db)):
    """
    Retrieve meetings currently scheduled, ordered by scheduled_at ascending.
    If host_email is provided, only meetings created by this user are returned.
    """
    query = db.query(Meeting).filter(Meeting.status == "scheduled")
    if host_email is not None:
        query = query.filter(Meeting.host_email == host_email)
    meetings = query.order_by(asc(Meeting.scheduled_at)).all()
    return meetings

@router.get("/recent", response_model=List[MeetingResponse])
def get_recent_meetings(host_email: Optional[str] = None, user_email: Optional[str] = None, db: Session = Depends(get_db)):
    """
    Retrieve recently held/attended meetings, ordered by creation time descending.
    Returns meetings hosted by the user OR attended by the user.
    """
    target_email = user_email or host_email
    query = db.query(Meeting)
    if target_email is not None:
        clean_email = target_email.strip().lower()
        # Find meeting IDs attended by this user from participants table
        raw_attended = [
            r[0] for r in db.query(Participant.meeting_id).filter(
                func.lower(Participant.user_email) == clean_email
            ).all()
        ]
        # Include both raw and normalized meeting IDs
        attended_ids = set()
        for mid in raw_attended:
            if mid:
                attended_ids.add(mid)
                attended_ids.add(normalize_meeting_id(mid))
                attended_ids.add(mid.replace("-", " "))

        if attended_ids:
            query = query.filter(
                (func.lower(Meeting.host_email) == clean_email) | (Meeting.meeting_id.in_(list(attended_ids)))
            )
        else:
            query = query.filter(func.lower(Meeting.host_email) == clean_email)

    # Exclude unstarted scheduled future meetings from recent list
    now = datetime.now()
    query = query.filter(
        (Meeting.status != "scheduled") | (Meeting.scheduled_at <= now)
    )

    # Require that the meeting was actually started/attended:
    # Either status is 'completed', OR it has at least one participant record indicating attendance/start
    attended_mids = [r[0] for r in db.query(Participant.meeting_id).distinct().all()]
    all_attended_mids = set()
    for mid in attended_mids:
        if mid:
            all_attended_mids.add(mid)
            all_attended_mids.add(normalize_meeting_id(mid))
            all_attended_mids.add(mid.replace("-", " "))

    query = query.filter(
        (Meeting.status == "completed") | (Meeting.meeting_id.in_(list(all_attended_mids)))
    )
    meetings = query.order_by(desc(Meeting.created_at)).limit(20).all()
    return meetings

@router.get("/{meeting_id}/validate", response_model=MeetingValidateResponse)
def validate_meeting(meeting_id: str, db: Session = Depends(get_db)):
    """
    Validates whether a meeting exists in SQLite and is currently joinable.
    Returns host_id and host_email for client authorization.
    """
    norm_id = normalize_meeting_id(meeting_id)
    meeting = db.query(Meeting).filter(Meeting.meeting_id == norm_id).first()
    if not meeting:
        meeting = db.query(Meeting).filter(Meeting.meeting_id == meeting_id).first()
    
    if not meeting:
        raise HTTPException(
            status_code=status.HTTP_404_NOT_FOUND,
            detail=f"Meeting '{meeting_id}' does not exist or has expired. Please verify your Meeting ID or invite link."
        )

    # 1. Reject if meeting has ended
    if meeting.status == "completed":
        raise HTTPException(
            status_code=status.HTTP_400_BAD_REQUEST,
            detail="This meeting has ended."
        )

    # 2. Reject if scheduled meeting has not reached start time
    now = datetime.now()
    if meeting.status == "scheduled" and meeting.scheduled_at and now < meeting.scheduled_at:
        formatted_time = meeting.scheduled_at.strftime("%B %d, %I:%M %p")
        raise HTTPException(
            status_code=status.HTTP_400_BAD_REQUEST,
            detail=f"This meeting has not started yet. Scheduled for: {formatted_time}"
        )

    return MeetingValidateResponse(
        exists=True,
        meeting_id=meeting.meeting_id,
        title=meeting.title,
        status=meeting.status,
        scheduled_at=meeting.scheduled_at,
        duration_minutes=meeting.duration_minutes,
        host_id=meeting.host_id,
        host_email=meeting.host_email,
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
    Validates meeting status and start time, and securely assigns host/participant role.
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

    from .websocket import manager
    if payload.session_id in manager.removed_sessions.get(norm_id, set()):
        raise HTTPException(
            status_code=status.HTTP_403_FORBIDDEN,
            detail="You were removed from this meeting and cannot rejoin."
        )

    # 1. Reject if meeting ended
    if meeting.status == "completed":
        raise HTTPException(
            status_code=status.HTTP_400_BAD_REQUEST,
            detail="This meeting has ended."
        )

    # 2. Reject if scheduled meeting has not reached start time
    now = datetime.now()
    if meeting.status == "scheduled" and meeting.scheduled_at and now < meeting.scheduled_at:
        formatted_time = meeting.scheduled_at.strftime("%B %d, %I:%M %p")
        raise HTTPException(
            status_code=status.HTTP_400_BAD_REQUEST,
            detail=f"This meeting has not started yet. Scheduled for: {formatted_time}"
        )

    # 3. Host role enforcement: only allow host role if matching meeting's host_id / host_email or authorized
    existing_host = db.query(Participant).filter(
        Participant.meeting_id == meeting.meeting_id,
        Participant.role == "host"
    ).first()

    assigned_role = "participant"
    if payload.role == "host":
        is_owner = False
        if meeting.host_email and payload.user_email:
            is_owner = (meeting.host_email.strip().lower() == payload.user_email.strip().lower())
        elif not existing_host or existing_host.session_id == payload.session_id:
            if not meeting.host_email or not payload.user_email:
                is_owner = True

        if is_owner:
            assigned_role = "host"
        else:
            assigned_role = "participant"

    participant = Participant(
        meeting_id=meeting.meeting_id,
        display_name=payload.display_name,
        role=assigned_role,
        session_id=payload.session_id,
        user_email=payload.user_email.strip().lower() if payload.user_email else None,
        joined_at=now
    )
    db.add(participant)
    
    # If meeting was scheduled and start time has arrived, mark it active
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
