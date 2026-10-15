import type { IncomingMessage, ServerResponse } from 'node:http';

export type ApiRequest = IncomingMessage & {
  body?: any;
  cookies?: Record<string, string>;
};
export type ApiResponse = ServerResponse & {
  status?: (code: number) => ApiResponse;
  json?: (value: unknown) => void;
  send?: (value: unknown) => void;
};
export type ApiHandler = (req: ApiRequest, res: ApiResponse) => Promise<void> | void;

export class ApiError extends Error {
  statusCode: number;
  code?: string;
  constructor(statusCode: number, message: string, code?: string) {
    super(message);
    this.name = 'ApiError';
    this.statusCode = statusCode;
    this.code = code;
  }
}

export function sendJson(res: ApiResponse, statusCode: number, body: unknown): void {
  res.setHeader('Cache-Control', 'private, no-store, max-age=0');
  res.setHeader('Pragma', 'no-cache');
  res.setHeader('X-Content-Type-Options', 'nosniff');
  if (res.status) {
    res.status(statusCode).json?.(body);
    return;
  }
  res.statusCode = statusCode;
  res.setHeader('Content-Type', 'application/json; charset=utf-8');
  res.end(JSON.stringify(body));
}

export function withApiErrors(handler: ApiHandler): ApiHandler {
  return async (req, res) => {
    try {
      await handler(req, res);
    } catch (error) {
      const statusCode = error instanceof ApiError
        ? error.statusCode
        : typeof (error as any)?.statusCode === 'number'
          ? (error as any).statusCode
          : 500;
      const message = error instanceof Error ? error.message : 'Une erreur inattendue est survenue.';
      if (statusCode >= 500) console.error('[FANA API]', error);
      sendJson(res, statusCode, {
        error: statusCode >= 500 && statusCode !== 503 ? 'Erreur du serveur. Réessayez dans quelques instants.' : message,
        code: error instanceof ApiError ? error.code : undefined,
      });
    }
  };
}

export function requireMethod(req: ApiRequest, allowed: string[]): void {
  if (!req.method || !allowed.includes(req.method.toUpperCase())) {
    throw new ApiError(405, 'Méthode non autorisée.');
  }
}

/** SameSite cookies plus an origin check protect cookie-authenticated writes from CSRF. */
export function assertSameOrigin(req: ApiRequest): void {
  const origin = req.headers.origin;
  if (!origin) return; // Native browser form submission / local CLI.
  const forwardedHost = req.headers['x-forwarded-host'];
  const host = (Array.isArray(forwardedHost) ? forwardedHost[0] : forwardedHost) || req.headers.host;
  if (!host) return;
  try {
    const parsed = new URL(origin);
    if (parsed.host !== host) throw new ApiError(403, 'Origine de requête invalide.');
  } catch (error) {
    if (error instanceof ApiError) throw error;
    throw new ApiError(403, 'Origine de requête invalide.');
  }
}

export function parseCookies(req: ApiRequest): Record<string, string> {
  if (req.cookies) return req.cookies;
  const raw = req.headers.cookie || '';
  return Object.fromEntries(raw.split(';').map(part => {
    const index = part.indexOf('=');
    if (index < 0) return ['', ''];
    const key = part.slice(0, index).trim();
    const value = part.slice(index + 1).trim();
    try { return [key, decodeURIComponent(value)]; } catch { return [key, value]; }
  }).filter(([key]) => Boolean(key)));
}

export function getRequestBody(req: ApiRequest): Record<string, any> {
  const body = req.body;
  if (body && typeof body === 'object' && !Array.isArray(body)) return body;
  if (typeof body === 'string') {
    try {
      const parsed = JSON.parse(body);
      if (parsed && typeof parsed === 'object' && !Array.isArray(parsed)) return parsed;
    } catch { /* use the validation error below */ }
  }
  throw new ApiError(400, 'Corps JSON manquant ou invalide.');
}
