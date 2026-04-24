import Image from 'next/image';
import Link from 'next/link';

import { ProductCard } from '@/components/product-card';
import { getCustomerHighlights, getFeaturedProducts, getAllProducts } from '@/lib/product-store';

const collectionCards = [
  {
    title: 'Bridal Spotlight',
    description: 'Big-day covering sets with layered profiles, ceremonial scale, and lightweight comfort.',
    href: '/products?category=Bridal%20Sets',
    image: '/products/zaria-bridal-set.svg',
  },
  {
    title: 'Festive Necklines',
    description: 'Chokers, long harams, and occasion staples that make everyday silk and festive fits look finished.',
    href: '/products?category=Necklaces',
    image: '/products/noor-kundan-choker.svg',
  },
  {
    title: 'Quick-Style Earrings',
    description: 'Statement jhumkas and easy occasion pieces that deliver drama without the weight.',
    href: '/products?category=Earrings',
    image: '/products/meera-temple-jhumkas.svg',
  },
];

const promisePoints = [
  'Marketplace-style browsing with a boutique visual identity',
  'Accessible product cards, cart flow, admin management, and account-gated checkout',
  'Vercel-friendly structure with Razorpay route handlers and a hidden admin portal',
  'Luxury-inspired animations that respect reduced-motion preferences',
];

