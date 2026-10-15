import { randomUUID } from 'node:crypto';
import { ensureSchema } from '../_lib/db';
import { ApiError, assertSameOrigin, getRequestBody, requireMethod, sendJson, withApiErrors } from '../_lib/http';
import { createSession, hashPassword, normalizeEmail } from '../_lib/auth';
import { consumeAuthRateLimit } from '../_lib/rateLimit';

export default withApiErrors(async (req, res) => {
  requireMethod(req, ['POST']);
  assertSameOrigin(req);
  const body = getRequestBody(req);
  const name = typeof body.name === 'string' ? body.name.trim() : '';
  const organizationName = typeof body.organizationName === 'string' ? body.organizationName.trim() : '';
  const email = normalizeEmail(body.email);
  const password = typeof body.password === 'string' ? body.password : '';

  if (name.length < 2 || name.length > 80) throw new ApiError(400, 'Entrez votre nom (2 à 80 caractères).');
  if (organizationName.length < 2 || organizationName.length > 100) throw new ApiError(400, 'Entrez le nom de votre magasin ou entreprise.');
  if (!/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(email) || email.length > 254) throw new ApiError(400, 'Adresse e-mail invalide.');
  if (password.length < 10 || password.length > 128) throw new ApiError(400, 'Le mot de passe doit contenir au moins 10 caractères.');

  const db = await ensureSchema();
  await consumeAuthRateLimit(db, req, 'register');
  const passwordHash = hashPassword(password);
  const organizationId = randomUUID();
  const userId = randomUUID();

  try {
    await db.begin(async tx => {
      await tx`INSERT INTO fana_organizations (id, name) VALUES (${organizationId}, ${organizationName})`;
      await tx`
        INSERT INTO fana_users (id, organization_id, name, email, password_hash, role)
        VALUES (${userId}, ${organizationId}, ${name}, ${email}, ${passwordHash}, 'ADMIN')
      `;
    });
  } catch (error) {
    if ((error as any)?.code === '23505') throw new ApiError(409, 'Un compte existe déjà avec cette adresse e-mail.');
    throw error;
  }

  await createSession(userId, res, req);
  sendJson(res, 201, {
    user: { id: userId, organizationId, organizationName, name, email, role: 'ADMIN' },
  });
});
