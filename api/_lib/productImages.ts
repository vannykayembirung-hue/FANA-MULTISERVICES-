import { ApiError } from './http.js';

const MAX_IMAGE_BYTES = 600_000;
const MAX_IMAGE_DATA_URL_LENGTH = 800_000;
const DATA_URL = /^data:image\/(jpeg|png|webp);base64,([A-Za-z0-9+/]+={0,2})$/;

export function isProductImageReference(value: string): boolean {
  return /^\/api\/product-image\?id=[A-Za-z0-9_-]{1,100}$/.test(value);
}

export async function saveProductImage(client: any, organizationId: string, productId: string, value: string): Promise<void> {
  if (!value) {
    await client`DELETE FROM fana_product_images WHERE organization_id = ${organizationId} AND product_id = ${productId}`;
    return;
  }

  if (isProductImageReference(value)) {
    const reference = new URL(value, 'https://fana.invalid');
    if (reference.searchParams.get('id') !== productId) {
      throw new ApiError(400, 'La référence de photo ne correspond pas à ce produit.');
    }
    return;
  }

  const match = DATA_URL.exec(value);
  if (!match || value.length > MAX_IMAGE_DATA_URL_LENGTH) {
    throw new ApiError(400, 'La photo doit être un fichier JPEG, PNG ou WebP compressé de moins de 600 Ko.');
  }
  const bytes = Buffer.from(match[2], 'base64');
  if (!bytes.length || bytes.length > MAX_IMAGE_BYTES) {
    throw new ApiError(400, 'La photo compressée dépasse la taille maximale de 600 Ko.');
  }

  await client`
    INSERT INTO fana_product_images (organization_id, product_id, mime_type, image_data)
    VALUES (${organizationId}, ${productId}, ${`image/${match[1]}`}, ${bytes})
    ON CONFLICT (organization_id, product_id)
    DO UPDATE SET mime_type = EXCLUDED.mime_type, image_data = EXCLUDED.image_data, updated_at = now()
  `;
}

export function productImageUrl(productId: string): string {
  return `/api/product-image?id=${encodeURIComponent(productId)}`;
}
