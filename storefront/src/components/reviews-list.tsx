import { RatingStars } from '@/components/rating-stars';
import type { ProductReview } from '@/lib/types';

type ReviewsListProps = {
  reviews: ProductReview[];
};

export function ReviewsList({ reviews }: ReviewsListProps) {
  return (
    <div className="grid gap-4 lg:grid-cols-3">
      {reviews.map((review) => (
        <article key={review.id} className="rounded-[28px] border border-white/70 bg-white/85 p-6 shadow-[0_16px_45px_rgba(87,60,14,0.07)]">
          <RatingStars rating={review.rating} className="mb-4" />
          <h3 className="text-lg font-semibold text-stone-900">{review.title}</h3>
          <p className="mt-3 text-sm leading-7 text-stone-600">{review.body}</p>
          <div className="mt-5 flex items-center justify-between gap-3 text-sm text-stone-500">
            <div>
              <p className="font-semibold text-stone-700">{review.author}</p>
              <p>{review.location}</p>
            </div>
            <div className="text-right">
              <p>{review.date}</p>
              {review.verified ? <p className="font-medium text-emerald-700">Verified buyer</p> : null}
            </div>
          </div>
        </article>
      ))}
    </div>
  );
}
