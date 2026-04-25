# Aurum Coverings Storefront

A Vercel-ready covering jewelry ecommerce storefront built with Next.js (React + TypeScript), Razorpay for India-first online payments, Redis-backed auth/product management, and an accessible luxury-focused UI.

## What is included

- Modern home page with launch-ready merchandising sections
- Catalog browsing with search, category filters, and sorting
- Product detail pages with ratings, reviews, pricing, and product storytelling
- Cart drawer with persistent local storage state
- Online-only checkout flow using Razorpay Checkout for the Indian market
- Server-created Razorpay orders with server-side payment signature verification
- Razorpay webhook route with raw-body signature verification and duplicate-event handling
- Hidden admin portal with first-time setup, hashed password storage, email OTP verification, and product management
- Customer sign-up and sign-in with password plus email OTP before checkout
- Encrypted saved-address storage for signed-in customers
- Durable Neon Postgres order storage with admin fulfillment controls and customer notification logs
- Shared API hardening with origin checks, content-type and body-size validation, and rate limiting
- App-wide security headers through Next.js proxy and `X-Powered-By` removal
- Responsive layout, keyboard-friendly controls, reduced-motion support, and strong color contrast

## Project location

This app lives in:

`storefront`

If you import the repository into Vercel, set the **Root Directory** to `storefront`.

## Local development

1. Install dependencies:

```bash
npm install
```

2. Copy environment variables:

```bash
cp .env.example .env.local
```

On Windows PowerShell:

```powershell
Copy-Item .env.example .env.local
```

3. Fill in the required values in `.env.local`.

4. Start the dev server:

```bash
npm run dev
```

5. Open [http://localhost:3000](http://localhost:3000).

## Required environment variables

- `NEXT_PUBLIC_APP_URL`
- `SESSION_SECRET`
- `FIELD_ENCRYPTION_KEY`
- `ADMIN_PORTAL_SLUG`
- `UPSTASH_REDIS_REST_URL`
- `UPSTASH_REDIS_REST_TOKEN`
- `DATABASE_URL`
- `RESEND_API_KEY`
- `RESEND_FROM_EMAIL`
- `RAZORPAY_KEY_ID`
- `RAZORPAY_KEY_SECRET`
- `RAZORPAY_WEBHOOK_SECRET`

## Admin portal

The admin portal lives at:

`/gateway/<your-admin-portal-slug>`

Important notes:

- Keep `ADMIN_PORTAL_SLUG` long and hard to guess.
- The route is intentionally unlinked and `noindex`, but the real security comes from auth, OTP, signed cookies, and rate limiting.
- The first successful admin setup locks the store to one admin email and password.
- Nothing is hardcoded into the page. During the first setup, enter the admin email and password you want to permanently lock in, then verify with the OTP sent to that email.
- After setup, only that same admin identity can sign in.

## Customer accounts

This build requires customers to sign in before checkout.

That is a reasonable choice if you want:

- order traceability
- saved addresses
- stronger account protection
- less anonymous checkout abuse

The tradeoff is lower conversion compared with guest checkout. If you want maximum sales conversion later, we can add guest checkout while still encouraging account creation after purchase.

## Product management

The admin can:

- create new products
- update product names, slugs, categories, prices, ratings, review counts, descriptions, and merchandising copy
- mark products as featured

For product images, use files stored in `public`, for example `/products/new-item.jpg`. Admin product forms intentionally block arbitrary external image URLs for safer deployment and rendering.

## Razorpay setup

The order-creation route is at `src/app/api/checkout/route.ts`.

The payment verification route is at `src/app/api/checkout/verify/route.ts`.

The webhook route is at `src/app/api/webhook/razorpay/route.ts`.

Recommended Razorpay webhook events:

- `payment.authorized`
- `payment.captured`
- `payment.failed`
- `order.paid`

Webhook security notes:

- Configure a dedicated webhook secret in the Razorpay Dashboard and copy it into `RAZORPAY_WEBHOOK_SECRET`.
- The webhook route verifies the raw request body against `X-Razorpay-Signature`.
- Duplicate delivery handling uses `x-razorpay-event-id`.

## Orders database

Orders are stored in Neon Postgres using `DATABASE_URL`.

What is persisted:

- store order id plus Razorpay order/payment references
- customer email, phone, and encrypted delivery address
- item snapshot, total amount, payment status, and fulfillment status
- admin tracking numbers and internal notes
- customer notification history sent from the admin portal

Recommended setup on Vercel:

1. Add Neon Postgres from the Vercel Marketplace.
2. Confirm `DATABASE_URL` is available in the `storefront` project.
3. Redeploy.

The schema is created automatically on first use, so there is no separate migration command in this starter.

## Security notes

- Checkout requests are restricted to allowed origins and JSON payloads.
- Razorpay orders are created only on the server after cart revalidation against the live product map.
- Every successful checkout response is verified on the server using Razorpay's payment signature flow before the storefront treats the payment as valid.
- Payment verification also fetches the payment from Razorpay again and checks order id, amount, currency, and payment status.
- Razorpay webhooks verify the raw body signature and track duplicate event ids.
- Customer and admin sign-in flows use password plus email OTP.
- Passwords are hashed with `scrypt`.
- Session cookies are signed and `httpOnly`.
- Saved addresses are encrypted before storage.
- Order delivery addresses are encrypted before being written to Postgres.
- API responses are returned with `no-store` cache headers.
- The app sends CSP, frame protection, referrer, HSTS, and MIME-sniffing headers from the app proxy.
- The starter rate limiter is process-local; move it to Redis or another shared store if you expect higher traffic or multiple regions.

## Vercel deployment

1. Push the repo to GitHub.
2. Import the repo into Vercel.
3. Set the root directory to `storefront`.
4. Add all environment variables from `.env.local` to the Vercel project.
5. Add your production webhook URL in Razorpay Dashboard, pointing to `/api/webhook/razorpay`.
6. Deploy.

## Custom domain later

Once you are ready to move beyond the Vercel subdomain:

1. Open the Vercel project.
2. Go to `Settings -> Domains`.
3. Add your custom domain.
4. Update `NEXT_PUBLIC_APP_URL` to the final production domain.
5. Redeploy so checkout and callback URLs use the final host.

## Notes for the next phase

- Replace the sample product SVGs with real product photography.
- Persist verified Razorpay payments into a dedicated order database.
- Add customer order history pages using the signed-in account system.
- Add admin review management if you want to curate written reviews from the dashboard.
