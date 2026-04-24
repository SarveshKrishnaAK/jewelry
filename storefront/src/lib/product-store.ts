import { seedProducts } from '@/data/products';
import { getRedis, isRedisConfigured } from '@/lib/redis';
import type { Product } from '@/lib/types';

const PRODUCTS_SEEDED_KEY = 'aurum:products:seeded';
const PRODUCT_IDS_KEY = 'aurum:products:ids';

function productKey(id: string) {
  return `aurum:product:${id}`;
}

function productSlugKey(slug: string) {
  return `aurum:product:slug:${slug}`;
}

async function ensureSeedProducts() {
  if (!isRedisConfigured()) {
    return;
  }

  const redis = getRedis();
  const hasSeededProducts = await redis.get<string>(PRODUCTS_SEEDED_KEY);

  if (hasSeededProducts === 'true') {
    return;
  }

  for (const product of seedProducts) {
    await redis.set(productKey(product.id), product);
    await redis.set(productSlugKey(product.slug), product.id);
    await redis.sadd(PRODUCT_IDS_KEY, product.id);
  }

  await redis.set(PRODUCTS_SEEDED_KEY, 'true');
}

function sortProducts(products: Product[]) {
  return products.sort((firstProduct, secondProduct) => {
    if (Boolean(firstProduct.featured) !== Boolean(secondProduct.featured)) {
      return Number(Boolean(secondProduct.featured)) - Number(Boolean(firstProduct.featured));
    }

    return firstProduct.name.localeCompare(secondProduct.name);
  });
}

export async function getAllProducts() {
  if (!isRedisConfigured()) {
    return sortProducts([...seedProducts]);
  }

  await ensureSeedProducts();
  const redis = getRedis();
  const productIds = ((await redis.smembers(PRODUCT_IDS_KEY)) as string[] | null) ?? [];
  const products = await Promise.all(productIds.map((id) => redis.get<Product>(productKey(id))));
  return sortProducts(products.filter((product): product is Product => Boolean(product)));
}

export async function getProductMap() {
  const products = await getAllProducts();
  return Object.fromEntries(products.map((product) => [product.id, product]));
}

export async function getProductBySlug(slug: string) {
  if (!isRedisConfigured()) {
    return seedProducts.find((product) => product.slug === slug);
  }

  await ensureSeedProducts();
  const redis = getRedis();
  const productId = await redis.get<string>(productSlugKey(slug));

  if (!productId) {
    return null;
  }

  return (await redis.get<Product>(productKey(productId))) ?? null;
}

export async function getFeaturedProducts() {
  const products = await getAllProducts();
  return products.filter((product) => product.featured);
}

export async function getRelatedProducts(currentSlug: string, category: string) {
  const products = await getAllProducts();
  return products.filter((product) => product.slug !== currentSlug && product.category === category);
}

export async function getProductCategories() {
  const products = await getAllProducts();
  return Array.from(new Set(products.map((product) => product.category))).sort((first, second) =>
    first.localeCompare(second),
  );
}

export async function getCustomerHighlights() {
  const products = await getAllProducts();
  return products.flatMap((product) =>
    product.reviews.slice(0, 1).map((review) => ({
      ...review,
      productName: product.name,
    })),
  );
}

export async function upsertProduct(product: Product, previousSlug?: string) {
  if (!isRedisConfigured()) {
    throw new Error('Configure Upstash Redis before using product management.');
  }

  await ensureSeedProducts();
  const redis = getRedis();

  if (previousSlug && previousSlug !== product.slug) {
    await redis.del(productSlugKey(previousSlug));
  }

  await redis.set(productKey(product.id), product);
  await redis.set(productSlugKey(product.slug), product.id);
  await redis.sadd(PRODUCT_IDS_KEY, product.id);
}
