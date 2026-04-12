import type { LoginRequest, LoginResponse, RefreshTokenResponse } from '@platform/types';

const TOKEN_KEY = 'platform_auth_token';
const REFRESH_TOKEN_KEY = 'platform_refresh_token';
const EXPIRES_AT_KEY = 'platform_token_expires_at';
const USER_KEY = 'platform_auth_user';

export interface StoredUser {
  id: string;
  name: string;
  role: string;
  business: string;
}

// ─── Storage helpers ──────────────────────────────────────────────────────────

function safeStorage(): Storage | null {
  try {
    return window.localStorage;
  } catch {
    return null;
  }
}

export function getToken(): string | null {
  return safeStorage()?.getItem(TOKEN_KEY) ?? null;
}

export function getRefreshToken(): string | null {
  return safeStorage()?.getItem(REFRESH_TOKEN_KEY) ?? null;
}

export function getExpiresAt(): number {
  const v = safeStorage()?.getItem(EXPIRES_AT_KEY);
  return v ? parseInt(v, 10) : 0;
}

export function getStoredUser(): StoredUser | null {
  const raw = safeStorage()?.getItem(USER_KEY);
  if (!raw) return null;
  try {
    return JSON.parse(raw) as StoredUser;
  } catch {
    return null;
  }
}

export function storeAuthResult(result: LoginResponse): void {
  const storage = safeStorage();
  if (!storage) return;
  storage.setItem(TOKEN_KEY, result.token);
  storage.setItem(REFRESH_TOKEN_KEY, result.refreshToken);
  storage.setItem(EXPIRES_AT_KEY, String(result.expiresAt));
  storage.setItem(USER_KEY, JSON.stringify(result.user));
}

export function clearAuth(): void {
  const storage = safeStorage();
  if (!storage) return;
  storage.removeItem(TOKEN_KEY);
  storage.removeItem(REFRESH_TOKEN_KEY);
  storage.removeItem(EXPIRES_AT_KEY);
  storage.removeItem(USER_KEY);
}

// ─── Token lifecycle ──────────────────────────────────────────────────────────

/** Returns true if the current token will expire within the next 60 seconds */
export function isTokenExpiringSoon(): boolean {
  const expiresAt = getExpiresAt();
  if (!expiresAt) return true;
  return Date.now() > expiresAt - 60_000;
}

export function isAuthenticated(): boolean {
  const token = getToken();
  const expiresAt = getExpiresAt();
  return !!token && Date.now() < expiresAt;
}

// ─── API calls ────────────────────────────────────────────────────────────────

export async function loginRequest(
  baseUrl: string,
  tenantSlug: string,
  payload: LoginRequest,
): Promise<LoginResponse> {
  const res = await fetch(`${baseUrl}/api/${tenantSlug}/auth/login`, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify(payload),
  });
  if (!res.ok) {
    const body = await res.json().catch(() => ({})) as Record<string, unknown>;
    throw new Error((body['error'] as string | undefined) ?? `Login failed: ${res.status}`);
  }
  const data = await res.json() as LoginResponse;
  storeAuthResult(data);
  return data;
}

export async function refreshTokenRequest(
  baseUrl: string,
  tenantSlug: string,
): Promise<RefreshTokenResponse | null> {
  const refreshToken = getRefreshToken();
  if (!refreshToken) return null;
  try {
    const res = await fetch(`${baseUrl}/api/${tenantSlug}/auth/refresh`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ refreshToken }),
    });
    if (!res.ok) return null;
    const data = await res.json() as RefreshTokenResponse;
    const storage = safeStorage();
    if (storage) {
      storage.setItem(TOKEN_KEY, data.token);
      storage.setItem(EXPIRES_AT_KEY, String(data.expiresAt));
    }
    return data;
  } catch {
    return null;
  }
}

export function logoutRequest(baseUrl: string, tenantSlug: string): void {
  const token = getToken();
  clearAuth();
  if (token) {
    // Fire-and-forget — don't block logout on server response
    fetch(`${baseUrl}/api/${tenantSlug}/auth/logout`, {
      method: 'POST',
      headers: { Authorization: `Bearer ${token}` },
    }).catch(() => {/* noop */});
  }
}
