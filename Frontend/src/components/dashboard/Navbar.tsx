'use client';

import React from 'react';
import Link from 'next/link';
import { Video, Settings, Search } from 'lucide-react';

export default function Navbar() {
  return (
    <header className="navbar">
      <div className="nav-brand">
        <Link href="/" style={{ display: 'flex', alignItems: 'center', gap: '8px' }}>
          <div
            style={{
              background: 'var(--zoom-blue)',
              color: 'white',
              borderRadius: '8px',
              padding: '6px',
              display: 'flex',
              alignItems: 'center',
              justifyContent: 'center',
            }}
          >
            <Video size={20} />
          </div>
          <span style={{ fontSize: '22px', fontWeight: 800, color: 'var(--zoom-blue)', letterSpacing: '-0.5px' }}>
            zoom
          </span>
        </Link>
      </div>

      <nav className="nav-links">
        <Link href="/" className="nav-link active">
          Home
        </Link>
        <Link href="/schedule" className="nav-link">
          Schedule
        </Link>
        <Link href="/join" className="nav-link">
          Join
        </Link>
      </nav>

      <div className="nav-profile">
        <div
          style={{
            display: 'flex',
            alignItems: 'center',
            background: '#F1F5F9',
            padding: '6px 12px',
            borderRadius: '20px',
            gap: '8px',
            fontSize: '13px',
            color: 'var(--text-muted)',
          }}
        >
          <Search size={14} />
          <span>Search</span>
        </div>

        <button
          title="Settings"
          style={{
            padding: '8px',
            borderRadius: '50%',
            color: 'var(--text-muted)',
            display: 'flex',
            alignItems: 'center',
            justifyContent: 'center',
          }}
        >
          <Settings size={18} />
        </button>

        <div className="profile-avatar" title="Logged in as Atithi (Default Host)">
          A
        </div>
      </div>
    </header>
  );
}
