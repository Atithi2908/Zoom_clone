'use client';

import React, { useState } from 'react';
import Link from 'next/link';
import { useRouter } from 'next/navigation';
import { Lock, Mail, User, Eye, EyeOff, Loader2, AlertCircle, ArrowLeft } from 'lucide-react';
import { auth } from '@/lib/auth';

export default function SignUpPage() {
  const router = useRouter();
  const [fullName, setFullName] = useState('');
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [showPassword, setShowPassword] = useState(false);
  const [isLoading, setIsLoading] = useState(false);
  const [errorMessage, setErrorMessage] = useState<string | null>(null);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!fullName.trim() || !email.trim() || !password.trim()) {
      setErrorMessage('Please fill out all fields.');
      return;
    }
    if (password.length < 6) {
      setErrorMessage('Password must be at least 6 characters.');
      return;
    }

    try {
      setIsLoading(true);
      setErrorMessage(null);
      await auth.signUp(email.trim(), password, fullName.trim());
      router.push('/dashboard');
    } catch (err: any) {
      setErrorMessage(err.message || 'Failed to create account.');
    } finally {
      setIsLoading(false);
    }
  };

  return (
    <div
      style={{
        minHeight: '100vh',
        backgroundColor: '#F7F9FA',
        display: 'flex',
        flexDirection: 'column',
      }}
    >
      {/* Header */}
      <header
        style={{
          padding: '20px 32px',
          display: 'flex',
          alignItems: 'center',
          justifyContent: 'space-between',
        }}
      >
        <Link
          href="/"
          style={{
            fontSize: '28px',
            fontWeight: 800,
            color: '#0E71EB',
            letterSpacing: '-1px',
            textDecoration: 'none',
          }}
        >
          zoom
        </Link>
        <div style={{ fontSize: '14px', color: '#64748B' }}>
          Already have an account?{' '}
          <Link
            href="/signin"
            style={{ color: '#0E71EB', fontWeight: 600, textDecoration: 'none' }}
          >
            Sign In
          </Link>
        </div>
      </header>

      {/* Main Sign-Up Card */}
      <div
        style={{
          flex: 1,
          display: 'flex',
          alignItems: 'center',
          justifyContent: 'center',
          padding: '24px 16px',
        }}
      >
        <div
          style={{
            width: '100%',
            maxWidth: '460px',
            backgroundColor: '#FFFFFF',
            borderRadius: '16px',
            border: '1px solid #E2E8F0',
            boxShadow: '0 8px 30px rgba(0, 0, 0, 0.06)',
            padding: '40px 36px',
          }}
        >
          <div style={{ textAlign: 'center', marginBottom: '28px' }}>
            <h1
              style={{
                fontSize: '24px',
                fontWeight: 700,
                color: '#1E293B',
                marginBottom: '6px',
              }}
            >
              Sign Up Free
            </h1>
            <p style={{ fontSize: '14px', color: '#64748B' }}>
              Create your Zoom Workplace account
            </p>
          </div>

          {errorMessage && (
            <div
              style={{
                display: 'flex',
                alignItems: 'center',
                gap: '10px',
                backgroundColor: '#FEF2F2',
                border: '1px solid #FCA5A5',
                color: '#991B1B',
                padding: '12px 14px',
                borderRadius: '8px',
                fontSize: '13px',
                marginBottom: '20px',
              }}
            >
              <AlertCircle size={16} style={{ flexShrink: 0 }} />
              <span>{errorMessage}</span>
            </div>
          )}

          <form onSubmit={handleSubmit} action="javascript:void(0);">
            <div style={{ marginBottom: '18px' }}>
              <label
                style={{
                  display: 'block',
                  fontSize: '13px',
                  fontWeight: 600,
                  color: '#334155',
                  marginBottom: '8px',
                }}
              >
                Full Name
              </label>
              <div style={{ position: 'relative' }}>
                <input
                  type="text"
                  required
                  placeholder="e.g. atithi jaiman"
                  value={fullName}
                  onChange={(e) => setFullName(e.target.value)}
                  style={{
                    width: '100%',
                    padding: '11px 14px 11px 38px',
                    borderRadius: '8px',
                    border: '1px solid #CBD5E1',
                    fontSize: '14px',
                    outline: 'none',
                    color: '#1E293B',
                    boxSizing: 'border-box',
                  }}
                />
                <User
                  size={16}
                  style={{
                    position: 'absolute',
                    left: '12px',
                    top: '50%',
                    transform: 'translateY(-50%)',
                    color: '#94A3B8',
                  }}
                />
              </div>
            </div>

            <div style={{ marginBottom: '18px' }}>
              <label
                style={{
                  display: 'block',
                  fontSize: '13px',
                  fontWeight: 600,
                  color: '#334155',
                  marginBottom: '8px',
                }}
              >
                Work Email Address
              </label>
              <div style={{ position: 'relative' }}>
                <input
                  type="email"
                  required
                  placeholder="name@company.com"
                  value={email}
                  onChange={(e) => setEmail(e.target.value)}
                  style={{
                    width: '100%',
                    padding: '11px 14px 11px 38px',
                    borderRadius: '8px',
                    border: '1px solid #CBD5E1',
                    fontSize: '14px',
                    outline: 'none',
                    color: '#1E293B',
                    boxSizing: 'border-box',
                  }}
                />
                <Mail
                  size={16}
                  style={{
                    position: 'absolute',
                    left: '12px',
                    top: '50%',
                    transform: 'translateY(-50%)',
                    color: '#94A3B8',
                  }}
                />
              </div>
            </div>

            <div style={{ marginBottom: '24px' }}>
              <label
                style={{
                  display: 'block',
                  fontSize: '13px',
                  fontWeight: 600,
                  color: '#334155',
                  marginBottom: '8px',
                }}
              >
                Password (min. 6 characters)
              </label>
              <div style={{ position: 'relative' }}>
                <input
                  type={showPassword ? 'text' : 'password'}
                  required
                  minLength={6}
                  placeholder="Create a strong password"
                  value={password}
                  onChange={(e) => setPassword(e.target.value)}
                  style={{
                    width: '100%',
                    padding: '11px 40px 11px 38px',
                    borderRadius: '8px',
                    border: '1px solid #CBD5E1',
                    fontSize: '14px',
                    outline: 'none',
                    color: '#1E293B',
                    boxSizing: 'border-box',
                  }}
                />
                <Lock
                  size={16}
                  style={{
                    position: 'absolute',
                    left: '12px',
                    top: '50%',
                    transform: 'translateY(-50%)',
                    color: '#94A3B8',
                  }}
                />
                <button
                  type="button"
                  onClick={() => setShowPassword(!showPassword)}
                  style={{
                    position: 'absolute',
                    right: '12px',
                    top: '50%',
                    transform: 'translateY(-50%)',
                    background: 'none',
                    border: 'none',
                    color: '#94A3B8',
                    cursor: 'pointer',
                    padding: 0,
                  }}
                >
                  {showPassword ? <EyeOff size={16} /> : <Eye size={16} />}
                </button>
              </div>
            </div>

            <button
              type="submit"
              disabled={isLoading}
              style={{
                width: '100%',
                backgroundColor: '#0E71EB',
                color: '#FFFFFF',
                border: 'none',
                borderRadius: '8px',
                padding: '12px',
                fontSize: '15px',
                fontWeight: 600,
                cursor: isLoading ? 'not-allowed' : 'pointer',
                display: 'flex',
                alignItems: 'center',
                justifyContent: 'center',
                gap: '8px',
                transition: 'background-color 0.15s ease',
              }}
              onMouseEnter={(e) => (e.currentTarget.style.backgroundColor = '#0B5CBE')}
              onMouseLeave={(e) => (e.currentTarget.style.backgroundColor = '#0E71EB')}
            >
              {isLoading ? (
                <>
                  <Loader2 size={18} className="animate-spin" />
                  <span>Creating Account...</span>
                </>
              ) : (
                'Sign Up'
              )}
            </button>
          </form>

          <p
            style={{
              fontSize: '12px',
              color: '#94A3B8',
              textAlign: 'center',
              marginTop: '20px',
              lineHeight: 1.5,
            }}
          >
            By signing up, you agree to Zoom's Terms of Service and Privacy Statement.
          </p>

          <div style={{ textAlign: 'center', marginTop: '20px' }}>
            <Link
              href="/"
              style={{
                display: 'inline-flex',
                alignItems: 'center',
                gap: '6px',
                fontSize: '13px',
                color: '#64748B',
                textDecoration: 'none',
              }}
            >
              <ArrowLeft size={14} />
              <span>Back to Home</span>
            </Link>
          </div>
        </div>
      </div>

      {/* Footer */}
      <footer
        style={{
          padding: '16px',
          textAlign: 'center',
          fontSize: '12px',
          color: '#94A3B8',
          borderTop: '1px solid #E2E8F0',
        }}
      >
        &copy; 2024 Zoom Communications, Inc. All rights reserved.
      </footer>
    </div>
  );
}
