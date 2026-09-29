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

  // Sign In with email & password
  async signIn(email: string, password: string):Promise<UserProfile> {
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
    if (typeof window === 'undefined') return;
    localStorage.removeItem(AUTH_STORAGE_KEY);
    localStorage.removeItem(TOKEN_STORAGE_KEY);
    window.dispatchEvent(new Event('auth-change'));
  },
};
