import { getCurrentUser, requireAuth } from './_lib/auth';
import { ensureSchema } from './_lib/db';
import { handleWorkspaceAction, readWorkspaceState } from './_lib/business';
import { assertSameOrigin, getRequestBody, requireMethod, sendJson, withApiErrors } from './_lib/http';

export default withApiErrors(async (req, res) => {
  await ensureSchema();
  if (req.method === 'GET') {
    const user = await getCurrentUser(req);
    if (!user) {
      sendJson(res, 401, { error: 'Votre session a expiré. Connectez-vous à nouveau.', code: 'AUTH_REQUIRED' });
      return;
    }
    const db = await ensureSchema();
    sendJson(res, 200, { state: await readWorkspaceState(db, user) });
    return;
  }

  requireMethod(req, ['POST']);
  assertSameOrigin(req);
  const user = await requireAuth(req);
  const body = getRequestBody(req);
  const db = await ensureSchema();
  const state = await handleWorkspaceAction(db, user, body);
  sendJson(res, 200, { state });
});
