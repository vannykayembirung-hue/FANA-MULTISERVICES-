import { getCurrentUser } from '../_lib/auth';
import { ensureSchema } from '../_lib/db';
import { requireMethod, sendJson, withApiErrors } from '../_lib/http';

export default withApiErrors(async (req, res) => {
  requireMethod(req, ['GET']);
  await ensureSchema();
  const user = await getCurrentUser(req);
  sendJson(res, 200, { user });
});
