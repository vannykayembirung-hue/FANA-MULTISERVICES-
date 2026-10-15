import { createHash, randomBytes, scryptSync, timingSafeEqual } from 'node:crypto';
import type { ApiRequest, ApiResponse } from './http';
import { ApiError, parseCookies } from './http.js';
import { ensureSchema } from './db.js';
import type { AppUser } from '../../src/types';

const COOKIE_NAME = 'fana_session';
const SESSION_DAYS = 30;

export function normalizeEmail(email: unknown): string {
  return typeof email === 'string' ? email.trim().toLowerCase() : '';
}

export function hashPassword(password: string): string {
  const salt = randomBytes(16);
  const derived = scryptSync(password, salt, 64, { N: 16384, r: 8, p: 1, maxmem: 64 * 1024 * 1024 });
  return `scrypt$${salt.toString('hex')}$${derived.toString('hex')}`;
}

export function verifyPassword(password: string, stored: string): boolean {
  try {
    const [algorithm, saltHex, hashHex] = stored.split('$');
    if (algorithm !== 'scrypt' || !saltHex || !hashHex) return false;
    const expected = Buffer.from(hashHex, 'hex');
    const actual = scryptSync(password, Buffer.from(saltHex, 'hex'), expected.length, {
      N: 16384, r: 8, p: 1, maxmem: 64 * 1024 * 1024,
    });
    return expected.length === actual.length && timingSafeEqual(expected, actual);
  } catch {
    return false;
  }
}

function hashToken(token: string): string {
  return createHash('sha256').update(token).digest('hex');
}

function isSecureRequest(req: ApiRequest): boolean {
  const forwarded = req.headers['x-forwarded-proto'];
  return process.env.VERCEL === '1' || forwarded === 'https';
}

export async function createSession(userId: string, res: ApiResponse, req: ApiRequest): Promise<void> {
  const db = await ensureSchema();
  const token = randomBytes(32).toString('base64url');
  const expiresAt = new Date(Date.now() + SESSION_DAYS * 24 * 60 * 60 * 1000);
  await db`DELETE FROM fana_sessions WHERE expires_at <= now()`;
  await db`INSERT INTO fana_sessions (token_hash, user_id, expires_at) VALUES (${hashToken(token)}, ${userId}, ${expiresAt})`;
  const secure = isSecureRequest(req) ? '; Secure' : '';
  res.setHeader('Set-Cookie', `${COOKIE_NAME}=${encodeURIComponent(token)}; Path=/; HttpOnly; SameSite=Lax; Max-Age=${SESSION_DAYS * 24 * 60 * 60}${secure}`);
}

export function clearSessionCookie(res: ApiResponse, req: ApiRequest): void {
  const secure = isSecureRequest(req) ? '; Secure' : '';
  res.setHeader('Set-Cookie', `${COOKIE_NAME}=; Path=/; HttpOnly; SameSite=Lax; Max-Age=0${secure}`);
}

export async function destroySession(req: ApiRequest): Promise<void> {
  const token = parseCookies(req)[COOKIE_NAME];
  if (!token) return;
  const db = await ensureSchema();
  await db`DELETE FROM fana_sessions WHERE token_hash = ${hashToken(token)}`;
}

export async function getCurrentUser(req: ApiRequest): Promise<AppUser | null> {
  const token = parseCookies(req)[COOKIE_NAME];
  if (!token) return null;
  const db = await ensureSchema();
  const [row] = await db`
    SELECT u.id, u.organization_id, o.name AS organization_name, u.name, u.email, u.role
    FROM fana_sessions s
    JOIN fana_users u ON u.id = s.user_id
    JOIN fana_organizations o ON o.id = u.organization_id
    WHERE s.token_hash = ${hashToken(token)} AND s.expires_at > now() AND u.is_active = true
    LIMIT 1
  `;
  if (!row) return null;
  return {
    id: row.id,
    organizationId: row.organization_id,
    organizationName: row.organization_name,
    name: row.name,
    email: row.email,
    role: row.role,
  };
}

export async function requireAuth(req: ApiRequest): Promise<AppUser> {
  const user = await getCurrentUser(req);
  if (!user) throw new ApiError(401, 'Votre session a expiré. Connectez-vous à nouveau.', 'AUTH_REQUIRED');
  return user;
}

export function requireManager(user: AppUser): void {
  if (user.role !== 'ADMIN' && user.role !== 'GERANT') {
    throw new ApiError(403, 'Cette action est réservée au gérant du magasin.', 'FORBIDDEN');
  }
}
