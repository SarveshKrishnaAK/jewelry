import Image from 'next/image';
import Link from 'next/link';

import { AddToCartButton } from '@/components/add-to-cart-button';
import { RatingStars } from '@/components/rating-stars';
import { formatCurrency } from '@/lib/currency';
import type { Product } from '@/lib/types';

type ProductCardProps = {
  product: Product;
};

export function ProductCard({ product }: ProductCardProps) {
  return (
    <article className="group flex h-full flex-col overflow-hidden rounded-[32px] border border-white/70 bg-white/85 p-4 shadow-[0_18px_50px_rgba(87,60,14,0.08)] backdrop-blur">
      <Link href={`/products/${product.slug}`} className="relative overflow-hidden rounded-[28px] bg-[radial-gradient(circle_at_top,_rgba(255,255,255,0.84),_rgba(237,225,209,0.96))]">
        <div className="absolute left-4 top-4 z-10 rounded-full bg-stone-900 px-3 py-1 text-[0.7rem] font-semibold uppercase tracking-[0.18em] text-white">
          {product.badge ?? product.category}
        </div>
        <div className="absolute inset-x-8 bottom-4 h-7 rounded-full bg-amber-950/10 blur-2xl" aria-hidden="true" />
        <Image
          src={product.image}
          alt={product.imageAlt}
          width={960}
          height={1200}
          sizes="(max-width: 768px) 100vw, (max-width: 1200px) 50vw, 33vw"
          className="aspect-[4/5] w-full object-cover transition duration-500 group-hover:scale-[1.03]"
        />
      </Link>
      <div className="flex flex-1 flex-col px-2 pb-2 pt-5">
        <div className="flex items-start justify-between gap-4">
          <div>
            <p className="text-xs font-semibold uppercase tracking-[0.18em] text-stone-500">{product.category}</p>
            <h3 className="mt-2 text-xl font-semibold text-stone-900">
              <Link href={`/products/${product.slug}`} className="transition hover:text-stone-700">
                {product.name}
              </Link>
            </h3>
          </div>
        </div>
        <RatingStars rating={product.rating} reviewCount={product.reviewCount} className="mt-3" />
        <p className="mt-4 text-sm leading-7 text-stone-600">{product.shortDescription}</p>
        <div className="mt-4 flex flex-wrap gap-2">
          {product.tags.map((tag) => (
            <span key={tag} className="rounded-full border border-stone-200 bg-stone-50 px-3 py-1 text-xs font-medium text-stone-600">
              {tag}
            </span>
          ))}
        </div>
        <div className="mt-6 flex items-end justify-between gap-4">
          <div>
            <p className="text-xl font-semibold text-stone-900">{formatCurrency(product.price)}</p>
            {product.originalPrice ? <p className="text-sm text-stone-400 line-through">{formatCurrency(product.originalPrice)}</p> : null}
          </div>
          <AddToCartButton product={product} />
        </div>
      </div>
    </article>
  );
}
