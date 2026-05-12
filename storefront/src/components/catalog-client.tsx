'use client';

import { useDeferredValue, useEffect, useMemo, useState } from 'react';
import { useSearchParams } from 'next/navigation';

import { ProductCard } from '@/components/product-card';
import type { Product } from '@/lib/types';

type CatalogClientProps = {
  products: Product[];
  categories: string[];
};

export function CatalogClient({ products, categories }: CatalogClientProps) {
  const searchParams = useSearchParams();
  const categoryFromUrl = searchParams.get('category') ?? 'All';
  const [query, setQuery] = useState('');
  const [selectedCategory, setSelectedCategory] = useState(categoryFromUrl);
  const [sortBy, setSortBy] = useState('featured');
  const deferredQuery = useDeferredValue(query);

  useEffect(() => {
    setSelectedCategory(categories.includes(categoryFromUrl) ? categoryFromUrl : 'All');
  }, [categories, categoryFromUrl]);

  const filteredProducts = useMemo(() => {
    const normalizedQuery = deferredQuery.trim().toLowerCase();

    const matches = products.filter((product) => {
      const matchesCategory = selectedCategory === 'All' || product.category === selectedCategory;
      const matchesQuery =
        normalizedQuery.length === 0 ||
        product.name.toLowerCase().includes(normalizedQuery) ||
        product.category.toLowerCase().includes(normalizedQuery) ||
        product.tags.some((tag) => tag.toLowerCase().includes(normalizedQuery));

      return matchesCategory && matchesQuery;
    });

    return matches.sort((firstProduct, secondProduct) => {
      switch (sortBy) {
        case 'price-low':
          return firstProduct.price - secondProduct.price;
        case 'price-high':
          return secondProduct.price - firstProduct.price;
        case 'rating':
          return secondProduct.rating - firstProduct.rating;
        default:
          return Number(Boolean(secondProduct.featured)) - Number(Boolean(firstProduct.featured));
      }
    });
  }, [deferredQuery, products, selectedCategory, sortBy]);

  return (
    <div className="space-y-8">
      <section className="rounded-[36px] border border-white/70 bg-white/75 p-6 shadow-[0_20px_60px_rgba(87,60,14,0.08)] backdrop-blur lg:p-8">
        <div className="grid gap-4 lg:grid-cols-[1.4fr_1fr_1fr]">
          <label className="flex flex-col gap-2 text-sm font-semibold text-stone-700">
            Search the catalog
            <input
              type="search"
              value={query}
              onChange={(event) => setQuery(event.target.value)}
              placeholder="Search by style, category, or tag"
              className="rounded-2xl border border-stone-200 bg-white px-4 py-3 font-medium text-stone-900 outline-none transition focus:border-stone-900"
            />
          </label>
          <label className="flex flex-col gap-2 text-sm font-semibold text-stone-700">
            Category
            <select
              value={selectedCategory}
              onChange={(event) => setSelectedCategory(event.target.value)}
              className="rounded-2xl border border-stone-200 bg-white px-4 py-3 font-medium text-stone-900 outline-none transition focus:border-stone-900"
            >
              <option value="All">All categories</option>
              {categories.map((category) => (
                <option key={category} value={category}>
                  {category}
                </option>
              ))}
            </select>
          </label>
          <label className="flex flex-col gap-2 text-sm font-semibold text-stone-700">
            Sort by
            <select
              value={sortBy}
              onChange={(event) => setSortBy(event.target.value)}
              className="rounded-2xl border border-stone-200 bg-white px-4 py-3 font-medium text-stone-900 outline-none transition focus:border-stone-900"
            >
              <option value="featured">Featured</option>
              <option value="price-low">Price: low to high</option>
              <option value="price-high">Price: high to low</option>
              <option value="rating">Top rated</option>
            </select>
          </label>
        </div>
        <div className="mt-5 flex flex-wrap items-center justify-between gap-3 text-sm text-stone-600">
          <p>{filteredProducts.length} styles match your current filters.</p>
          <div className="flex flex-wrap gap-2">
            {categories.slice(0, 4).map((category) => (
              <button
                key={category}
                type="button"
                onClick={() => setSelectedCategory(category)}
                className={`rounded-full px-4 py-2 font-medium transition ${selectedCategory === category ? 'bg-stone-900 text-white' : 'bg-stone-100 text-stone-700 hover:bg-stone-200'}`}
              >
                {category}
              </button>
            ))}
            {query || selectedCategory !== 'All' || sortBy !== 'featured' ? (
              <button
                type="button"
                onClick={() => {
                  setQuery('');
                  setSelectedCategory('All');
                  setSortBy('featured');
                }}
                className="rounded-full border border-stone-300 px-4 py-2 font-medium text-stone-700 transition hover:border-stone-900 hover:text-stone-900"
              >
                Clear filters
              </button>
            ) : null}
          </div>
        </div>
      </section>

      {filteredProducts.length > 0 ? (
        <div className="grid gap-6 md:grid-cols-2 xl:grid-cols-3">
          {filteredProducts.map((product) => (
            <ProductCard key={product.id} product={product} />
          ))}
        </div>
      ) : (
        <section className="rounded-[36px] border border-dashed border-stone-300 bg-white/75 px-6 py-16 text-center shadow-[0_20px_60px_rgba(87,60,14,0.06)]">
          <h2 className="text-2xl font-semibold text-stone-900">No styles matched this selection.</h2>
          <p className="mt-3 text-sm leading-7 text-stone-600">Try clearing the search, switching categories, or exploring another collection.</p>
        </section>
      )}
    </div>
  );
}
