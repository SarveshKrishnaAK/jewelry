import type { Metadata } from 'next';

import { CatalogClient } from '@/components/catalog-client';
import { getAllProducts, getProductCategories } from '@/lib/product-store';

export const metadata: Metadata = {
  title: 'Shop Jewelry Collections',
  description: 'Browse bridal sets, necklaces, earrings, bangles, and pendant styles with reviews and secure checkout.',
};

export default async function ProductsPage() {
  const [products, categories] = await Promise.all([getAllProducts(), getProductCategories()]);

  return (
    <div className="pb-20 pt-10 lg:pb-28">
      <div className="mx-auto w-[min(1200px,calc(100%-1.5rem))] space-y-10">
        <section className="rounded-[40px] border border-white/70 bg-[linear-gradient(135deg,rgba(255,255,255,0.78),rgba(248,236,219,0.94))] p-8 shadow-[0_24px_70px_rgba(87,60,14,0.12)] lg:p-10">
          <p className="text-sm font-semibold uppercase tracking-[0.3em] text-stone-500">Collections</p>
          <h1 className="mt-4 [font-family:var(--font-cormorant)] text-5xl font-semibold text-stone-900">Curated jewelry for weddings, celebrations, and everyday elegance.</h1>
          <p className="mt-5 max-w-3xl text-base leading-8 text-stone-600">Browse by style, filter by category, and discover pieces chosen to feel graceful, versatile, and ready to wear.</p>
        </section>

        <CatalogClient products={products} categories={categories} />
      </div>
    </div>
  );
}
