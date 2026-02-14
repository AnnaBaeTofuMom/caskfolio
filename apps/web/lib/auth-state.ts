export const AUTH_STATE_CHANGED_EVENT = 'caskfolio-auth-changed';

export function hasAccessToken(storage: Pick<Storage, 'getItem'> | null): boolean {
  if (!storage) return false;
  return Boolean(storage.getItem('caskfolio_access_token'));
}

export type AuthContext = {
  token: string;
  email: string | null;
  role: 'USER' | 'ADMIN' | null;
};

export function readAuthContext(storage: Pick<Storage, 'getItem'> | null): AuthContext | null {
  if (!storage) return null;
  const token = storage.getItem('caskfolio_access_token');
  if (!token) return null;
  const fallbackEmail = storage.getItem('caskfolio_user_email');

  const payload = decodeJwtPayload(token);
  const exp = typeof payload?.exp === 'number' ? payload.exp : null;
  if (exp && exp * 1000 <= Date.now()) {
    return null;
  }
  const email = typeof payload?.email === 'string' ? payload.email : fallbackEmail;
  if (!email) {
    // Backend identifies user by email header in this MVP, so token-only state is treated as unauthenticated.
    return null;
  }
  return {
    token,
    email,
    role: payload?.role === 'ADMIN' ? 'ADMIN' : payload?.role === 'USER' ? 'USER' : null
  };
}

export function clearAuthState(storage: Pick<Storage, 'removeItem'>): void {
  storage.removeItem('caskfolio_access_token');
  storage.removeItem('caskfolio_refresh_token');
  storage.removeItem('caskfolio_user_email');
  storage.removeItem('caskfolio_user_name');
}

function decodeJwtPayload(token: string): Record<string, unknown> | null {
  const parts = token.split('.');
  if (parts.length < 2) return null;
  try {
    const base64 = parts[1].replace(/-/g, '+').replace(/_/g, '/');
    const padded = base64.padEnd(Math.ceil(base64.length / 4) * 4, '=');
    const json = atob(padded);
    return JSON.parse(json) as Record<string, unknown>;
  } catch {
    return null;
  }
}
