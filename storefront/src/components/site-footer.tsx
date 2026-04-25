import Link from 'next/link';

import { navigationLinks, siteConfig } from '@/lib/site';

export function SiteFooter() {
  return (
    <footer className="border-t border-white/50 bg-stone-950 text-stone-100">
      <div className="mx-auto grid w-[min(1200px,calc(100%-1.5rem))] gap-10 py-14 lg:grid-cols-[1.5fr_1fr_1fr]">
        <div>
          <p className="text-xs font-semibold uppercase tracking-[0.38em] text-amber-200/70">{siteConfig.name}</p>
          <h2 className="mt-3 [font-family:var(--font-cormorant)] text-4xl font-semibold text-white">Jewelry chosen for celebrations, gifting, and everyday radiance.</h2>
          <p className="mt-4 max-w-xl text-sm leading-7 text-stone-300">{siteConfig.description} Explore signature styles, save your favorites, and check out with confidence whenever you are ready.</p>
        </div>
        <div>
          <p className="text-sm font-semibold uppercase tracking-[0.24em] text-stone-400">Navigation</p>
          <div className="mt-4 flex flex-col gap-3 text-sm text-stone-200">
            {navigationLinks.map((link) => (
              <Link key={link.href} href={link.href} className="transition hover:text-white">
                {link.label}
              </Link>
            ))}
          </div>
        </div>
        <div>
          <p className="text-sm font-semibold uppercase tracking-[0.24em] text-stone-400">Support</p>
          <div className="mt-4 space-y-3 text-sm text-stone-200">
            <p>{siteConfig.supportEmail}</p>
            <p>{siteConfig.supportPhone}</p>
            <p>Online assistance for orders, gifting, and delivery questions.</p>
          </div>
        </div>
      </div>
    </footer>
  );
}
