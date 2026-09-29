'use client';

import React, { useState } from 'react';
import Link from 'next/link';
import { Calendar, Clock, Copy, Check, Video } from 'lucide-react';
import { Meeting } from '@/types';

interface MeetingCardProps {
  meeting: Meeting;
  isRecent?: boolean;
}

export default function MeetingCard({ meeting, isRecent = false }: MeetingCardProps) {
  const [copied, setCopied] = useState(false);

  const handleCopyLink = () => {
    const link =
      meeting.invite_link || `${window.location.origin}/meeting/${meeting.meeting_id}/lobby`;
    navigator.clipboard.writeText(link);
    setCopied(true);
    setTimeout(() => setCopied(false), 2000);
  };

  const formattedDate = new Date(meeting.scheduled_at).toLocaleDateString('en-US', {
    weekday: 'short',
    month: 'short',
    day: 'numeric',
    year: 'numeric',
  });

  const formattedTime = new Date(meeting.scheduled_at).toLocaleTimeString('en-US', {
    hour: '2-digit',
    minute: '2-digit',
  });

  return (
    <div className="meeting-card">
      <div className="meeting-info">
        <h4 className="meeting-title">{meeting.title}</h4>
        {meeting.description && <p className="meeting-desc">{meeting.description}</p>}

        <div className="meeting-meta">
          <div className="meta-item">
            <Calendar size={14} />
            <span>{formattedDate}</span>
          </div>
          <div className="meta-item">
            <Clock size={14} />
            <span>
              {formattedTime} ({meeting.duration_minutes} min)
            </span>
          </div>
          <div className="meta-item" style={{ color: 'var(--zoom-blue)', fontWeight: 600 }}>
            <span>ID: {meeting.meeting_id}</span>
          </div>
        </div>
      </div>

      <div className="meeting-actions">
        <button
          className="btn-secondary"
          onClick={handleCopyLink}
          title="Copy shareable invite link"
        >
          {copied ? <Check size={16} color="var(--zoom-green)" /> : <Copy size={16} />}
          <span>{copied ? 'Copied!' : 'Copy Link'}</span>
        </button>

        <Link
          href={`/meeting/${meeting.meeting_id}/lobby${isRecent ? '' : '?host=true'}`}
          className="btn-primary"
        >
          <Video size={16} />
          <span>{isRecent ? 'Rejoin' : 'Start'}</span>
        </Link>
      </div>
    </div>
  );
}
