import { clearSessionCookie, destroySession } from '../_lib/auth.js';
import { ensureSchema } from '../_lib/db.js';
import { assertSameOrigin, requireMethod, sendJson, withApiErrors } from '../_lib/http.js';

export default withApiErrors(async (req, res) => {
  requireMethod(req, ['POST']);
  assertSameOrigin(req);
  await ensureSchema();
  await destroySession(req);
  clearSessionCookie(res, req);
  sendJson(res, 200, { ok: true });
});
