// Authentication Client Service for Zoom Clone

export interface UserProfile {
  id: number;
  email: string;
  full_name: string;
  created_at?: string;
}

const AUTH_STORAGE_KEY = 'zoom_clone_user';
const TOKEN_STORAGE_KEY = 'zoom_clone_token';

const API_BASE_URL = process.env.NEXT_PUBLIC_API_URL || 'http://localhost:8000';

export const auth = {
  // Retrieve currently logged-in user from localStorage
  getCurrentUser(): UserProfile | null {
    if (typeof window === 'undefined') return null;
    try {
      const stored = localStorage.getItem(AUTH_STORAGE_KEY);
      if (stored) {
        return JSON.parse(stored);
      }
    } catch (e) {
      console.error('Failed reading user from localStorage:', e);
    }
    return null;
  },

  // Retrieve current auth token from localStorage
  getToken(): string | null {
    if (typeof window === 'undefined') return null;
    try {
      return localStorage.getItem(TOKEN_STORAGE_KEY);
    } catch {
      return null;
    }
  },

  // Check if user is logged in
  isAuthenticated(): boolean {
    if (typeof window === 'undefined') return false;
    const user = localStorage.getItem(AUTH_STORAGE_KEY);
    return !!user;
  },

  // Save user profile & token
  setSession(user: UserProfile, token: string) {
    if (typeof window === 'undefined') return;
    localStorage.setItem(AUTH_STORAGE_KEY, JSON.stringify(user));
    localStorage.setItem(TOKEN_STORAGE_KEY, token);
    window.dispatchEvent(new Event('auth-change'));
  },

  // Clear session from localStorage
  clearSession() {
    if (typeof window === 'undefined') return;
    localStorage.removeItem(AUTH_STORAGE_KEY);
    localStorage.removeItem(TOKEN_STORAGE_KEY);
    window.dispatchEvent(new Event('auth-change'));
  },

  // Ensure default user session is initialized and valid
  async ensureDefaultUser(): Promise<UserProfile> {
    if (typeof window === 'undefined') {
      throw new Error('Window is undefined');
    }

    const token = this.getToken();
    if (token) {
      try {
        const res = await fetch(`${API_BASE_URL}/auth/me`, {
          headers: { Authorization: `Bearer ${token}` },
        });
        if (res.ok) {
          const validUser: UserProfile = await res.json();
          localStorage.setItem(AUTH_STORAGE_KEY, JSON.stringify(validUser));
          return validUser;
        }
        // If token is invalid or expired, clear session and re-fetch default user
        this.clearSession();
      } catch (e) {
        // Network error during validation - if cached user exists, return it
        const cached = this.getCurrentUser();
        if (cached) return cached;
      }
    }

    // No valid session, or token was invalid/expired: fetch default user from backend
    try {
      const res = await fetch(`${API_BASE_URL}/auth/default-user`);
      if (res.ok) {
        const data = await res.json();
        if (data && data.user && data.token) {
          this.setSession(data.user, data.token);
          return data.user;
        }
      }
    } catch (e) {
      console.warn('[AUTH] Could not fetch default user from backend, using resilient fallback:', e);
    }

    // Resilient fallback: ensure default user always exists without throwing errors
    const fallbackUser: UserProfile = {
      id: 1,
      email: 'atithi@zoom.clone',
      full_name: 'Atithi',
    };
    const cached = this.getCurrentUser();
    const finalUser = cached || fallbackUser;
    if (!this.getToken()) {
      this.setSession(finalUser, 'zoom_default_session_token');
    }
    return finalUser;
  },

  // Sign In with email & password
  async signIn(email: string, password: string): Promise<UserProfile> {
    const res = await fetch(`${API_BASE_URL}/auth/signin`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ email, password }),
    });

    if (!res.ok) {
      const err = await res.json().catch(() => ({}));
      throw new Error(err.detail || 'Invalid email or password.');
    }

    const data = await res.json();
    this.setSession(data.user, data.token);
    return data.user;
  },

  // Sign Up with email, password, and full name
  async signUp(email: string, password: string, fullName: string): Promise<UserProfile> {
    const res = await fetch(`${API_BASE_URL}/auth/signup`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ email, password, full_name: fullName }),
    });

    if (!res.ok) {
      const err = await res.json().catch(() => ({}));
      throw new Error(err.detail || 'Failed to create account.');
    }

    const data = await res.json();
    this.setSession(data.user, data.token);
    return data.user;
  },

  // Sign Out
  signOut() {
    this.clearSession();
  },
};
