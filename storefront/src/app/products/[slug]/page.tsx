import type { Metadata } from 'next';
import Image from 'next/image';
import Link from 'next/link';
import { notFound } from 'next/navigation';

import { ProductActions } from '@/components/product-actions';
import { ProductCard } from '@/components/product-card';
import { RatingStars } from '@/components/rating-stars';
import { ReviewsList } from '@/components/reviews-list';
import { formatCurrency } from '@/lib/currency';
import { getFeaturedProducts, getProductBySlug, getRelatedProducts } from '@/lib/product-store';

type ProductPageProps = {
  params: Promise<{ slug: string }>;
};

export async function generateMetadata({ params }: ProductPageProps): Promise<Metadata> {
  const { slug } = await params;
  const product = await getProductBySlug(slug);

  if (!product) {
    return {
      title: 'Product not found',
    };
  }

  return {
    title: product.name,
    description: product.shortDescription,
  };
}

export default async function ProductDetailPage({ params }: ProductPageProps) {
  const { slug } = await params;
  const product = await getProductBySlug(slug);

  if (!product) {
    notFound();
  }

  const relatedProducts = await getRelatedProducts(product.slug, product.category);
  const fallbackProducts = (await getFeaturedProducts()).filter((featuredProduct) => featuredProduct.slug !== product.slug);
  const displayedRelatedProducts = (relatedProducts.length > 0 ? relatedProducts : fallbackProducts).slice(0, 3);

  return (
    <div className="pb-20 pt-10 lg:pb-28">
      <div className="mx-auto w-[min(1200px,calc(100%-1.5rem))] space-y-10">
        <nav className="text-sm text-stone-500">
          <Link href="/" className="transition hover:text-stone-900">Home</Link> / <Link href="/products" className="transition hover:text-stone-900">Catalog</Link> / <span className="text-stone-700">{product.name}</span>
        </nav>

        <section className="grid gap-8 lg:grid-cols-[0.92fr_1.08fr] lg:items-start">
          <div className="overflow-hidden rounded-[40px] border border-white/70 bg-[radial-gradient(circle_at_top,_rgba(255,255,255,0.86),_rgba(237,225,209,0.96))] p-5 shadow-[0_24px_70px_rgba(87,60,14,0.12)]">
            <Image src={product.image} alt={product.imageAlt} width={960} height={1200} priority className="aspect-[4/5] w-full rounded-[32px] object-cover" />
          </div>

          <div className="space-y-6 rounded-[40px] border border-white/70 bg-white/82 p-8 shadow-[0_24px_70px_rgba(87,60,14,0.1)] backdrop-blur lg:p-10">
            <div>
              <p className="text-sm font-semibold uppercase tracking-[0.3em] text-stone-500">{product.category}</p>
              <h1 className="mt-4 [font-family:var(--font-cormorant)] text-5xl font-semibold text-stone-900">{product.name}</h1>
              <RatingStars rating={product.rating} reviewCount={product.reviewCount} className="mt-4" />
            </div>

            <div className="flex flex-wrap items-end gap-4">
              <p className="text-3xl font-semibold text-stone-900">{formatCurrency(product.price)}</p>
              {product.originalPrice ? <p className="text-lg text-stone-400 line-through">{formatCurrency(product.originalPrice)}</p> : null}
              <div className="rounded-full bg-emerald-50 px-4 py-2 text-sm font-semibold text-emerald-700">Account login required for checkout</div>
            </div>

            <p className="text-base leading-8 text-stone-600">{product.description}</p>

            <div className="flex flex-wrap gap-2">
              {product.tags.map((tag) => (
                <span key={tag} className="rounded-full border border-stone-200 bg-stone-50 px-3 py-2 text-xs font-medium uppercase tracking-[0.12em] text-stone-600">{tag}</span>
              ))}
            </div>

            <div className="grid gap-4 sm:grid-cols-2">
              {product.features.map((feature) => (
                <div key={feature} className="rounded-[24px] border border-stone-200 bg-stone-50/70 p-4 text-sm leading-7 text-stone-700">{feature}</div>
              ))}
            </div>

            <ProductActions productId={product.id} />
          </div>
        </section>

        <section className="grid gap-6 lg:grid-cols-3">
          <div className="rounded-[32px] border border-white/70 bg-white/82 p-6 shadow-[0_20px_60px_rgba(87,60,14,0.08)]">
            <p className="text-sm font-semibold uppercase tracking-[0.24em] text-stone-500">Material</p>
            <p className="mt-3 text-sm leading-7 text-stone-700">{product.material}</p>
          </div>
          <div className="rounded-[32px] border border-white/70 bg-white/82 p-6 shadow-[0_20px_60px_rgba(87,60,14,0.08)]">
            <p className="text-sm font-semibold uppercase tracking-[0.24em] text-stone-500">Finish</p>
            <p className="mt-3 text-sm leading-7 text-stone-700">{product.finish}</p>
          </div>
          <div className="rounded-[32px] border border-white/70 bg-white/82 p-6 shadow-[0_20px_60px_rgba(87,60,14,0.08)]">
            <p className="text-sm font-semibold uppercase tracking-[0.24em] text-stone-500">Wearability & shipping</p>
            <p className="mt-3 text-sm leading-7 text-stone-700">{product.wearability}</p>
            <p className="mt-2 text-sm leading-7 text-stone-700">{product.dispatch}</p>
          </div>
        </section>

        <section className="space-y-6">
          <div>
            <p className="text-sm font-semibold uppercase tracking-[0.3em] text-stone-500">Reviews</p>
            <h2 className="mt-3 [font-family:var(--font-cormorant)] text-4xl font-semibold text-stone-900">What customers say before they buy.</h2>
          </div>
          <ReviewsList reviews={product.reviews} />
        </section>

        <section className="space-y-6">
          <div className="flex items-end justify-between gap-4">
            <div>
              <p className="text-sm font-semibold uppercase tracking-[0.3em] text-stone-500">You may also like</p>
              <h2 className="mt-3 [font-family:var(--font-cormorant)] text-4xl font-semibold text-stone-900">More products in the same shopping mood.</h2>
            </div>
            <Link href="/products" className="text-sm font-semibold text-stone-700 transition hover:text-stone-900">Back to catalog</Link>
          </div>
          <div className="grid gap-6 md:grid-cols-2 xl:grid-cols-3">
            {displayedRelatedProducts.map((relatedProduct) => (
              <ProductCard key={relatedProduct.id} product={relatedProduct} />
            ))}
          </div>
        </section>
      </div>
    </div>
  );
}
