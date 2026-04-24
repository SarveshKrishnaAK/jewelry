import type { Product } from '@/lib/types';

export const seedProducts: Product[] = [
  {
    id: 'prod_zaria_bridal_set',
    slug: 'zaria-bridal-set',
    name: 'Zaria Bridal Set',
    category: 'Bridal Sets',
    price: 6499,
    originalPrice: 7499,
    rating: 4.9,
    reviewCount: 138,
    shortDescription: 'Grand layered bridal necklace set with matching chandbalis and maang tikka.',
    description:
      'Designed for wedding wardrobes that need bold coverage and lightweight comfort, the Zaria Bridal Set brings together layered detailing, temple-inspired drops, and a soft adjustable fit.',
    image: '/products/zaria-bridal-set.svg',
    imageAlt: 'Gold-tone bridal necklace set with chandbali earrings and a maang tikka.',
    badge: 'Signature Edit',
    featured: true,
    tags: ['Wedding', 'Statement', 'Lightweight'],
    features: [
      'Layered bridal silhouette with matching ear and forehead pieces',
      'Comfort-fit closures for long event wear',
      'Gloss-coated finish made for repeat styling',
    ],
    material: 'Premium copper alloy with micro-stone detailing',
    finish: '24K-inspired matte gold tone',
    wearability: 'Best for bridal, reception, and stage wear',
    dispatch: 'Ships within 48 hours in gift-safe packaging',
    reviews: [
      {
        id: 'review_zaria_1',
        author: 'Keerthana M.',
        location: 'Chennai',
        rating: 5,
        title: 'Bridal look without the heavy feel',
        body: 'I wore it for my reception and it looked rich in photos while staying comfortable for the whole evening.',
        date: '12 Mar 2026',
        verified: true,
      },
      {
        id: 'review_zaria_2',
        author: 'Aishu R.',
        location: 'Coimbatore',
        rating: 5,
        title: 'Exactly the bold finish I wanted',
        body: 'The stones catch light beautifully and the set feels balanced instead of pulling at the neck.',
        date: '24 Feb 2026',
        verified: true,
      },
      {
        id: 'review_zaria_3',
        author: 'Nandhini S.',
        location: 'Bengaluru',
        rating: 4,
        title: 'Looks premium on silk sarees',
        body: 'The gold tone pairs especially well with bridal silks and the packaging arrived neatly secured.',
        date: '07 Jan 2026',
        verified: true,
      },
    ],
  },
  {
    id: 'prod_noor_kundan_choker',
    slug: 'noor-kundan-choker',
    name: 'Noor Kundan Choker',
    category: 'Necklaces',
    price: 3299,
    originalPrice: 3899,
    rating: 4.8,
    reviewCount: 94,
    shortDescription: 'Mirror-finish kundan choker with pearl edging for festive evenings and gifting.',
    description:
      'The Noor Kundan Choker balances a clean neckline with reflective kundan stones and soft pearl borders, making it easy to style with lehengas, gowns, and contemporary festive fits.',
    image: '/products/noor-kundan-choker.svg',
    imageAlt: 'Kundan style choker necklace with pearl border on a warm background.',
    badge: 'Festive Favorite',
    featured: true,
    tags: ['Festive', 'Kundan', 'Pearl Edge'],
    features: [
      'Structured neckline that frames both sarees and gowns',
      'Soft pearl lining for a finished luxury edge',
      'Adjustable tie closure for flexible sizing',
    ],
    material: 'Stone-set alloy with faux pearl finish',
    finish: 'Polished antique gold and ivory accents',
    wearability: 'Ideal for sangeet, mehendi, and gifting edits',
    dispatch: 'Ships in 48 to 72 hours',
    reviews: [
      {
        id: 'review_noor_1',
        author: 'Shivani P.',
        location: 'Hyderabad',
        rating: 5,
        title: 'Perfect statement for a simple outfit',
        body: 'It instantly elevated a plain georgette saree and looked far more expensive than the price.',
        date: '10 Apr 2026',
        verified: true,
      },
      {
        id: 'review_noor_2',
        author: 'Ritika D.',
        location: 'Pune',
        rating: 4,
        title: 'Very elegant and sits nicely',
        body: 'The fit is neat and the pearl trim gives it a softer finish than a usual hard choker.',
        date: '02 Mar 2026',
        verified: true,
      },
    ],
  },
  {
    id: 'prod_meera_temple_jhumkas',
    slug: 'meera-temple-jhumkas',
    name: 'Meera Temple Jhumkas',
    category: 'Earrings',
    price: 1899,
    originalPrice: 2299,
    rating: 4.7,
    reviewCount: 121,
    shortDescription: 'Temple-inspired jhumkas with dome drops and lightweight movement.',
    description:
      'A best-selling pair for quick festive dressing, the Meera Temple Jhumkas bring ornate detailing and graceful sway without the usual weight of large occasion earrings.',
    image: '/products/meera-temple-jhumkas.svg',
    imageAlt: 'Temple style jhumka earrings with dome drops and bead accents.',
    badge: 'Bestseller',
    featured: true,
    tags: ['Temple', 'Jhumka', 'Easy Wear'],
    features: [
      'Dome-drop design with balanced ear support',
      'Pairs well with both necklaces and standalone styling',
      'Travel-friendly and easy to re-wear',
    ],
    material: 'Embossed alloy with bead accents',
    finish: 'Temple gold with deep antique shadows',
    wearability: 'Great for poojas, gifting, and family functions',
    dispatch: 'Ships within 48 hours',
    reviews: [
      {
        id: 'review_meera_1',
        author: 'Harini K.',
        location: 'Madurai',
        rating: 5,
        title: 'Feels lighter than it looks',
        body: 'This is the kind of jhumka you can wear for hours and still enjoy the statement effect.',
        date: '15 Apr 2026',
        verified: true,
      },
      {
        id: 'review_meera_2',
        author: 'Vidya L.',
        location: 'Salem',
        rating: 4,
        title: 'Lovely detail work',
        body: 'The antique finish is convincing and the pair photographs beautifully in warm lighting.',
        date: '28 Feb 2026',
        verified: true,
      },
    ],
  },
  {
    id: 'prod_veda_kada_stack',
    slug: 'veda-kada-stack',
    name: 'Veda Kada Stack',
    category: 'Bangles',
    price: 2799,
    originalPrice: 3199,
    rating: 4.6,
    reviewCount: 86,
    shortDescription: 'Stack-ready kada set with engraved borders and subtle stone detailing.',
    description:
      'The Veda Kada Stack is made for festive mixing. Wear the full set for impact or split the stack across both hands for a lighter, marketplace-inspired styling approach.',
    image: '/products/veda-kada-stack.svg',
    imageAlt: 'Stack of engraved gold-tone bangles with subtle stone accents.',
    badge: 'Occasion Stack',
    tags: ['Bangles', 'Stackable', 'Gift Edit'],
    features: [
      'Five-piece coordinated stack',
      'Works solo or mixed with plain bangles',
      'Rounded inner edges for better comfort',
    ],
    material: 'Stone-set brass alloy with smooth inner rim',
    finish: 'Warm gold with engraved shine lines',
    wearability: 'Best for festive stacks, gifting, and quick styling',
    dispatch: 'Ships within 72 hours',
    reviews: [
      {
        id: 'review_veda_1',
        author: 'Pavithra J.',
        location: 'Erode',
        rating: 5,
        title: 'Looks fuller than a usual stack',
        body: 'I liked that it filled the wrist nicely without feeling sharp or bulky on the hand.',
        date: '11 Apr 2026',
        verified: true,
      },
      {
        id: 'review_veda_2',
        author: 'Sowmya T.',
        location: 'Kochi',
        rating: 4,
        title: 'Great for return gifting too',
        body: 'The finish is festive and the stack can be split for smaller looks, which makes it versatile.',
        date: '09 Mar 2026',
        verified: true,
      },
    ],
  },
  {
    id: 'prod_tara_pendant_set',
    slug: 'tara-pendant-set',
    name: 'Tara Pendant Set',
    category: 'Pendant Sets',
    price: 1599,
    originalPrice: 1999,
    rating: 4.5,
    reviewCount: 73,
    shortDescription: 'Floral pendant set with matching studs for everyday festive styling.',
    description:
      'Clean, polished, and easy to re-wear, the Tara Pendant Set is made for customers who want the shine of occasion jewelry in a format that still works for everyday outfits.',
    image: '/products/tara-pendant-set.svg',
    imageAlt: 'Gold floral pendant necklace set with matching round earrings.',
    badge: 'Everyday Luxe',
    tags: ['Pendant', 'Daily Wear', 'Lightweight'],
    features: [
      'Minimal floral centerpiece with matching studs',
      'Low-maintenance styling for daily and office wear',
      'Giftable box presentation',
    ],
    material: 'Alloy base with polished floral setting',
    finish: 'Soft champagne gold tone',
    wearability: 'Ideal for gifting, office wear, and light festive looks',
    dispatch: 'Ships within 48 hours',
    reviews: [
      {
        id: 'review_tara_1',
        author: 'Sneha B.',
        location: 'Mumbai',
        rating: 5,
        title: 'Simple and classy',
        body: 'This one works with kurtas and western outfits, so it has become my easiest grab-and-go piece.',
        date: '18 Apr 2026',
        verified: true,
      },
      {
        id: 'review_tara_2',
        author: 'Lakshmi G.',
        location: 'Trichy',
        rating: 4,
        title: 'Lovely gifting option',
        body: 'The size is neat and the matching studs make it feel complete without looking too heavy.',
        date: '21 Feb 2026',
        verified: true,
      },
    ],
  },
  {
    id: 'prod_anaya_layered_haram',
    slug: 'anaya-layered-haram',
    name: 'Anaya Layered Haram',
    category: 'Necklaces',
    price: 4199,
    originalPrice: 4899,
    rating: 4.8,
    reviewCount: 102,
    shortDescription: 'Long haram necklace with engraved medallion detailing and rich ceremonial drape.',
    description:
      'The Anaya Layered Haram is made for bridal silk sarees, half-saree looks, and ceremonial dressing where you want vertical length, structure, and a traditional gold-forward finish.',
    image: '/products/anaya-layered-haram.svg',
    imageAlt: 'Long layered haram style necklace with medallion details and antique finish.',
    badge: 'Ceremony Edit',
    featured: true,
    tags: ['Haram', 'Traditional', 'Ceremony'],
    features: [
      'Longline drape that frames silk blouses beautifully',
      'Medallion-inspired detailing for a traditional look',
      'Built to layer with chokers and studded earrings',
    ],
    material: 'Decorative alloy with textured plate work',
    finish: 'Antique gold ceremonial finish',
    wearability: 'Best for muhurtham, temple visits, and silk sarees',
    dispatch: 'Ships in 48 to 72 hours',
    reviews: [
      {
        id: 'review_anaya_1',
        author: 'Bhavya N.',
        location: 'Mysuru',
        rating: 5,
        title: 'Beautiful length and drape',
        body: 'I layered it with a shorter choker and the final look felt very polished and traditional.',
        date: '05 Apr 2026',
        verified: true,
      },
      {
        id: 'review_anaya_2',
        author: 'Priya C.',
        location: 'Vijayawada',
        rating: 4,
        title: 'Ideal with silk sarees',
        body: 'The finish works especially well in daylight and the chain does not feel rough on the neck.',
        date: '16 Jan 2026',
        verified: true,
      },
    ],
  },
];

export const products = seedProducts;

export const productCategories = Array.from(new Set(seedProducts.map((product) => product.category)));

export const productMap = Object.fromEntries(seedProducts.map((product) => [product.id, product]));

export function getProductBySlug(slug: string) {
  return seedProducts.find((product) => product.slug === slug);
}

export function getFeaturedProducts() {
  return seedProducts.filter((product) => product.featured);
}

export function getRelatedProducts(currentSlug: string, category: string) {
  return seedProducts.filter((product) => product.slug !== currentSlug && product.category === category);
}

export function getCustomerHighlights() {
  return seedProducts.flatMap((product) =>
    product.reviews.slice(0, 1).map((review) => ({
      ...review,
      productName: product.name,
    })),
  );
}


