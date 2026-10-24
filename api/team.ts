import { randomUUID } from 'node:crypto';
import { ensureSchema } from './_lib/db.js';
import { hashPassword, normalizeEmail, requireAuth } from './_lib/auth.js';
import { ApiError, assertSameOrigin, getRequestBody, requireMethod, sendJson, withApiErrors } from './_lib/http.js';
import type { UserRole } from '../src/types';

const VALID_ROLES: UserRole[] = ['ADMIN', 'GERANT', 'CAISSIER'];
const UUID_PATTERN = /^[0-9a-f]{8}-[0-9a-f]{4}-[1-8][0-9a-f]{3}-[89ab][0-9a-f]{3}-[0-9a-f]{12}$/i;

function requireBoss(role: UserRole): void {
  if (role !== 'ADMIN') throw new ApiError(403, 'La gestion des comptes est réservée au Boss.', 'FORBIDDEN');
}

async function listMembers(db: any, organizationId: string) {
  const rows = await db`
    SELECT id, name, email, role, is_active, created_at
    FROM fana_users
    WHERE organization_id = ${organizationId}
    ORDER BY created_at ASC, name ASC
  `;
  return rows.map((row: any) => ({
    id: row.id,
    name: row.name,
    email: row.email,
    role: row.role as UserRole,
    isActive: Boolean(row.is_active),
    createdAt: new Date(row.created_at).toISOString(),
  }));
}

export default withApiErrors(async (req, res) => {
  const db = await ensureSchema();
  requireMethod(req, ['GET', 'POST']);
  const actor = await requireAuth(req);
  requireBoss(actor.role);

  if (req.method === 'GET') {
    sendJson(res, 200, { members: await listMembers(db, actor.organizationId) });
    return;
  }

  assertSameOrigin(req);
  const body = getRequestBody(req);
  const action = typeof body.action === 'string' ? body.action : '';

  if (action === 'create') {
    const name = typeof body.name === 'string' ? body.name.trim() : '';
    const email = normalizeEmail(body.email);
    const password = typeof body.password === 'string' ? body.password : '';
    const role = body.role as UserRole;
    if (name.length < 2 || name.length > 80) throw new ApiError(400, 'Le nom doit contenir entre 2 et 80 caractères.');
    if (!/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(email) || email.length > 254) throw new ApiError(400, 'Adresse e-mail invalide.');
    if (password.length < 10 || password.length > 128) throw new ApiError(400, 'Le mot de passe doit contenir au moins 10 caractères.');
    if (!VALID_ROLES.includes(role)) throw new ApiError(400, 'Sélectionnez un rôle valide.');

    const userId = randomUUID();
    const passwordHash = hashPassword(password);
    try {
      await db.begin(async (tx: any) => {
        await tx`SELECT id FROM fana_organizations WHERE id = ${actor.organizationId} FOR UPDATE`;
        await tx`
          INSERT INTO fana_users (id, organization_id, name, email, password_hash, role)
          VALUES (${userId}, ${actor.organizationId}, ${name}, ${email}, ${passwordHash}, ${role})
        `;
      });
    } catch (error) {
      if ((error as any)?.code === '23505') throw new ApiError(409, 'Un compte existe déjà avec cette adresse e-mail.');
      throw error;
    }
  } else if (action === 'update-role' || action === 'set-active') {
    const memberId = typeof body.memberId === 'string' ? body.memberId.trim() : '';
    if (!UUID_PATTERN.test(memberId)) throw new ApiError(400, 'Compte sélectionné invalide.');
    if (memberId === actor.id) throw new ApiError(409, 'Pour modifier votre propre compte, connectez-vous avec un autre Boss.');

    await db.begin(async (tx: any) => {
      // Serialize account changes within this organization so the last active Boss cannot be removed.
      await tx`SELECT id FROM fana_organizations WHERE id = ${actor.organizationId} FOR UPDATE`;
      const [member] = await tx`
        SELECT id, role, is_active
        FROM fana_users
        WHERE id = ${memberId} AND organization_id = ${actor.organizationId}
        FOR UPDATE
      `;
      if (!member) throw new ApiError(404, 'Ce compte n’existe pas dans votre magasin.');

      if (action === 'update-role') {
        const role = body.role as UserRole;
        if (!VALID_ROLES.includes(role)) throw new ApiError(400, 'Sélectionnez un rôle valide.');
        if (member.role === 'ADMIN' && member.is_active && role !== 'ADMIN') {
          const [remaining] = await tx`
            SELECT count(*)::int AS count
            FROM fana_users
            WHERE organization_id = ${actor.organizationId}
              AND role = 'ADMIN' AND is_active = true AND id <> ${memberId}
          `;
          if (Number(remaining?.count || 0) < 1) throw new ApiError(409, 'Gardez au moins un Boss actif dans le magasin.');
        }
        await tx`UPDATE fana_users SET role = ${role} WHERE id = ${memberId} AND organization_id = ${actor.organizationId}`;
      } else {
        if (typeof body.isActive !== 'boolean') throw new ApiError(400, 'État du compte invalide.');
        if (!body.isActive && member.role === 'ADMIN' && member.is_active) {
          const [remaining] = await tx`
            SELECT count(*)::int AS count
            FROM fana_users
            WHERE organization_id = ${actor.organizationId}
              AND role = 'ADMIN' AND is_active = true AND id <> ${memberId}
          `;
          if (Number(remaining?.count || 0) < 1) throw new ApiError(409, 'Gardez au moins un Boss actif dans le magasin.');
        }
        await tx`UPDATE fana_users SET is_active = ${body.isActive} WHERE id = ${memberId} AND organization_id = ${actor.organizationId}`;
      }
    });
  } else {
    throw new ApiError(400, 'Action de gestion des comptes inconnue.');
  }

  sendJson(res, 200, { members: await listMembers(db, actor.organizationId) });
});
