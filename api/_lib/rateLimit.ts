import { createHash } from 'node:crypto';
import type { ApiRequest } from './http';
import { ApiError } from './http';

function requestIp(req: ApiRequest): string {
  const forwarded = req.headers['x-forwarded-for'];
  const firstForwarded = Array.isArray(forwarded) ? forwarded[0] : forwarded?.split(',')[0];
  const value = firstForwarded?.trim() || req.socket.remoteAddress || 'unknown';
  return value.replace(/^::ffff:/, '').slice(0, 80);
}

function hashBucket(value: string): string {
  const salt = process.env.FANA_RATE_LIMIT_SALT || '';
  return createHash('sha256').update(salt).update(':').update(value).digest('hex');
}

function authBuckets(req: ApiRequest, purpose: 'login' | 'register', email?: string): Array<{ hash: string; limit: number; windowSeconds: number }> {
  const ip = requestIp(req);
  if (purpose === 'register') {
    return [{ hash: hashBucket(`register:ip:${ip}`), limit: 5, windowSeconds: 60 * 60 }];
  }
  const buckets = [{ hash: hashBucket(`login:ip:${ip}`), limit: 30, windowSeconds: 15 * 60 }];
  if (email) buckets.push({ hash: hashBucket(`login:email:${email.trim().toLowerCase()}`), limit: 10, windowSeconds: 15 * 60 });
  return buckets;
}

export async function consumeAuthRateLimit(db: any, req: ApiRequest, purpose: 'login' | 'register', email?: string): Promise<void> {
  const buckets = authBuckets(req, purpose, email);
  for (const bucket of buckets) {
    const [row] = await db`
      INSERT INTO fana_auth_rate_limits (bucket_hash, window_started_at, attempts)
      VALUES (${bucket.hash}, now(), 1)
      ON CONFLICT (bucket_hash) DO UPDATE SET
        attempts = CASE
          WHEN fana_auth_rate_limits.window_started_at <= now() - (${bucket.windowSeconds} * interval '1 second') THEN 1
          ELSE fana_auth_rate_limits.attempts + 1
        END,
        window_started_at = CASE
          WHEN fana_auth_rate_limits.window_started_at <= now() - (${bucket.windowSeconds} * interval '1 second') THEN now()
          ELSE fana_auth_rate_limits.window_started_at
        END
      RETURNING attempts, window_started_at
    `;
    if (Number(row?.attempts) > bucket.limit) {
      const minutes = Math.ceil(bucket.windowSeconds / 60);
      throw new ApiError(429, `Trop de tentatives. Réessayez dans environ ${minutes} minute(s).`, 'RATE_LIMITED');
    }
  }
  await db`DELETE FROM fana_auth_rate_limits WHERE window_started_at < now() - interval '2 days'`;
}

export async function clearLoginRateLimit(db: any, req: ApiRequest, email: string): Promise<void> {
  for (const bucket of authBuckets(req, 'login', email)) {
    await db`DELETE FROM fana_auth_rate_limits WHERE bucket_hash = ${bucket.hash}`;
  }
}
