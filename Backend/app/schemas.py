from datetime import datetime
from typing import Optional, List
from pydantic import BaseModel, ConfigDict, Field

# ----------------- Participant Schemas -----------------

class ParticipantCreate(BaseModel):
    display_name: str = Field(..., min_length=1, max_length=100, description="Display name for the participant")
    role: str = Field(default="participant", description="Role: host or participant")
    session_id: str = Field(..., description="Unique client session ID")
    user_email: Optional[str] = Field(default=None, description="User email if logged in")

class ParticipantResponse(BaseModel):
    model_config = ConfigDict(from_attributes=True)

    id: int
    meeting_id: str
    display_name: str
    role: str
    session_id: str
    user_email: Optional[str] = None
    joined_at: datetime

# ----------------- Meeting Schemas -----------------

class InstantMeetingCreate(BaseModel):
    title: Optional[str] = Field(default="Instant Meeting", description="Meeting title")
    host_name: Optional[str] = Field(default="Atithi (Host)", description="Host display name")
    host_email: Optional[str] = Field(default=None, description="Host user email")
    host_id: Optional[int] = Field(default=None, description="Host user ID")

class ScheduledMeetingCreate(BaseModel):
    title: str = Field(..., min_length=1, max_length=255, description="Title of the meeting")
    description: Optional[str] = Field(default="", description="Meeting agenda / description")
    scheduled_at: datetime = Field(..., description="ISO datetime of scheduled meeting")
    duration_minutes: int = Field(default=30, ge=5, le=480, description="Duration in minutes")
    host_email: Optional[str] = Field(default=None, description="Host user email")
    host_id: Optional[int] = Field(default=None, description="Host user ID")

class MeetingResponse(BaseModel):
    model_config = ConfigDict(from_attributes=True)

    id: int
    meeting_id: str
    title: str
    description: Optional[str]
    scheduled_at: datetime
    duration_minutes: int
    invite_link: str
    status: str
    host_id: Optional[int] = None
    host_email: Optional[str] = None
    created_at: datetime
    participants: List[ParticipantResponse] = []

class MeetingValidateResponse(BaseModel):
    exists: bool
    meeting_id: str
    title: str
    status: str
    scheduled_at: datetime
    duration_minutes: int
    host_id: Optional[int] = None
    host_email: Optional[str] = None

# ----------------- Auth Schemas -----------------

class UserSignUp(BaseModel):
    email: str
    password: str
    full_name: Optional[str] = "atithi jaiman"

class UserSignIn(BaseModel):
    email: str
    password: str

class UserResponse(BaseModel):
    model_config = ConfigDict(from_attributes=True)

    id: int
    email: str
    full_name: str
    created_at: datetime

class AuthTokenResponse(BaseModel):
    token: str
    user: UserResponse
