import type { Metadata } from 'next';
import { notFound } from 'next/navigation';

import {
  beginAdminLogin,
  beginAdminSetup,
  completeAdminLogin,
  completeAdminSetup,
  createProductAction,
  logoutAdminAction,
  sendOrderNotificationAction,
  updateOrderAction,
  updateProductAction,
} from '@/app/actions/admin';
import { getCurrentSession } from '@/lib/auth';
import { adminExists, getAdminRecord } from '@/lib/auth-store';
import { getAdminPortalSlug } from '@/lib/admin';
import { decryptJson } from '@/lib/crypto';
import { getOrderNotifications, getRecentOrders, isOrderStoreConfigured } from '@/lib/order-store';
import { getAllProducts } from '@/lib/product-store';
import type { OrderNotificationRecord, OrderNotificationType, OrderRecord, UserAddress } from '@/lib/types';

export const metadata: Metadata = {
  title: 'Admin Access',
  robots: {
    index: false,
    follow: false,
  },
};

type AdminPageProps = {
  params: Promise<{ slug: string }>;
  searchParams: Promise<Record<string, string | string[] | undefined>>;
};

type AdminOrderView = OrderRecord & {
  address: UserAddress | null;
  notifications: OrderNotificationRecord[];
};

function readQueryParam(value: string | string[] | undefined) {
  return Array.isArray(value) ? value[0] : value;
}

function formatOrderAmount(amount: number) {
  return new Intl.NumberFormat('en-IN', {
    style: 'currency',
    currency: 'INR',
    maximumFractionDigits: 0,
  }).format(amount / 100);
}

function formatDateTime(value: string | undefined) {
  if (!value) {
    return 'Not available';
  }

  const date = new Date(value);
  return Number.isNaN(date.getTime()) ? value : date.toLocaleString('en-IN');
}

function getOrderStatusTone(status: OrderRecord['status']) {
  switch (status) {
    case 'paid':
    case 'processing':
    case 'shipped':
    case 'delivered':
      return 'bg-emerald-50 text-emerald-700';
    case 'payment_failed':
    case 'cancelled':
      return 'bg-rose-50 text-rose-700';
    default:
      return 'bg-amber-50 text-amber-700';
  }
}

function getNotificationLabel(type: OrderNotificationType) {
  switch (type) {
    case 'order_update':
      return 'Order update';
    case 'shipping_update':
      return 'Shipping update';
    default:
      return 'Custom';
  }
}

