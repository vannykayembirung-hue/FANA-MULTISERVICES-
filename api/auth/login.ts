import { ensureSchema } from '../_lib/db.js';
import { ApiError, assertSameOrigin, getRequestBody, requireMethod, sendJson, withApiErrors } from '../_lib/http.js';
import { createSession, normalizeEmail, verifyPassword } from '../_lib/auth.js';
import { clearLoginRateLimit, consumeAuthRateLimit } from '../_lib/rateLimit.js';

export default withApiErrors(async (req, res) => {
  requireMethod(req, ['POST']);
  assertSameOrigin(req);
  const body = getRequestBody(req);
  const email = normalizeEmail(body.email);
  const password = typeof body.password === 'string' ? body.password : '';
  if (!email || !password) throw new ApiError(400, 'Entrez votre adresse e-mail et votre mot de passe.');
  if (email.length > 254 || password.length > 128) throw new ApiError(400, 'Adresse e-mail ou mot de passe trop long.');

  const db = await ensureSchema();
  await consumeAuthRateLimit(db, req, 'login', email);
  const [row] = await db`
    SELECT u.id, u.organization_id, o.name AS organization_name, u.name, u.email, u.role, u.password_hash
    FROM fana_users u
    JOIN fana_organizations o ON o.id = u.organization_id
    WHERE u.email = ${email} AND u.is_active = true
    LIMIT 1
  `;
  if (!row || !verifyPassword(password, row.password_hash)) {
    throw new ApiError(401, 'Adresse e-mail ou mot de passe incorrect.');
  }

  await clearLoginRateLimit(db, req, email);
  await createSession(row.id, res, req);
  sendJson(res, 200, {
    user: {
      id: row.id,
      organizationId: row.organization_id,
      organizationName: row.organization_name,
      name: row.name,
      email: row.email,
      role: row.role,
    },
  });
});
