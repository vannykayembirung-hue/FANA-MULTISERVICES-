import { getCurrentUser } from '../_lib/auth.js';
import { ensureSchema } from '../_lib/db.js';
import { requireMethod, sendJson, withApiErrors } from '../_lib/http.js';

export default withApiErrors(async (req, res) => {
  requireMethod(req, ['GET']);
  await ensureSchema();
  const user = await getCurrentUser(req);
  sendJson(res, 200, { user });
});
