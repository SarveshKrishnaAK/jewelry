import { unstable_cache as unstableCache } from 'next/cache';

import { seedProducts } from '@/data/products';
import { getRedis, isRedisConfigured } from '@/lib/redis';
import type { CartProductSnapshot, Product } from '@/lib/types';

const PRODUCTS_SEEDED_KEY = 'aurum:products:seeded';
const PRODUCT_IDS_KEY = 'aurum:products:ids';
export const PRODUCT_DATA_TAG = 'products';

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

async function loadAllProductsUncached() {
  if (!isRedisConfigured()) {
    return sortProducts([...seedProducts]);
  }

  await ensureSeedProducts();
  const redis = getRedis();
  const productIds = ((await redis.smembers(PRODUCT_IDS_KEY)) as string[] | null) ?? [];
  const products = await Promise.all(productIds.map((id) => redis.get<Product>(productKey(id))));
  return sortProducts(products.filter((product): product is Product => Boolean(product)));
}

const getCachedAllProducts = unstableCache(loadAllProductsUncached, ['products:all'], {
  tags: [PRODUCT_DATA_TAG],
});

export async function getAllProducts() {
  return getCachedAllProducts();
}

export async function getProductMap() {
  const products = await getAllProducts();
  return Object.fromEntries(products.map((product) => [product.id, product]));
}

export async function getProductBySlug(slug: string) {
  const products = await getAllProducts();
  return products.find((product) => product.slug === slug) ?? null;
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

export function toCartProductSnapshot(product: Product): CartProductSnapshot {
  return {
    id: product.id,
    slug: product.slug,
    name: product.name,
    category: product.category,
    price: product.price,
    image: product.image,
    imageAlt: product.imageAlt,
    shortDescription: product.shortDescription,
  };
}

export async function getCartProductSnapshotsByIds(ids: string[]) {
  if (ids.length === 0) {
    return [];
  }

  const productMap = await getProductMap();
  return ids
    .map((id) => productMap[id])
    .filter((product): product is Product => Boolean(product))
    .map(toCartProductSnapshot);
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

export async function deleteProduct(product: Pick<Product, 'id' | 'slug'>) {
  if (!isRedisConfigured()) {
    throw new Error('Configure Upstash Redis before using product management.');
  }

  await ensureSeedProducts();
  const redis = getRedis();

  await redis.del(productKey(product.id));
  await redis.del(productSlugKey(product.slug));
  await redis.srem(PRODUCT_IDS_KEY, product.id);
}
