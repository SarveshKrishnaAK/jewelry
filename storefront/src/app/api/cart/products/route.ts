import { getCartProductSnapshotsByIds } from '@/lib/product-store';
import { secureJson } from '@/lib/security';

const MAX_CART_PRODUCT_IDS = 20;

export const runtime = 'nodejs';

export async function GET(request: Request) {
  const { searchParams } = new URL(request.url);
  const ids = Array.from(
    new Set(
      searchParams
        .getAll('ids')
        .map((id) => id.trim())
        .filter(Boolean),
    ),
  ).slice(0, MAX_CART_PRODUCT_IDS);

  const products = await getCartProductSnapshotsByIds(ids);
  return secureJson({ products });
}
