import type { SVGProps } from 'react';

type RatingStarsProps = {
  rating: number;
  reviewCount?: number;
  className?: string;
};

function StarIcon({ filled, ...props }: SVGProps<SVGSVGElement> & { filled: boolean }) {
  return (
    <svg viewBox="0 0 20 20" aria-hidden="true" fill={filled ? 'currentColor' : 'none'} {...props}>
      <path
        d="M10 1.75l2.549 5.164 5.701.828-4.125 4.02.973 5.678L10 14.76 4.902 17.44l.973-5.678-4.125-4.02 5.701-.828L10 1.75z"
        stroke="currentColor"
        strokeWidth="1.1"
      />
    </svg>
  );
}

export function RatingStars({ rating, reviewCount, className = '' }: RatingStarsProps) {
  const roundedRating = Math.round(rating);

  return (
    <div className={`flex items-center gap-2 text-sm text-stone-600 ${className}`} aria-label={`${rating} out of 5 stars`}>
      <div className="flex items-center gap-1 text-amber-500">
        {Array.from({ length: 5 }, (_, index) => (
          <StarIcon key={index} filled={index < roundedRating} className="h-4 w-4" />
        ))}
      </div>
      <span className="font-medium text-stone-700">{rating.toFixed(1)}</span>
      {reviewCount ? <span>({reviewCount} reviews)</span> : null}
    </div>
  );
}
