from datetime import datetime
from sqlalchemy import Column, Integer, String, Text, DateTime, ForeignKey
from sqlalchemy.orm import relationship

from .database import Base

class Meeting(Base):
    __tablename__ = "meetings"

    id = Column(Integer, primary_key=True, index=True, autoincrement=True)
    meeting_id = Column(String(32), unique=True, index=True, nullable=False)
    title = Column(String(255), nullable=False, default="Quick Meeting")
    description = Column(Text, nullable=True)
    scheduled_at = Column(DateTime, nullable=False, default=datetime.utcnow)
    duration_minutes = Column(Integer, nullable=False, default=30)
    invite_link = Column(String(512), nullable=False)
    status = Column(String(32), nullable=False, default="scheduled")  # scheduled | active | completed
    created_at = Column(DateTime, nullable=False, default=datetime.utcnow)

    # 1-to-many relationship with participants
    participants = relationship(
        "Participant",
        back_populates="meeting",
        cascade="all, delete-orphan",
        order_by="Participant.joined_at.desc()"
    )

class Participant(Base):
    __tablename__ = "participants"

    id = Column(Integer, primary_key=True, index=True, autoincrement=True)
    meeting_id = Column(String(32), ForeignKey("meetings.meeting_id", ondelete="CASCADE"), nullable=False)
    display_name = Column(String(100), nullable=False)
    role = Column(String(32), nullable=False, default="participant")  # host | participant
    session_id = Column(String(64), nullable=False, index=True)
    joined_at = Column(DateTime, nullable=False, default=datetime.utcnow)

    # Relationship back to meeting
    meeting = relationship("Meeting", back_populates="participants")