export default async function AdminPage({ params, searchParams }: AdminPageProps) {
  const { slug } = await params;
  const query = await searchParams;
  const portalSlug = getAdminPortalSlug();

  if (slug !== portalSlug) {
    notFound();
  }

  const portalPath = `/gateway/${portalSlug}`;
  const mode = readQueryParam(query.mode) ?? '';
  const error = readQueryParam(query.error);
  const notice = readQueryParam(query.notice);
  const emailHint = readQueryParam(query.email);
  const session = await getCurrentSession();
  const hasAdmin = await adminExists();
  const admin = await getAdminRecord();
  const products = await getAllProducts();
  const orderStoreReady = isOrderStoreConfigured();
  const orders: OrderRecord[] = orderStoreReady ? await getRecentOrders(50) : [];
  const ordersWithNotifications: AdminOrderView[] = await Promise.all(
    orders.map(async (order) => ({
      ...order,
      address: decryptJson<UserAddress>(order.shippingAddressCiphertext),
      notifications: await getOrderNotifications(order.id),
    })),
  );

  if (session?.role === 'admin') {
    return (
      <div className="pb-20 pt-10 lg:pb-28">
        <div className="mx-auto w-[min(1200px,calc(100%-1.5rem))] space-y-8">
          <section className="rounded-[40px] border border-white/70 bg-[linear-gradient(135deg,rgba(255,255,255,0.78),rgba(248,236,219,0.94))] p-8 shadow-[0_24px_70px_rgba(87,60,14,0.12)] lg:p-10">
            <div className="flex flex-col gap-4 lg:flex-row lg:items-center lg:justify-between">
              <div>
                <p className="text-sm font-semibold uppercase tracking-[0.3em] text-stone-500">Hidden admin portal</p>
                <h1 className="mt-4 [font-family:var(--font-cormorant)] text-5xl font-semibold text-stone-900">Manage the live jewelry catalog.</h1>
                <p className="mt-4 max-w-3xl text-base leading-8 text-stone-600">This route is intentionally not linked anywhere public, but the real protection is the admin-only account, password hashing, signed sessions, rate limits, and mandatory OTP verification.</p>
              </div>
              <form action={logoutAdminAction}>
                <input type="hidden" name="portalPath" value={portalPath} />
                <button type="submit" className="inline-flex items-center justify-center rounded-full border border-stone-300 bg-white px-5 py-3 text-sm font-semibold text-stone-900 transition hover:border-stone-900">
                  Sign out admin
                </button>
              </form>
            </div>
            {notice ? <p className="mt-4 rounded-2xl bg-emerald-50 px-4 py-3 text-sm font-medium text-emerald-700">{notice}</p> : null}
            {error ? <p className="mt-4 rounded-2xl bg-rose-50 px-4 py-3 text-sm font-medium text-rose-700">{error}</p> : null}
          </section>

          <section className="rounded-[36px] border border-white/70 bg-white/85 p-6 shadow-[0_20px_60px_rgba(87,60,14,0.08)] lg:p-8">
            <div className="flex flex-col gap-3 lg:flex-row lg:items-end lg:justify-between">
              <div>
                <p className="text-sm font-semibold uppercase tracking-[0.24em] text-stone-500">Orders database</p>
                <h2 className="mt-3 text-3xl font-semibold text-stone-900">Track payments, fulfillment, and customer updates from one place.</h2>
                <p className="mt-3 text-sm leading-7 text-stone-600">Orders are stored in Postgres with the delivery address kept encrypted at rest. Payment status stays synced from Razorpay, while fulfillment notes and customer notifications can be handled here.</p>
              </div>
            </div>

            {!orderStoreReady ? (
              <p className="mt-6 rounded-2xl bg-amber-50 px-4 py-3 text-sm font-medium text-amber-700">Add `DATABASE_URL` from a Neon Postgres database before secure order persistence and admin order editing can be used.</p>
            ) : ordersWithNotifications.length === 0 ? (
              <p className="mt-6 rounded-2xl bg-stone-50 px-4 py-3 text-sm text-stone-600">No orders have been stored yet. Once a customer starts checkout, the order record will appear here and continue updating after payment verification and webhooks.</p>
            ) : (
              <div className="mt-6 space-y-6">
                {ordersWithNotifications.map((order) => (
                  <article key={order.id} className="rounded-[30px] border border-stone-200 bg-stone-50/70 p-5 shadow-[0_16px_40px_rgba(87,60,14,0.05)] lg:p-6">
                    <div className="flex flex-col gap-4 lg:flex-row lg:items-start lg:justify-between">
                      <div>
                        <div className="flex flex-wrap items-center gap-2">
                          <p className="text-xs font-semibold uppercase tracking-[0.22em] text-stone-500">Order</p>
                          <span className={`rounded-full px-3 py-1 text-xs font-semibold ${getOrderStatusTone(order.status)}`}>{order.status.replace(/_/g, ' ')}</span>
                        </div>
                        <h3 className="mt-3 text-2xl font-semibold text-stone-900">{order.id}</h3>
                        <p className="mt-2 text-sm text-stone-600">Placed {formatDateTime(order.createdAt)} by {order.customerName} ({order.email})</p>
                        <p className="mt-1 text-sm text-stone-500">Razorpay order: {order.razorpayOrderId}</p>
                        {order.paymentId ? <p className="mt-1 text-sm text-stone-500">Payment id: {order.paymentId}</p> : null}
                      </div>
                      <div className="rounded-[24px] bg-white px-5 py-4 text-sm text-stone-700 shadow-sm">
                        <p><span className="font-semibold text-stone-900">Total:</span> {formatOrderAmount(order.amount)}</p>
                        <p className="mt-1"><span className="font-semibold text-stone-900">Payment:</span> {order.paymentStatus}</p>
                        <p className="mt-1"><span className="font-semibold text-stone-900">Fulfillment:</span> {order.fulfillmentStatus}</p>
                        <p className="mt-1"><span className="font-semibold text-stone-900">Phone:</span> {order.customerPhone || 'Not provided'}</p>
                      </div>
                    </div>

                    <div className="mt-5 grid gap-5 lg:grid-cols-[1.05fr_0.95fr]">
                      <div className="space-y-5">
                        <section className="rounded-[24px] border border-stone-200 bg-white px-5 py-4">
                          <p className="text-xs font-semibold uppercase tracking-[0.18em] text-stone-500">Items</p>
                          <div className="mt-3 space-y-3">
                            {order.items.map((item) => (
                              <div key={`${order.id}-${item.productId}`} className="flex items-center justify-between gap-4 text-sm text-stone-700">
                                <div>
                                  <p className="font-semibold text-stone-900">{item.name}</p>
                                  <p className="text-stone-500">{item.category} · Qty {item.quantity}</p>
                                </div>
                                <p className="font-semibold text-stone-900">{formatOrderAmount(item.unitAmount * item.quantity)}</p>
                              </div>
                            ))}
                          </div>
                        </section>

                        <section className="rounded-[24px] border border-stone-200 bg-white px-5 py-4">
                          <p className="text-xs font-semibold uppercase tracking-[0.18em] text-stone-500">Delivery address</p>
                          <div className="mt-3 text-sm leading-7 text-stone-700">
                            {order.address ? (
                              <>
                                <p className="font-semibold text-stone-900">{order.address.fullName}</p>
                                <p>{order.address.line1}</p>
                                {order.address.line2 ? <p>{order.address.line2}</p> : null}
                                <p>{order.address.city}, {order.address.state} {order.address.postalCode}</p>
                                <p>{order.address.country}</p>
                              </>
                            ) : (
                              <p>Address could not be decrypted.</p>
                            )}
                          </div>
                        </section>

                        <section className="rounded-[24px] border border-stone-200 bg-white px-5 py-4">
                          <p className="text-xs font-semibold uppercase tracking-[0.18em] text-stone-500">Notification log</p>
                          {order.notifications.length === 0 ? (
                            <p className="mt-3 text-sm text-stone-600">No customer notifications have been sent yet.</p>
                          ) : (
                            <div className="mt-3 space-y-3">
                              {order.notifications.map((notification) => (
                                <div key={notification.id} className="rounded-2xl bg-stone-50 px-4 py-3 text-sm text-stone-700">
                                  <p className="font-semibold text-stone-900">{notification.subject}</p>
                                  <p className="mt-1 text-stone-500">{getNotificationLabel(notification.type)} · {formatDateTime(notification.createdAt)} · {notification.sentBy}</p>
                                  <p className="mt-2 whitespace-pre-line leading-7">{notification.message}</p>
                                </div>
                              ))}
                            </div>
                          )}
                        </section>
                      </div>

                      <div className="space-y-5">
                        <form action={updateOrderAction} className="rounded-[24px] border border-stone-200 bg-white px-5 py-4">
                          <input type="hidden" name="portalPath" value={portalPath} />
                          <input type="hidden" name="orderId" value={order.id} />
                          <p className="text-xs font-semibold uppercase tracking-[0.18em] text-stone-500">Update fulfillment</p>
                          <div className="mt-4 space-y-4">
                            <label className="flex flex-col gap-2 text-sm font-medium text-stone-700">
                              Fulfillment status
                              <select name="fulfillmentStatus" defaultValue={order.fulfillmentStatus} className="rounded-2xl border border-stone-200 px-4 py-3 outline-none focus:border-stone-900">
                                <option value="pending">Pending</option>
                                <option value="processing">Processing</option>
                                <option value="shipped">Shipped</option>
                                <option value="delivered">Delivered</option>
                                <option value="cancelled">Cancelled</option>
                              </select>
                            </label>
                            <label className="flex flex-col gap-2 text-sm font-medium text-stone-700">
                              Tracking number
                              <input name="trackingNumber" defaultValue={order.trackingNumber ?? ''} placeholder="Optional courier reference" className="rounded-2xl border border-stone-200 px-4 py-3 outline-none focus:border-stone-900" />
                            </label>
                            <label className="flex flex-col gap-2 text-sm font-medium text-stone-700">
                              Admin note
                              <textarea name="adminNote" rows={4} defaultValue={order.adminNote ?? ''} placeholder="Internal note for cancellations, handling, or follow-up." className="rounded-3xl border border-stone-200 px-4 py-3 outline-none focus:border-stone-900" />
                            </label>
                            {order.failureReason ? <p className="rounded-2xl bg-rose-50 px-4 py-3 text-sm text-rose-700">Payment failure: {order.failureReason}</p> : null}
                            <button type="submit" className="inline-flex items-center justify-center rounded-full bg-stone-900 px-5 py-3 text-sm font-semibold text-white transition hover:bg-stone-700">Save order updates</button>
                          </div>
                        </form>

                        <form action={sendOrderNotificationAction} className="rounded-[24px] border border-stone-200 bg-white px-5 py-4">
                          <input type="hidden" name="portalPath" value={portalPath} />
                          <input type="hidden" name="orderId" value={order.id} />
                          <p className="text-xs font-semibold uppercase tracking-[0.18em] text-stone-500">Notify customer</p>
                          <div className="mt-4 space-y-4">
                            <label className="flex flex-col gap-2 text-sm font-medium text-stone-700">
                              Message type
                              <select name="type" defaultValue="custom" className="rounded-2xl border border-stone-200 px-4 py-3 outline-none focus:border-stone-900">
                                <option value="custom">Custom</option>
                                <option value="order_update">Order update</option>
                                <option value="shipping_update">Shipping update</option>
                              </select>
                            </label>
                            <label className="flex flex-col gap-2 text-sm font-medium text-stone-700">
                              Subject
                              <input name="subject" defaultValue={`Update for order ${order.id}`} className="rounded-2xl border border-stone-200 px-4 py-3 outline-none focus:border-stone-900" required />
                            </label>
                            <label className="flex flex-col gap-2 text-sm font-medium text-stone-700">
                              Message
                              <textarea
                                name="message"
                                rows={6}
                                defaultValue={`We are writing with an update about your order ${order.id}.${order.trackingNumber ? ` Tracking number: ${order.trackingNumber}.` : ''}`}
                                className="rounded-3xl border border-stone-200 px-4 py-3 outline-none focus:border-stone-900"
                                required
                              />
                            </label>
                            <p className="text-sm text-stone-500">This sends an email through the configured Resend sender and logs the message on this order.</p>
                            <button type="submit" className="inline-flex items-center justify-center rounded-full border border-stone-300 bg-white px-5 py-3 text-sm font-semibold text-stone-900 transition hover:border-stone-900">Send customer email</button>
                          </div>
                        </form>
                      </div>
                    </div>
                  </article>
                ))}
              </div>
            )}
          </section>

          <section className="rounded-[36px] border border-white/70 bg-white/85 p-6 shadow-[0_20px_60px_rgba(87,60,14,0.08)] lg:p-8">
            <p className="text-sm font-semibold uppercase tracking-[0.24em] text-stone-500">Add a product</p>
            <h2 className="mt-3 text-3xl font-semibold text-stone-900">Create new catalog entries with full product detail.</h2>
            <p className="mt-3 text-sm leading-7 text-stone-600">Use images from your own `public` folder, such as `/products/item.jpg`, so the storefront stays safe and deployable on Vercel without opening remote-image domains.</p>
            <form action={createProductAction} className="mt-6 grid gap-4 lg:grid-cols-2">
              <input type="hidden" name="portalPath" value={portalPath} />
              <label className="flex flex-col gap-2 text-sm font-medium text-stone-700">Name<input name="name" className="rounded-2xl border border-stone-200 px-4 py-3 outline-none focus:border-stone-900" required /></label>
              <label className="flex flex-col gap-2 text-sm font-medium text-stone-700">Slug<input name="slug" className="rounded-2xl border border-stone-200 px-4 py-3 outline-none focus:border-stone-900" placeholder="auto-generated if left blank" /></label>
              <label className="flex flex-col gap-2 text-sm font-medium text-stone-700">Category<input name="category" className="rounded-2xl border border-stone-200 px-4 py-3 outline-none focus:border-stone-900" required /></label>
              <label className="flex flex-col gap-2 text-sm font-medium text-stone-700">Price<input name="price" type="number" min="1" className="rounded-2xl border border-stone-200 px-4 py-3 outline-none focus:border-stone-900" required /></label>
              <label className="flex flex-col gap-2 text-sm font-medium text-stone-700">Original price<input name="originalPrice" type="number" min="1" className="rounded-2xl border border-stone-200 px-4 py-3 outline-none focus:border-stone-900" /></label>
              <label className="flex flex-col gap-2 text-sm font-medium text-stone-700">Rating<input name="rating" type="number" step="0.1" min="0" max="5" defaultValue="0" className="rounded-2xl border border-stone-200 px-4 py-3 outline-none focus:border-stone-900" /></label>
              <label className="flex flex-col gap-2 text-sm font-medium text-stone-700">Review count<input name="reviewCount" type="number" min="0" defaultValue="0" className="rounded-2xl border border-stone-200 px-4 py-3 outline-none focus:border-stone-900" /></label>
              <label className="flex flex-col gap-2 text-sm font-medium text-stone-700 lg:col-span-2">Public image path<input name="image" className="rounded-2xl border border-stone-200 px-4 py-3 outline-none focus:border-stone-900" placeholder="/products/example.jpg" required /></label>
              <label className="flex flex-col gap-2 text-sm font-medium text-stone-700 lg:col-span-2">Image alt text<input name="imageAlt" className="rounded-2xl border border-stone-200 px-4 py-3 outline-none focus:border-stone-900" required /></label>
              <label className="flex flex-col gap-2 text-sm font-medium text-stone-700 lg:col-span-2">Short description<input name="shortDescription" className="rounded-2xl border border-stone-200 px-4 py-3 outline-none focus:border-stone-900" required /></label>
              <label className="flex flex-col gap-2 text-sm font-medium text-stone-700 lg:col-span-2">Full description<textarea name="description" rows={4} className="rounded-3xl border border-stone-200 px-4 py-3 outline-none focus:border-stone-900" required /></label>
              <label className="flex flex-col gap-2 text-sm font-medium text-stone-700">Badge<input name="badge" className="rounded-2xl border border-stone-200 px-4 py-3 outline-none focus:border-stone-900" /></label>
              <label className="flex flex-col gap-2 text-sm font-medium text-stone-700">Tags (comma separated)<input name="tags" className="rounded-2xl border border-stone-200 px-4 py-3 outline-none focus:border-stone-900" /></label>
              <label className="flex flex-col gap-2 text-sm font-medium text-stone-700 lg:col-span-2">Features (one per line)<textarea name="features" rows={4} className="rounded-3xl border border-stone-200 px-4 py-3 outline-none focus:border-stone-900" required /></label>
              <label className="flex flex-col gap-2 text-sm font-medium text-stone-700">Material<input name="material" className="rounded-2xl border border-stone-200 px-4 py-3 outline-none focus:border-stone-900" required /></label>
              <label className="flex flex-col gap-2 text-sm font-medium text-stone-700">Finish<input name="finish" className="rounded-2xl border border-stone-200 px-4 py-3 outline-none focus:border-stone-900" required /></label>
              <label className="flex flex-col gap-2 text-sm font-medium text-stone-700">Wearability<input name="wearability" className="rounded-2xl border border-stone-200 px-4 py-3 outline-none focus:border-stone-900" required /></label>
              <label className="flex flex-col gap-2 text-sm font-medium text-stone-700">Dispatch<input name="dispatch" className="rounded-2xl border border-stone-200 px-4 py-3 outline-none focus:border-stone-900" required /></label>
              <label className="flex items-center gap-3 text-sm font-medium text-stone-700"><input type="checkbox" name="featured" className="h-4 w-4 rounded border-stone-300" /> Feature on storefront</label>
              <div className="lg:col-span-2">
                <button type="submit" className="inline-flex items-center justify-center rounded-full bg-stone-900 px-6 py-3 text-sm font-semibold text-white transition hover:bg-stone-700">Create product</button>
              </div>
            </form>
          </section>

          <section className="space-y-6">
            <div>
              <p className="text-sm font-semibold uppercase tracking-[0.24em] text-stone-500">Current products</p>
              <h2 className="mt-3 text-3xl font-semibold text-stone-900">Update names, pricing, ratings, visibility, and copy at any time.</h2>
            </div>
            <div className="space-y-6">
              {products.map((product) => (
                <form key={product.id} action={updateProductAction} className="rounded-[36px] border border-white/70 bg-white/85 p-6 shadow-[0_20px_60px_rgba(87,60,14,0.08)] lg:p-8">
                  <input type="hidden" name="portalPath" value={portalPath} />
                  <input type="hidden" name="productId" value={product.id} />
                  <div className="mb-5 flex items-center justify-between gap-4">
                    <div>
                      <p className="text-sm font-semibold uppercase tracking-[0.24em] text-stone-500">{product.category}</p>
                      <h3 className="mt-2 text-2xl font-semibold text-stone-900">{product.name}</h3>
                    </div>
                    <button type="submit" className="inline-flex items-center justify-center rounded-full bg-stone-900 px-5 py-3 text-sm font-semibold text-white transition hover:bg-stone-700">Save changes</button>
                  </div>
                  <div className="grid gap-4 lg:grid-cols-2">
                    <label className="flex flex-col gap-2 text-sm font-medium text-stone-700">Name<input name="name" defaultValue={product.name} className="rounded-2xl border border-stone-200 px-4 py-3 outline-none focus:border-stone-900" required /></label>
                    <label className="flex flex-col gap-2 text-sm font-medium text-stone-700">Slug<input name="slug" defaultValue={product.slug} className="rounded-2xl border border-stone-200 px-4 py-3 outline-none focus:border-stone-900" required /></label>
                    <label className="flex flex-col gap-2 text-sm font-medium text-stone-700">Category<input name="category" defaultValue={product.category} className="rounded-2xl border border-stone-200 px-4 py-3 outline-none focus:border-stone-900" required /></label>
                    <label className="flex flex-col gap-2 text-sm font-medium text-stone-700">Price<input name="price" type="number" min="1" defaultValue={product.price} className="rounded-2xl border border-stone-200 px-4 py-3 outline-none focus:border-stone-900" required /></label>
                    <label className="flex flex-col gap-2 text-sm font-medium text-stone-700">Original price<input name="originalPrice" type="number" min="1" defaultValue={product.originalPrice ?? ''} className="rounded-2xl border border-stone-200 px-4 py-3 outline-none focus:border-stone-900" /></label>
                    <label className="flex flex-col gap-2 text-sm font-medium text-stone-700">Rating<input name="rating" type="number" step="0.1" min="0" max="5" defaultValue={product.rating} className="rounded-2xl border border-stone-200 px-4 py-3 outline-none focus:border-stone-900" /></label>
                    <label className="flex flex-col gap-2 text-sm font-medium text-stone-700">Review count<input name="reviewCount" type="number" min="0" defaultValue={product.reviewCount} className="rounded-2xl border border-stone-200 px-4 py-3 outline-none focus:border-stone-900" /></label>
                    <label className="flex flex-col gap-2 text-sm font-medium text-stone-700 lg:col-span-2">Public image path<input name="image" defaultValue={product.image} className="rounded-2xl border border-stone-200 px-4 py-3 outline-none focus:border-stone-900" required /></label>
                    <label className="flex flex-col gap-2 text-sm font-medium text-stone-700 lg:col-span-2">Image alt text<input name="imageAlt" defaultValue={product.imageAlt} className="rounded-2xl border border-stone-200 px-4 py-3 outline-none focus:border-stone-900" required /></label>
                    <label className="flex flex-col gap-2 text-sm font-medium text-stone-700 lg:col-span-2">Short description<input name="shortDescription" defaultValue={product.shortDescription} className="rounded-2xl border border-stone-200 px-4 py-3 outline-none focus:border-stone-900" required /></label>
                    <label className="flex flex-col gap-2 text-sm font-medium text-stone-700 lg:col-span-2">Full description<textarea name="description" rows={4} defaultValue={product.description} className="rounded-3xl border border-stone-200 px-4 py-3 outline-none focus:border-stone-900" required /></label>
                    <label className="flex flex-col gap-2 text-sm font-medium text-stone-700">Badge<input name="badge" defaultValue={product.badge ?? ''} className="rounded-2xl border border-stone-200 px-4 py-3 outline-none focus:border-stone-900" /></label>
                    <label className="flex flex-col gap-2 text-sm font-medium text-stone-700">Tags (comma separated)<input name="tags" defaultValue={product.tags.join(', ')} className="rounded-2xl border border-stone-200 px-4 py-3 outline-none focus:border-stone-900" /></label>
                    <label className="flex flex-col gap-2 text-sm font-medium text-stone-700 lg:col-span-2">Features (one per line)<textarea name="features" rows={4} defaultValue={product.features.join('\n')} className="rounded-3xl border border-stone-200 px-4 py-3 outline-none focus:border-stone-900" required /></label>
                    <label className="flex flex-col gap-2 text-sm font-medium text-stone-700">Material<input name="material" defaultValue={product.material} className="rounded-2xl border border-stone-200 px-4 py-3 outline-none focus:border-stone-900" required /></label>
                    <label className="flex flex-col gap-2 text-sm font-medium text-stone-700">Finish<input name="finish" defaultValue={product.finish} className="rounded-2xl border border-stone-200 px-4 py-3 outline-none focus:border-stone-900" required /></label>
                    <label className="flex flex-col gap-2 text-sm font-medium text-stone-700">Wearability<input name="wearability" defaultValue={product.wearability} className="rounded-2xl border border-stone-200 px-4 py-3 outline-none focus:border-stone-900" required /></label>
                    <label className="flex flex-col gap-2 text-sm font-medium text-stone-700">Dispatch<input name="dispatch" defaultValue={product.dispatch} className="rounded-2xl border border-stone-200 px-4 py-3 outline-none focus:border-stone-900" required /></label>
                    <label className="flex items-center gap-3 text-sm font-medium text-stone-700"><input type="checkbox" name="featured" defaultChecked={Boolean(product.featured)} className="h-4 w-4 rounded border-stone-300" /> Feature on storefront</label>
                  </div>
                </form>
              ))}
            </div>
          </section>
        </div>
      </div>
    );
  }

  return (
    <div className="pb-20 pt-10 lg:pb-28">
      <div className="mx-auto w-[min(900px,calc(100%-1.5rem))] space-y-8">
        <section className="rounded-[40px] border border-white/70 bg-[linear-gradient(135deg,rgba(255,255,255,0.78),rgba(248,236,219,0.94))] p-8 shadow-[0_24px_70px_rgba(87,60,14,0.12)] lg:p-10">
          <p className="text-sm font-semibold uppercase tracking-[0.3em] text-stone-500">Restricted admin access</p>
          <h1 className="mt-4 [font-family:var(--font-cormorant)] text-5xl font-semibold text-stone-900">Hidden catalog control room.</h1>
          <p className="mt-5 text-base leading-8 text-stone-600">This route is intentionally unlinked and marked no-index. Still, the real protection comes from the single-admin setup, hashed credentials, signed cookies, rate limits, and OTP verification on every fresh login.</p>
          {notice ? <p className="mt-4 rounded-2xl bg-emerald-50 px-4 py-3 text-sm font-medium text-emerald-700">{notice}</p> : null}
          {error ? <p className="mt-4 rounded-2xl bg-rose-50 px-4 py-3 text-sm font-medium text-rose-700">{error}</p> : null}
        </section>

        {mode === 'verify-setup' || mode === 'verify-login' ? (
          <section className="rounded-[36px] border border-white/70 bg-white/85 p-6 shadow-[0_20px_60px_rgba(87,60,14,0.08)] lg:p-8">
            <p className="text-sm font-semibold uppercase tracking-[0.24em] text-stone-500">Admin OTP</p>
            <h2 className="mt-3 text-3xl font-semibold text-stone-900">Enter the code sent to {emailHint ?? admin?.email ?? 'the admin email'}.</h2>
            <form action={mode === 'verify-setup' ? completeAdminSetup : completeAdminLogin} className="mt-6 max-w-md space-y-4">
              <input type="hidden" name="portalPath" value={portalPath} />
              <label className="flex flex-col gap-2 text-sm font-medium text-stone-700">One-time password<input name="otp" autoComplete="one-time-code" inputMode="numeric" pattern="[0-9]{6}" maxLength={6} className="rounded-2xl border border-stone-200 bg-white px-4 py-3 text-lg tracking-[0.32em] outline-none focus:border-stone-900" required /></label>
              <button type="submit" className="inline-flex items-center justify-center rounded-full bg-stone-900 px-6 py-3 text-sm font-semibold text-white transition hover:bg-stone-700">Verify admin access</button>
            </form>
          </section>
        ) : hasAdmin ? (
          <section className="rounded-[36px] border border-white/70 bg-white/85 p-6 shadow-[0_20px_60px_rgba(87,60,14,0.08)] lg:p-8">
            <p className="text-sm font-semibold uppercase tracking-[0.24em] text-stone-500">Admin sign-in</p>
            <h2 className="mt-3 text-3xl font-semibold text-stone-900">Password plus email OTP.</h2>
            <form action={beginAdminLogin} className="mt-6 space-y-4">
              <input type="hidden" name="portalPath" value={portalPath} />
              <label className="flex flex-col gap-2 text-sm font-medium text-stone-700">Admin email<input type="email" name="email" autoComplete="email" defaultValue={admin?.email ?? ''} placeholder="Enter the locked admin email" className="rounded-2xl border border-stone-200 px-4 py-3 outline-none focus:border-stone-900" required /></label>
              <label className="flex flex-col gap-2 text-sm font-medium text-stone-700">Password<input type="password" name="password" autoComplete="current-password" placeholder="Enter the locked admin password" className="rounded-2xl border border-stone-200 px-4 py-3 outline-none focus:border-stone-900" required /></label>
              <button type="submit" className="inline-flex items-center justify-center rounded-full bg-stone-900 px-6 py-3 text-sm font-semibold text-white transition hover:bg-stone-700">Send admin OTP</button>
            </form>
          </section>
        ) : (
          <section className="rounded-[36px] border border-white/70 bg-white/85 p-6 shadow-[0_20px_60px_rgba(87,60,14,0.08)] lg:p-8">
            <p className="text-sm font-semibold uppercase tracking-[0.24em] text-stone-500">First-time admin setup</p>
            <h2 className="mt-3 text-3xl font-semibold text-stone-900">Choose the one admin identity for this store.</h2>
            <p className="mt-3 text-sm leading-7 text-stone-600">The first successful setup defines the only admin email and password. After that, the same credentials plus OTP are required every time. Nothing is prefilled or hardcoded into the page.</p>
            <form action={beginAdminSetup} className="mt-6 space-y-4">
              <input type="hidden" name="portalPath" value={portalPath} />
              <label className="flex flex-col gap-2 text-sm font-medium text-stone-700">Admin email<input type="email" name="email" autoComplete="email" placeholder="name@example.com" className="rounded-2xl border border-stone-200 px-4 py-3 outline-none focus:border-stone-900" required /></label>
              <label className="flex flex-col gap-2 text-sm font-medium text-stone-700">Password<input type="password" name="password" autoComplete="new-password" placeholder="Choose a strong password" className="rounded-2xl border border-stone-200 px-4 py-3 outline-none focus:border-stone-900" required /></label>
              <p className="text-sm leading-7 text-stone-500">Choose the admin email and strong password you want to lock in for the store, then confirm the OTP sent to that email.</p>
              <button type="submit" className="inline-flex items-center justify-center rounded-full bg-stone-900 px-6 py-3 text-sm font-semibold text-white transition hover:bg-stone-700">Send setup OTP</button>
            </form>
          </section>
        )}
      </div>
    </div>
  );
}