export default async function Home() {
  const [allProducts, featuredProducts, customerHighlights] = await Promise.all([
    getAllProducts(),
    getFeaturedProducts(),
    getCustomerHighlights(),
  ]);

  return (
    <div className="pb-20 pt-10 lg:pb-28">
      <div className="mx-auto w-[min(1200px,calc(100%-1.5rem))] space-y-20">
        <section className="grid gap-10 rounded-[40px] border border-white/70 bg-[linear-gradient(135deg,rgba(255,255,255,0.78),rgba(248,236,219,0.94))] p-8 shadow-[0_30px_80px_rgba(74,46,14,0.12)] backdrop-blur lg:grid-cols-[1.1fr_0.9fr] lg:p-12">
          <div className="flex flex-col justify-center">
            <p className="text-sm font-semibold uppercase tracking-[0.3em] text-stone-500">Covering jewelry storefront</p>
            <h1 className="mt-5 max-w-2xl [font-family:var(--font-cormorant)] text-5xl font-semibold leading-none text-stone-900 sm:text-6xl lg:text-7xl">
              Sell statement jewelry with the confidence of a modern B2C experience.
            </h1>
            <p className="mt-6 max-w-2xl text-base leading-8 text-stone-600 sm:text-lg">
              This storefront now combines luxury catalog presentation with secure customer accounts, OTP-protected admin access, and a live product management workflow that can update the catalog without hardcoding new items.
            </p>
            <div className="mt-8 flex flex-wrap gap-3">
              <Link href="/products" className="inline-flex items-center justify-center rounded-full bg-stone-900 px-6 py-3 text-sm font-semibold text-white transition duration-300 hover:-translate-y-0.5 hover:bg-stone-700">Browse catalog</Link>
              {allProducts[0] ? <Link href={`/products/${allProducts[0].slug}`} className="inline-flex items-center justify-center rounded-full border border-stone-300 bg-white px-6 py-3 text-sm font-semibold text-stone-900 transition duration-300 hover:-translate-y-0.5 hover:border-stone-900">View hero product</Link> : null}
            </div>
            <div className="mt-8 grid gap-3 sm:grid-cols-3">
              <div className="rounded-[24px] border border-white/70 bg-white/85 p-4">
                <p className="text-xs font-semibold uppercase tracking-[0.2em] text-stone-500">Catalog-ready</p>
                <p className="mt-2 text-2xl font-semibold text-stone-900">{allProducts.length}</p>
                <p className="text-sm text-stone-600">launch products included</p>
              </div>
              <div className="rounded-[24px] border border-white/70 bg-white/85 p-4">
                <p className="text-xs font-semibold uppercase tracking-[0.2em] text-stone-500">Checkout</p>
                <p className="mt-2 text-2xl font-semibold text-stone-900">2-step</p>
                <p className="text-sm text-stone-600">customer authentication flow</p>
              </div>
              <div className="rounded-[24px] border border-white/70 bg-white/85 p-4">
                <p className="text-xs font-semibold uppercase tracking-[0.2em] text-stone-500">Admin</p>
                <p className="mt-2 text-2xl font-semibold text-stone-900">OTP</p>
                <p className="text-sm text-stone-600">verified hidden control room</p>
              </div>
            </div>
          </div>

          <div className="relative flex items-center justify-center">
            <div className="motion-drift absolute inset-x-[12%] top-5 h-28 rounded-full bg-amber-200/40 blur-3xl" aria-hidden="true" />
            <div className="motion-float relative w-full max-w-xl overflow-hidden rounded-[36px] border border-white/80 bg-[linear-gradient(180deg,rgba(255,255,255,0.86),rgba(247,237,223,0.95))] p-6 shadow-[0_24px_70px_rgba(87,60,14,0.16)]">
              <div className="rounded-[30px] bg-white/90 p-3 shadow-[inset_0_1px_0_rgba(255,255,255,0.6)]">
                <Image src="/products/zaria-bridal-set.svg" alt="Featured bridal jewelry set" width={960} height={1200} priority className="aspect-[4/5] w-full rounded-[24px] object-cover" />
              </div>
              <div className="mt-5 flex flex-wrap items-center justify-between gap-4 rounded-[26px] border border-stone-200 bg-white/90 p-5">
                <div>
                  <p className="text-xs font-semibold uppercase tracking-[0.2em] text-stone-500">Best launch performer</p>
                  <p className="mt-2 text-2xl font-semibold text-stone-900">{featuredProducts[0]?.name ?? 'Signature catalog piece'}</p>
                  <p className="mt-1 text-sm text-stone-600">Built for wedding wardrobes and premium occasion styling.</p>
                </div>
                <div className="rounded-full bg-stone-900 px-4 py-2 text-sm font-semibold text-white">{featuredProducts[0] ? `${featuredProducts[0].rating.toFixed(1)} / 5 rating` : 'Luxury edit'}</div>
              </div>
            </div>
          </div>
        </section>

        <section className="space-y-6">
          <div className="flex flex-col gap-3 sm:flex-row sm:items-end sm:justify-between">
            <div>
              <p className="text-sm font-semibold uppercase tracking-[0.3em] text-stone-500">Merchandising lanes</p>
              <h2 className="mt-3 [font-family:var(--font-cormorant)] text-4xl font-semibold text-stone-900 sm:text-5xl">Shop the collections customers look for first.</h2>
            </div>
            <Link href="/products" className="text-sm font-semibold text-stone-700 transition hover:text-stone-900">View full catalog</Link>
          </div>
          <div className="grid gap-6 lg:grid-cols-3">
            {collectionCards.map((collectionCard) => (
              <Link key={collectionCard.title} href={collectionCard.href} className="group overflow-hidden rounded-[32px] border border-white/70 bg-white/80 p-4 shadow-[0_20px_60px_rgba(87,60,14,0.08)] transition duration-300 hover:-translate-y-1">
                <div className="overflow-hidden rounded-[26px] bg-[radial-gradient(circle_at_top,_rgba(255,255,255,0.84),_rgba(237,225,209,0.96))]">
                  <Image src={collectionCard.image} alt={collectionCard.title} width={960} height={1200} className="aspect-[4/5] w-full object-cover transition duration-500 group-hover:scale-[1.03]" />
                </div>
                <div className="px-3 pb-3 pt-5">
                  <h3 className="text-2xl font-semibold text-stone-900">{collectionCard.title}</h3>
                  <p className="mt-3 text-sm leading-7 text-stone-600">{collectionCard.description}</p>
                </div>
              </Link>
            ))}
          </div>
        </section>

        <section className="space-y-6">
          <div className="flex flex-col gap-3 sm:flex-row sm:items-end sm:justify-between">
            <div>
              <p className="text-sm font-semibold uppercase tracking-[0.3em] text-stone-500">Bestsellers</p>
              <h2 className="mt-3 [font-family:var(--font-cormorant)] text-4xl font-semibold text-stone-900 sm:text-5xl">Live catalog powered by admin updates</h2>
            </div>
            <p className="max-w-xl text-sm leading-7 text-stone-600">Seeded products are included out of the box, and the hidden admin dashboard can now add or update live catalog entries without editing code.</p>
          </div>
          <div className="grid gap-6 md:grid-cols-2 xl:grid-cols-4">
            {featuredProducts.slice(0, 4).map((product) => (
              <ProductCard key={product.id} product={product} />
            ))}
          </div>
        </section>

        <section className="grid gap-6 rounded-[40px] border border-white/70 bg-white/80 p-8 shadow-[0_20px_60px_rgba(87,60,14,0.08)] lg:grid-cols-[0.9fr_1.1fr] lg:p-10">
          <div>
            <p className="text-sm font-semibold uppercase tracking-[0.3em] text-stone-500">What this build already covers</p>
            <h2 className="mt-4 [font-family:var(--font-cormorant)] text-4xl font-semibold text-stone-900">An accessible, animated storefront with real admin controls.</h2>
          </div>
          <div className="grid gap-4 sm:grid-cols-2">
            {promisePoints.map((point) => (
              <div key={point} className="rounded-[24px] border border-stone-200 bg-stone-50/70 p-5 text-sm leading-7 text-stone-700">{point}</div>
            ))}
          </div>
        </section>

        <section className="space-y-6">
          <div>
            <p className="text-sm font-semibold uppercase tracking-[0.3em] text-stone-500">Customer love</p>
            <h2 className="mt-3 [font-family:var(--font-cormorant)] text-4xl font-semibold text-stone-900 sm:text-5xl">Review blocks that still feel like a real B2C launch.</h2>
          </div>
          <div className="grid gap-6 lg:grid-cols-3">
            {customerHighlights.slice(0, 3).map((highlight) => (
              <article key={highlight.id} className="rounded-[32px] border border-white/70 bg-white/85 p-6 shadow-[0_18px_50px_rgba(87,60,14,0.08)]">
                <p className="text-sm font-semibold uppercase tracking-[0.2em] text-stone-500">{highlight.productName}</p>
                <h3 className="mt-3 text-2xl font-semibold text-stone-900">{highlight.title}</h3>
                <p className="mt-4 text-sm leading-7 text-stone-600">{highlight.body}</p>
                <div className="mt-5 flex items-center justify-between gap-3 text-sm text-stone-500">
                  <div>
                    <p className="font-semibold text-stone-700">{highlight.author}</p>
                    <p>{highlight.location}</p>
                  </div>
                  <div className="rounded-full bg-emerald-50 px-3 py-2 text-emerald-700">Verified buyer</div>
                </div>
              </article>
            ))}
          </div>
        </section>

        <section className="overflow-hidden rounded-[40px] border border-white/70 bg-stone-950 px-8 py-10 text-white shadow-[0_24px_70px_rgba(20,12,5,0.22)] lg:px-10">
          <div className="grid gap-8 lg:grid-cols-[1fr_auto] lg:items-center">
            <div>
              <p className="text-sm font-semibold uppercase tracking-[0.3em] text-amber-200/70">Launch-ready</p>
              <h2 className="mt-4 [font-family:var(--font-cormorant)] text-4xl font-semibold sm:text-5xl">Deploy on Vercel now, add your custom domain when you&apos;re ready.</h2>
              <p className="mt-4 max-w-2xl text-sm leading-7 text-stone-300">The codebase now supports secure customer auth, admin-only catalog management, and the same Vercel-friendly deployment path you asked for on day one.</p>
            </div>
            <div className="flex flex-wrap gap-3">
              <Link href="/checkout" className="inline-flex items-center justify-center rounded-full bg-white px-6 py-3 text-sm font-semibold text-stone-900 transition hover:bg-stone-200">See checkout</Link>
              <Link href="/products" className="inline-flex items-center justify-center rounded-full border border-white/20 px-6 py-3 text-sm font-semibold text-white transition hover:border-white/50 hover:bg-white/10">Explore catalog</Link>
            </div>
          </div>
        </section>
      </div>
    </div>
  );
}
