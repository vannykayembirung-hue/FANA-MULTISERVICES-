import { requireAuth } from './_lib/auth.js';
import { ensureSchema } from './_lib/db.js';
import { ApiError, requireMethod, withApiErrors } from './_lib/http.js';

export default withApiErrors(async (req, res) => {
  requireMethod(req, ['GET']);
  const user = await requireAuth(req);
  const requestUrl = new URL(req.url || '/api/product-image', 'http://fana.internal');
  const productId = requestUrl.searchParams.get('id') || '';
  if (!/^[A-Za-z0-9_-]{1,100}$/.test(productId)) throw new ApiError(400, 'Identifiant de produit invalide.');

  const db = await ensureSchema();
  const [image] = await db`
    SELECT mime_type, image_data
    FROM fana_product_images
    WHERE organization_id = ${user.organizationId} AND product_id = ${productId}
    LIMIT 1
  `;
  if (!image) throw new ApiError(404, 'Photo du produit introuvable.');

  res.statusCode = 200;
  res.setHeader('Content-Type', image.mime_type);
  res.setHeader('Cache-Control', 'private, no-store');
  res.setHeader('X-Content-Type-Options', 'nosniff');
  res.end(image.image_data);
});
