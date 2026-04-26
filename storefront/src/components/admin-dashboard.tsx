'use client';

import { useDeferredValue, useState } from 'react';
import { usePathname, useSearchParams } from 'next/navigation';

import {
  createProductAction,
  deleteProductAction,
  logoutAdminAction,
  sendOrderNotificationAction,
  updateOrderAction,
  updateProductAction,
} from '@/app/actions/admin';
import { AdminDeleteProductButton } from '@/components/admin-delete-product-button';
import type {
  OrderNotificationRecord,
  OrderNotificationType,
  OrderRecord,
  OrderStatus,
  Product,
  UserAddress,
} from '@/lib/types';

type AdminSection = 'orders' | 'add-product' | 'modify-products';

type AdminOrderView = OrderRecord & {
  address: UserAddress | null;
  notifications: OrderNotificationRecord[];
};

type AdminDashboardProps = {
  error?: string;
  initialTab: AdminSection;
  notice?: string;
  orderStoreReady: boolean;
  orders: AdminOrderView[];
  portalPath: string;
  products: Product[];
};

const ORDER_STATUS_OPTIONS: Array<{ value: 'all' | OrderStatus; label: string }> = [
  { value: 'all', label: 'All orders' },
  { value: 'pending_payment', label: 'Pending payment' },
  { value: 'paid', label: 'Paid' },
  { value: 'processing', label: 'Processing' },
  { value: 'shipped', label: 'Shipped' },
  { value: 'delivered', label: 'Delivered' },
  { value: 'cancelled', label: 'Cancelled' },
  { value: 'payment_failed', label: 'Payment failed' },
];

const PRODUCT_SORT_OPTIONS = [
  { value: 'updated-desc', label: 'Recently updated' },
  { value: 'name-asc', label: 'Name A-Z' },
  { value: 'price-desc', label: 'Highest price' },
  { value: 'price-asc', label: 'Lowest price' },
];

function formatOrderAmount(amount: number) {
  return new Intl.NumberFormat('en-IN', {
    style: 'currency',
    currency: 'INR',
    maximumFractionDigits: 0,
  }).format(amount / 100);
}

function formatCatalogPrice(amount: number) {
  return new Intl.NumberFormat('en-IN', {
    style: 'currency',
    currency: 'INR',
    maximumFractionDigits: 0,
  }).format(amount);
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

function matchesOrderSearch(order: AdminOrderView, query: string) {
  if (!query) {
    return true;
  }

  const haystack = [
    order.id,
    order.customerName,
    order.email,
    order.customerPhone,
    order.razorpayOrderId,
    order.status,
    order.paymentStatus,
    order.fulfillmentStatus,
    order.trackingNumber ?? '',
  ]
    .join(' ')
    .toLowerCase();

  return haystack.includes(query);
}

function matchesProductSearch(product: Product, query: string) {
  if (!query) {
    return true;
  }

  const haystack = [
    product.name,
    product.slug,
    product.category,
    product.shortDescription,
    product.badge ?? '',
    product.material,
    product.finish,
    product.dispatch,
    product.tags.join(' '),
    product.features.join(' '),
  ]
    .join(' ')
    .toLowerCase();

  return haystack.includes(query);
}

function getOrderCount(orders: AdminOrderView[], status: 'all' | OrderStatus) {
  return status === 'all' ? orders.length : orders.filter((order) => order.status === status).length;
}

function getSectionCountLabel(section: AdminSection, orders: AdminOrderView[], products: Product[]) {
  switch (section) {
    case 'orders':
      return `${orders.length} tracked`;
    case 'add-product':
      return 'Create new pieces';
    default:
      return `${products.length} live products`;
  }
}

export function AdminDashboard({
  error,
  initialTab,
  notice,
  orderStoreReady,
  orders,
  portalPath,
  products,
}: AdminDashboardProps) {
  const pathname = usePathname();
  const searchParams = useSearchParams();
  const [activeTab, setActiveTab] = useState<AdminSection>(initialTab);
  const [orderStatusFilter, setOrderStatusFilter] = useState<'all' | OrderStatus>('all');
  const [orderQuery, setOrderQuery] = useState('');
  const [selectedOrderId, setSelectedOrderId] = useState(orders[0]?.id ?? '');
  const [productQuery, setProductQuery] = useState('');
  const [productCategory, setProductCategory] = useState('all');
  const [featuredFilter, setFeaturedFilter] = useState<'all' | 'featured' | 'standard'>('all');
  const [productSort, setProductSort] = useState<(typeof PRODUCT_SORT_OPTIONS)[number]['value']>('updated-desc');
  const [selectedProductId, setSelectedProductId] = useState(products[0]?.id ?? '');
  const deferredOrderQuery = useDeferredValue(orderQuery);
  const deferredProductQuery = useDeferredValue(productQuery);

  const normalizedOrderQuery = deferredOrderQuery.trim().toLowerCase();
  const normalizedProductQuery = deferredProductQuery.trim().toLowerCase();
  const productCategories = ['all', ...new Set(products.map((product) => product.category).sort((a, b) => a.localeCompare(b)))];

  const filteredOrders = orders.filter((order) => {
    if (orderStatusFilter !== 'all' && order.status !== orderStatusFilter) {
      return false;
    }

    return matchesOrderSearch(order, normalizedOrderQuery);
  });

  const filteredProducts = products
    .filter((product) => {
      if (productCategory !== 'all' && product.category !== productCategory) {
        return false;
      }

      if (featuredFilter === 'featured' && !product.featured) {
        return false;
      }

      if (featuredFilter === 'standard' && product.featured) {
        return false;
      }

      return matchesProductSearch(product, normalizedProductQuery);
    })
    .sort((left, right) => {
      switch (productSort) {
        case 'name-asc':
          return left.name.localeCompare(right.name);
        case 'price-asc':
          return left.price - right.price;
        case 'price-desc':
          return right.price - left.price;
        default:
          return new Date(right.updatedAt ?? right.createdAt ?? 0).getTime() - new Date(left.updatedAt ?? left.createdAt ?? 0).getTime();
      }
    });

  const selectedOrderIdOrFallback =
    filteredOrders.find((order) => order.id === selectedOrderId)?.id ?? filteredOrders[0]?.id ?? '';
  const selectedProductIdOrFallback =
    filteredProducts.find((product) => product.id === selectedProductId)?.id ?? filteredProducts[0]?.id ?? '';
  const selectedOrder = filteredOrders.find((order) => order.id === selectedOrderIdOrFallback) ?? null;
  const selectedProduct = filteredProducts.find((product) => product.id === selectedProductIdOrFallback) ?? null;

  function handleTabChange(section: AdminSection) {
    setActiveTab(section);

    const nextParams = new URLSearchParams(searchParams.toString());
    nextParams.delete('notice');
    nextParams.delete('error');
    nextParams.set('tab', section);

    const nextSearch = nextParams.toString();
    const nextUrl = nextSearch ? `${pathname}?${nextSearch}` : pathname;
    window.history.replaceState(window.history.state, '', nextUrl);
  }

  return (
    <div className="pb-20 pt-10 lg:pb-28">
      <div className="mx-auto w-[min(1320px,calc(100%-1.5rem))] space-y-8">
        <section className="rounded-[40px] border border-white/70 bg-[linear-gradient(135deg,rgba(255,255,255,0.78),rgba(248,236,219,0.94))] p-8 shadow-[0_24px_70px_rgba(87,60,14,0.12)] lg:p-10">
          <div className="flex flex-col gap-5 lg:flex-row lg:items-start lg:justify-between">
            <div>
              <p className="text-sm font-semibold uppercase tracking-[0.3em] text-stone-500">Hidden admin portal</p>
              <h1 className="mt-4 [font-family:var(--font-cormorant)] text-5xl font-semibold text-stone-900">Manage the live jewelry catalog with a cleaner control room.</h1>
              <p className="mt-4 max-w-3xl text-base leading-8 text-stone-600">
                Orders, new catalog entries, and product maintenance now live in dedicated sections so daily admin work stays focused instead of
                crowded into one long page.
              </p>
            </div>
            <form action={logoutAdminAction}>
              <input type="hidden" name="portalPath" value={portalPath} />
              <button
                type="submit"
                className="inline-flex items-center justify-center rounded-full border border-stone-300 bg-white px-5 py-3 text-sm font-semibold text-stone-900 transition hover:border-stone-900"
              >
                Sign out admin
              </button>
            </form>
          </div>
          {notice ? <p className="mt-4 rounded-2xl bg-emerald-50 px-4 py-3 text-sm font-medium text-emerald-700">{notice}</p> : null}
          {error ? <p className="mt-4 rounded-2xl bg-rose-50 px-4 py-3 text-sm font-medium text-rose-700">{error}</p> : null}
        </section>

        <section className="grid gap-4 lg:grid-cols-3">
          {([
            ['orders', 'Orders'],
            ['add-product', 'Add product'],
            ['modify-products', 'Modify product'],
          ] as const).map(([section, label]) => {
            const isActive = activeTab === section;

            return (
              <button
                key={section}
                type="button"
                onClick={() => handleTabChange(section)}
                className={`rounded-[32px] border px-6 py-5 text-left transition ${
                  isActive
                    ? 'border-stone-900 bg-stone-900 text-white shadow-[0_18px_45px_rgba(41,37,36,0.22)]'
                    : 'border-white/70 bg-white/85 text-stone-900 shadow-[0_16px_40px_rgba(87,60,14,0.08)] hover:border-stone-300'
                }`}
              >
                <p className={`text-xs font-semibold uppercase tracking-[0.24em] ${isActive ? 'text-stone-200' : 'text-stone-500'}`}>{label}</p>
                <p className="mt-3 text-2xl font-semibold">{getSectionCountLabel(section, orders, products)}</p>
              </button>
            );
          })}
        </section>

        {activeTab === 'orders' ? (
          <section className="rounded-[36px] border border-white/70 bg-white/85 p-6 shadow-[0_20px_60px_rgba(87,60,14,0.08)] lg:p-8">
            <div className="flex flex-col gap-3 lg:flex-row lg:items-end lg:justify-between">
              <div>
                <p className="text-sm font-semibold uppercase tracking-[0.24em] text-stone-500">Orders</p>
                <h2 className="mt-3 text-3xl font-semibold text-stone-900">Track pending payment, paid, fulfillment, and customer updates.</h2>
                <p className="mt-3 max-w-3xl text-sm leading-7 text-stone-600">
                  Filter the order queue by status, search by customer or order id, then work on one order at a time without the rest of the page
                  getting in the way.
                </p>
              </div>
            </div>

            {!orderStoreReady ? (
              <p className="mt-6 rounded-2xl bg-amber-50 px-4 py-3 text-sm font-medium text-amber-700">
                Add `DATABASE_URL` from a Neon Postgres database before secure order persistence and admin order editing can be used.
              </p>
            ) : orders.length === 0 ? (
              <p className="mt-6 rounded-2xl bg-stone-50 px-4 py-3 text-sm text-stone-600">
                No orders have been stored yet. Once a customer starts checkout, the order record will appear here and continue updating after
                payment verification and webhooks.
              </p>
            ) : (
              <>
                <div className="mt-6 grid gap-3 md:grid-cols-2 xl:grid-cols-4">
                  {ORDER_STATUS_OPTIONS.map((option) => {
                    const isActive = orderStatusFilter === option.value;

                    return (
                      <button
                        key={option.value}
                        type="button"
                        onClick={() => setOrderStatusFilter(option.value)}
                        className={`rounded-[26px] border px-4 py-4 text-left transition ${
                          isActive ? 'border-stone-900 bg-stone-900 text-white' : 'border-stone-200 bg-stone-50 text-stone-900 hover:border-stone-400'
                        }`}
                      >
                        <p className={`text-xs font-semibold uppercase tracking-[0.2em] ${isActive ? 'text-stone-200' : 'text-stone-500'}`}>{option.label}</p>
                        <p className="mt-3 text-2xl font-semibold">{getOrderCount(orders, option.value)}</p>
                      </button>
                    );
                  })}
                </div>

                <div className="mt-6 flex flex-col gap-4 rounded-[28px] border border-stone-200 bg-stone-50/80 p-4 lg:flex-row lg:items-center lg:justify-between">
                  <label className="flex flex-1 flex-col gap-2 text-sm font-medium text-stone-700">
                    Search orders
                    <input
                      value={orderQuery}
                      onChange={(event) => setOrderQuery(event.target.value)}
                      placeholder="Search by order id, customer, email, phone, or Razorpay order"
                      className="rounded-2xl border border-stone-200 bg-white px-4 py-3 outline-none focus:border-stone-900"
                    />
                  </label>
                  <p className="text-sm text-stone-500">
                    Showing <span className="font-semibold text-stone-900">{filteredOrders.length}</span> of {orders.length} orders
                  </p>
                </div>

                {filteredOrders.length === 0 ? (
                  <p className="mt-6 rounded-2xl bg-stone-50 px-4 py-3 text-sm text-stone-600">
                    No orders match the current search and status filters.
                  </p>
                ) : (
                  <div className="mt-6 grid gap-6 xl:grid-cols-[360px_minmax(0,1fr)]">
                    <div className="space-y-3">
                      {filteredOrders.map((order) => {
                        const isSelected = selectedOrder?.id === order.id;

                        return (
                          <button
                            key={order.id}
                            type="button"
                            onClick={() => setSelectedOrderId(order.id)}
                            className={`w-full rounded-[28px] border px-5 py-4 text-left transition ${
                              isSelected
                                ? 'border-stone-900 bg-stone-900 text-white shadow-[0_18px_45px_rgba(41,37,36,0.22)]'
                                : 'border-stone-200 bg-white text-stone-900 hover:border-stone-400'
                            }`}
                          >
                            <div className="flex flex-wrap items-center gap-2">
                              <span
                                className={`rounded-full px-3 py-1 text-xs font-semibold ${
                                  isSelected ? 'bg-white/15 text-stone-100' : getOrderStatusTone(order.status)
                                }`}
                              >
                                {order.status.replace(/_/g, ' ')}
                              </span>
                              <span className={`text-xs ${isSelected ? 'text-stone-300' : 'text-stone-500'}`}>{formatDateTime(order.createdAt)}</span>
                            </div>
                            <h3 className="mt-3 text-lg font-semibold">{order.customerName}</h3>
                            <p className={`mt-1 text-sm ${isSelected ? 'text-stone-300' : 'text-stone-500'}`}>{order.id}</p>
                            <p className={`mt-1 text-sm ${isSelected ? 'text-stone-200' : 'text-stone-600'}`}>{order.email}</p>
                            <div className="mt-4 flex items-center justify-between gap-4 text-sm">
                              <span className={isSelected ? 'text-stone-200' : 'text-stone-500'}>{order.fulfillmentStatus}</span>
                              <span className="font-semibold">{formatOrderAmount(order.amount)}</span>
                            </div>
                          </button>
                        );
                      })}
                    </div>

                    {selectedOrder ? (
                      <article className="rounded-[30px] border border-stone-200 bg-stone-50/70 p-5 shadow-[0_16px_40px_rgba(87,60,14,0.05)] lg:p-6">
                        <div className="flex flex-col gap-4 lg:flex-row lg:items-start lg:justify-between">
                          <div>
                            <div className="flex flex-wrap items-center gap-2">
                              <p className="text-xs font-semibold uppercase tracking-[0.22em] text-stone-500">Selected order</p>
                              <span className={`rounded-full px-3 py-1 text-xs font-semibold ${getOrderStatusTone(selectedOrder.status)}`}>
                                {selectedOrder.status.replace(/_/g, ' ')}
                              </span>
                            </div>
                            <h3 className="mt-3 text-2xl font-semibold text-stone-900">{selectedOrder.id}</h3>
                            <p className="mt-2 text-sm text-stone-600">
                              Placed {formatDateTime(selectedOrder.createdAt)} by {selectedOrder.customerName} ({selectedOrder.email})
                            </p>
                            <p className="mt-1 text-sm text-stone-500">Razorpay order: {selectedOrder.razorpayOrderId}</p>
                            {selectedOrder.paymentId ? <p className="mt-1 text-sm text-stone-500">Payment id: {selectedOrder.paymentId}</p> : null}
                          </div>
                          <div className="rounded-[24px] bg-white px-5 py-4 text-sm text-stone-700 shadow-sm">
                            <p>
                              <span className="font-semibold text-stone-900">Total:</span> {formatOrderAmount(selectedOrder.amount)}
                            </p>
                            <p className="mt-1">
                              <span className="font-semibold text-stone-900">Payment:</span> {selectedOrder.paymentStatus}
                            </p>
                            <p className="mt-1">
                              <span className="font-semibold text-stone-900">Fulfillment:</span> {selectedOrder.fulfillmentStatus}
                            </p>
                            <p className="mt-1">
                              <span className="font-semibold text-stone-900">Phone:</span> {selectedOrder.customerPhone || 'Not provided'}
                            </p>
                          </div>
                        </div>

                        <div className="mt-5 grid gap-5 lg:grid-cols-[1.05fr_0.95fr]">
                          <div className="space-y-5">
                            <section className="rounded-[24px] border border-stone-200 bg-white px-5 py-4">
                              <p className="text-xs font-semibold uppercase tracking-[0.18em] text-stone-500">Items</p>
                              <div className="mt-3 space-y-3">
                                {selectedOrder.items.map((item) => (
                                  <div key={`${selectedOrder.id}-${item.productId}`} className="flex items-center justify-between gap-4 text-sm text-stone-700">
                                    <div>
                                      <p className="font-semibold text-stone-900">{item.name}</p>
                                      <p className="text-stone-500">
                                        {item.category} · Qty {item.quantity}
                                      </p>
                                    </div>
                                    <p className="font-semibold text-stone-900">{formatOrderAmount(item.unitAmount * item.quantity)}</p>
                                  </div>
                                ))}
                              </div>
                            </section>

                            <section className="rounded-[24px] border border-stone-200 bg-white px-5 py-4">
                              <p className="text-xs font-semibold uppercase tracking-[0.18em] text-stone-500">Delivery address</p>
                              <div className="mt-3 text-sm leading-7 text-stone-700">
                                {selectedOrder.address ? (
                                  <>
                                    <p className="font-semibold text-stone-900">{selectedOrder.address.fullName}</p>
                                    <p>{selectedOrder.address.line1}</p>
                                    {selectedOrder.address.line2 ? <p>{selectedOrder.address.line2}</p> : null}
                                    <p>
                                      {selectedOrder.address.city}, {selectedOrder.address.state} {selectedOrder.address.postalCode}
                                    </p>
                                    <p>{selectedOrder.address.country}</p>
                                  </>
                                ) : (
                                  <p>Address could not be decrypted.</p>
                                )}
                              </div>
                            </section>

                            <section className="rounded-[24px] border border-stone-200 bg-white px-5 py-4">
                              <p className="text-xs font-semibold uppercase tracking-[0.18em] text-stone-500">Notification log</p>
                              {selectedOrder.notifications.length === 0 ? (
                                <p className="mt-3 text-sm text-stone-600">No customer notifications have been sent yet.</p>
                              ) : (
                                <div className="mt-3 space-y-3">
                                  {selectedOrder.notifications.map((notification) => (
                                    <div key={notification.id} className="rounded-2xl bg-stone-50 px-4 py-3 text-sm text-stone-700">
                                      <p className="font-semibold text-stone-900">{notification.subject}</p>
                                      <p className="mt-1 text-stone-500">
                                        {getNotificationLabel(notification.type)} · {formatDateTime(notification.createdAt)} · {notification.sentBy}
                                      </p>
                                      <p className="mt-2 whitespace-pre-line leading-7">{notification.message}</p>
                                    </div>
                                  ))}
                                </div>
                              )}
                            </section>
                          </div>

                          <div className="space-y-5">
                            <form
                              key={`update-${selectedOrder.id}`}
                              action={updateOrderAction}
                              className="rounded-[24px] border border-stone-200 bg-white px-5 py-4"
                            >
                              <input type="hidden" name="portalPath" value={portalPath} />
                              <input type="hidden" name="returnTab" value="orders" />
                              <input type="hidden" name="orderId" value={selectedOrder.id} />
                              <p className="text-xs font-semibold uppercase tracking-[0.18em] text-stone-500">Update fulfillment</p>
                              <div className="mt-4 space-y-4">
                                <label className="flex flex-col gap-2 text-sm font-medium text-stone-700">
                                  Fulfillment status
                                  <select
                                    name="fulfillmentStatus"
                                    defaultValue={selectedOrder.fulfillmentStatus}
                                    className="rounded-2xl border border-stone-200 px-4 py-3 outline-none focus:border-stone-900"
                                  >
                                    <option value="pending">Pending</option>
                                    <option value="processing">Processing</option>
                                    <option value="shipped">Shipped</option>
                                    <option value="delivered">Delivered</option>
                                    <option value="cancelled">Cancelled</option>
                                  </select>
                                </label>
                                <label className="flex flex-col gap-2 text-sm font-medium text-stone-700">
                                  Tracking number
                                  <input
                                    name="trackingNumber"
                                    defaultValue={selectedOrder.trackingNumber ?? ''}
                                    placeholder="Optional courier reference"
                                    className="rounded-2xl border border-stone-200 px-4 py-3 outline-none focus:border-stone-900"
                                  />
                                </label>
                                <label className="flex flex-col gap-2 text-sm font-medium text-stone-700">
                                  Admin note
                                  <textarea
                                    name="adminNote"
                                    rows={4}
                                    defaultValue={selectedOrder.adminNote ?? ''}
                                    placeholder="Internal note for cancellations, handling, or follow-up."
                                    className="rounded-3xl border border-stone-200 px-4 py-3 outline-none focus:border-stone-900"
                                  />
                                </label>
                                {selectedOrder.failureReason ? (
                                  <p className="rounded-2xl bg-rose-50 px-4 py-3 text-sm text-rose-700">Payment failure: {selectedOrder.failureReason}</p>
                                ) : null}
                                <button
                                  type="submit"
                                  className="inline-flex items-center justify-center rounded-full bg-stone-900 px-5 py-3 text-sm font-semibold text-white transition hover:bg-stone-700"
                                >
                                  Save order updates
                                </button>
                              </div>
                            </form>

                            <form
                              key={`notify-${selectedOrder.id}`}
                              action={sendOrderNotificationAction}
                              className="rounded-[24px] border border-stone-200 bg-white px-5 py-4"
                            >
                              <input type="hidden" name="portalPath" value={portalPath} />
                              <input type="hidden" name="returnTab" value="orders" />
                              <input type="hidden" name="orderId" value={selectedOrder.id} />
                              <p className="text-xs font-semibold uppercase tracking-[0.18em] text-stone-500">Notify customer</p>
                              <div className="mt-4 space-y-4">
                                <label className="flex flex-col gap-2 text-sm font-medium text-stone-700">
                                  Message type
                                  <select
                                    name="type"
                                    defaultValue="custom"
                                    className="rounded-2xl border border-stone-200 px-4 py-3 outline-none focus:border-stone-900"
                                  >
                                    <option value="custom">Custom</option>
                                    <option value="order_update">Order update</option>
                                    <option value="shipping_update">Shipping update</option>
                                  </select>
                                </label>
                                <label className="flex flex-col gap-2 text-sm font-medium text-stone-700">
                                  Subject
                                  <input
                                    name="subject"
                                    defaultValue={`Update for order ${selectedOrder.id}`}
                                    className="rounded-2xl border border-stone-200 px-4 py-3 outline-none focus:border-stone-900"
                                    required
                                  />
                                </label>
                                <label className="flex flex-col gap-2 text-sm font-medium text-stone-700">
                                  Message
                                  <textarea
                                    name="message"
                                    rows={6}
                                    defaultValue={`We are writing with an update about your order ${selectedOrder.id}.${selectedOrder.trackingNumber ? ` Tracking number: ${selectedOrder.trackingNumber}.` : ''}`}
                                    className="rounded-3xl border border-stone-200 px-4 py-3 outline-none focus:border-stone-900"
                                    required
                                  />
                                </label>
                                <p className="text-sm text-stone-500">
                                  This sends an email through the configured Resend sender and logs the message on this order.
                                </p>
                                <button
                                  type="submit"
                                  className="inline-flex items-center justify-center rounded-full border border-stone-300 bg-white px-5 py-3 text-sm font-semibold text-stone-900 transition hover:border-stone-900"
                                >
                                  Send customer email
                                </button>
                              </div>
                            </form>
                          </div>
                        </div>
                      </article>
                    ) : null}
                  </div>
                )}
              </>
            )}
          </section>
        ) : null}

        {activeTab === 'add-product' ? (
          <section className="rounded-[36px] border border-white/70 bg-white/85 p-6 shadow-[0_20px_60px_rgba(87,60,14,0.08)] lg:p-8">
            <p className="text-sm font-semibold uppercase tracking-[0.24em] text-stone-500">Add product</p>
            <h2 className="mt-3 text-3xl font-semibold text-stone-900">Create a new catalog entry without competing with the order queue.</h2>
            <p className="mt-3 max-w-3xl text-sm leading-7 text-stone-600">
              Use images from your own `public` folder, such as `/products/item.jpg`, so the storefront stays safe and deployable on Vercel
              without opening remote-image domains.
            </p>
            <form action={createProductAction} className="mt-6 grid gap-4 lg:grid-cols-2">
              <input type="hidden" name="portalPath" value={portalPath} />
              <input type="hidden" name="returnTab" value="add-product" />
              <label className="flex flex-col gap-2 text-sm font-medium text-stone-700">
                Name
                <input name="name" className="rounded-2xl border border-stone-200 px-4 py-3 outline-none focus:border-stone-900" required />
              </label>
              <label className="flex flex-col gap-2 text-sm font-medium text-stone-700">
                Slug
                <input
                  name="slug"
                  className="rounded-2xl border border-stone-200 px-4 py-3 outline-none focus:border-stone-900"
                  placeholder="auto-generated if left blank"
                />
              </label>
              <label className="flex flex-col gap-2 text-sm font-medium text-stone-700">
                Category
                <input name="category" className="rounded-2xl border border-stone-200 px-4 py-3 outline-none focus:border-stone-900" required />
              </label>
              <label className="flex flex-col gap-2 text-sm font-medium text-stone-700">
                Price
                <input name="price" type="number" min="1" className="rounded-2xl border border-stone-200 px-4 py-3 outline-none focus:border-stone-900" required />
              </label>
              <label className="flex flex-col gap-2 text-sm font-medium text-stone-700">
                Original price
                <input name="originalPrice" type="number" min="1" className="rounded-2xl border border-stone-200 px-4 py-3 outline-none focus:border-stone-900" />
              </label>
              <label className="flex flex-col gap-2 text-sm font-medium text-stone-700">
                Rating
                <input
                  name="rating"
                  type="number"
                  step="0.1"
                  min="0"
                  max="5"
                  defaultValue="0"
                  className="rounded-2xl border border-stone-200 px-4 py-3 outline-none focus:border-stone-900"
                />
              </label>
              <label className="flex flex-col gap-2 text-sm font-medium text-stone-700">
                Review count
                <input
                  name="reviewCount"
                  type="number"
                  min="0"
                  defaultValue="0"
                  className="rounded-2xl border border-stone-200 px-4 py-3 outline-none focus:border-stone-900"
                />
              </label>
              <label className="flex flex-col gap-2 text-sm font-medium text-stone-700 lg:col-span-2">
                Public image path
                <input
                  name="image"
                  className="rounded-2xl border border-stone-200 px-4 py-3 outline-none focus:border-stone-900"
                  placeholder="/products/example.jpg"
                  required
                />
              </label>
              <label className="flex flex-col gap-2 text-sm font-medium text-stone-700 lg:col-span-2">
                Image alt text
                <input name="imageAlt" className="rounded-2xl border border-stone-200 px-4 py-3 outline-none focus:border-stone-900" required />
              </label>
              <label className="flex flex-col gap-2 text-sm font-medium text-stone-700 lg:col-span-2">
                Short description
                <input
                  name="shortDescription"
                  className="rounded-2xl border border-stone-200 px-4 py-3 outline-none focus:border-stone-900"
                  required
                />
              </label>
              <label className="flex flex-col gap-2 text-sm font-medium text-stone-700 lg:col-span-2">
                Full description
                <textarea
                  name="description"
                  rows={4}
                  className="rounded-3xl border border-stone-200 px-4 py-3 outline-none focus:border-stone-900"
                  required
                />
              </label>
              <label className="flex flex-col gap-2 text-sm font-medium text-stone-700">
                Badge
                <input name="badge" className="rounded-2xl border border-stone-200 px-4 py-3 outline-none focus:border-stone-900" />
              </label>
              <label className="flex flex-col gap-2 text-sm font-medium text-stone-700">
                Tags (comma separated)
                <input name="tags" className="rounded-2xl border border-stone-200 px-4 py-3 outline-none focus:border-stone-900" />
              </label>
              <label className="flex flex-col gap-2 text-sm font-medium text-stone-700 lg:col-span-2">
                Features (one per line)
                <textarea
                  name="features"
                  rows={4}
                  className="rounded-3xl border border-stone-200 px-4 py-3 outline-none focus:border-stone-900"
                  required
                />
              </label>
              <label className="flex flex-col gap-2 text-sm font-medium text-stone-700">
                Material
                <input name="material" className="rounded-2xl border border-stone-200 px-4 py-3 outline-none focus:border-stone-900" required />
              </label>
              <label className="flex flex-col gap-2 text-sm font-medium text-stone-700">
                Finish
                <input name="finish" className="rounded-2xl border border-stone-200 px-4 py-3 outline-none focus:border-stone-900" required />
              </label>
              <label className="flex flex-col gap-2 text-sm font-medium text-stone-700">
                Wearability
                <input name="wearability" className="rounded-2xl border border-stone-200 px-4 py-3 outline-none focus:border-stone-900" required />
              </label>
              <label className="flex flex-col gap-2 text-sm font-medium text-stone-700">
                Dispatch
                <input name="dispatch" className="rounded-2xl border border-stone-200 px-4 py-3 outline-none focus:border-stone-900" required />
              </label>
              <label className="flex items-center gap-3 text-sm font-medium text-stone-700">
                <input type="checkbox" name="featured" className="h-4 w-4 rounded border-stone-300" />
                Feature on storefront
              </label>
              <div className="lg:col-span-2">
                <button
                  type="submit"
                  className="inline-flex items-center justify-center rounded-full bg-stone-900 px-6 py-3 text-sm font-semibold text-white transition hover:bg-stone-700"
                >
                  Create product
                </button>
              </div>
            </form>
          </section>
        ) : null}

        {activeTab === 'modify-products' ? (
          <section className="rounded-[36px] border border-white/70 bg-white/85 p-6 shadow-[0_20px_60px_rgba(87,60,14,0.08)] lg:p-8">
            <p className="text-sm font-semibold uppercase tracking-[0.24em] text-stone-500">Modify product</p>
            <h2 className="mt-3 text-3xl font-semibold text-stone-900">Search, filter, and update one live product at a time.</h2>
            <p className="mt-3 max-w-3xl text-sm leading-7 text-stone-600">
              Use the search and category filters to find pieces by name, slug, category, material, finish, tags, or other catalog details before
              editing.
            </p>

            <div className="mt-6 grid gap-4 rounded-[28px] border border-stone-200 bg-stone-50/80 p-4 xl:grid-cols-[minmax(0,1fr)_180px_180px_180px]">
              <label className="flex flex-col gap-2 text-sm font-medium text-stone-700">
                Search products
                <input
                  value={productQuery}
                  onChange={(event) => setProductQuery(event.target.value)}
                  placeholder="Search by name, slug, category, material, finish, tags, or badge"
                  className="rounded-2xl border border-stone-200 bg-white px-4 py-3 outline-none focus:border-stone-900"
                />
              </label>
              <label className="flex flex-col gap-2 text-sm font-medium text-stone-700">
                Category
                <select
                  value={productCategory}
                  onChange={(event) => setProductCategory(event.target.value)}
                  className="rounded-2xl border border-stone-200 bg-white px-4 py-3 outline-none focus:border-stone-900"
                >
                  {productCategories.map((category) => (
                    <option key={category} value={category}>
                      {category === 'all' ? 'All categories' : category}
                    </option>
                  ))}
                </select>
              </label>
              <label className="flex flex-col gap-2 text-sm font-medium text-stone-700">
                Visibility
                <select
                  value={featuredFilter}
                  onChange={(event) => setFeaturedFilter(event.target.value as typeof featuredFilter)}
                  className="rounded-2xl border border-stone-200 bg-white px-4 py-3 outline-none focus:border-stone-900"
                >
                  <option value="all">All products</option>
                  <option value="featured">Featured only</option>
                  <option value="standard">Standard only</option>
                </select>
              </label>
              <label className="flex flex-col gap-2 text-sm font-medium text-stone-700">
                Sort
                <select
                  value={productSort}
                  onChange={(event) => setProductSort(event.target.value as (typeof PRODUCT_SORT_OPTIONS)[number]['value'])}
                  className="rounded-2xl border border-stone-200 bg-white px-4 py-3 outline-none focus:border-stone-900"
                >
                  {PRODUCT_SORT_OPTIONS.map((option) => (
                    <option key={option.value} value={option.value}>
                      {option.label}
                    </option>
                  ))}
                </select>
              </label>
            </div>

            {filteredProducts.length === 0 ? (
              <p className="mt-6 rounded-2xl bg-stone-50 px-4 py-3 text-sm text-stone-600">
                No products match the current filters. Adjust the search or category settings to continue.
              </p>
            ) : (
              <div className="mt-6 grid gap-6 xl:grid-cols-[360px_minmax(0,1fr)]">
                <div className="space-y-3">
                  <div className="rounded-[28px] border border-stone-200 bg-stone-50 px-5 py-4 text-sm text-stone-600">
                    Showing <span className="font-semibold text-stone-900">{filteredProducts.length}</span> of {products.length} products
                  </div>
                  {filteredProducts.map((product) => {
                    const isSelected = selectedProduct?.id === product.id;

                    return (
                      <button
                        key={product.id}
                        type="button"
                        onClick={() => setSelectedProductId(product.id)}
                        className={`w-full rounded-[28px] border px-5 py-4 text-left transition ${
                          isSelected
                            ? 'border-stone-900 bg-stone-900 text-white shadow-[0_18px_45px_rgba(41,37,36,0.22)]'
                            : 'border-stone-200 bg-white text-stone-900 hover:border-stone-400'
                        }`}
                      >
                        <div className="flex flex-wrap items-center gap-2">
                          <span className={`text-xs font-semibold uppercase tracking-[0.18em] ${isSelected ? 'text-stone-200' : 'text-stone-500'}`}>
                            {product.category}
                          </span>
                          {product.featured ? (
                            <span className={`rounded-full px-3 py-1 text-xs font-semibold ${isSelected ? 'bg-white/15 text-stone-100' : 'bg-amber-50 text-amber-700'}`}>
                              Featured
                            </span>
                          ) : null}
                        </div>
                        <h3 className="mt-3 text-lg font-semibold">{product.name}</h3>
                        <p className={`mt-1 text-sm ${isSelected ? 'text-stone-300' : 'text-stone-500'}`}>{product.slug}</p>
                        <div className="mt-4 flex items-center justify-between gap-4 text-sm">
                          <span className={isSelected ? 'text-stone-200' : 'text-stone-500'}>{product.material}</span>
                          <span className="font-semibold">{formatCatalogPrice(product.price)}</span>
                        </div>
                      </button>
                    );
                  })}
                </div>

                {selectedProduct ? (
                  <form
                    key={selectedProduct.id}
                    action={updateProductAction}
                    className="rounded-[36px] border border-stone-200 bg-stone-50/70 p-6 shadow-[0_20px_60px_rgba(87,60,14,0.08)] lg:p-8"
                  >
                    <input type="hidden" name="portalPath" value={portalPath} />
                    <input type="hidden" name="returnTab" value="modify-products" />
                    <input type="hidden" name="productId" value={selectedProduct.id} />
                    <div className="mb-5 flex flex-col gap-4 lg:flex-row lg:items-center lg:justify-between">
                      <div>
                        <p className="text-sm font-semibold uppercase tracking-[0.24em] text-stone-500">{selectedProduct.category}</p>
                        <h3 className="mt-2 text-2xl font-semibold text-stone-900">{selectedProduct.name}</h3>
                        <p className="mt-2 text-sm text-stone-500">
                          Last updated {formatDateTime(selectedProduct.updatedAt ?? selectedProduct.createdAt)}
                        </p>
                      </div>
                      <div className="flex flex-wrap gap-3">
                        <button
                          type="submit"
                          className="inline-flex items-center justify-center rounded-full bg-stone-900 px-5 py-3 text-sm font-semibold text-white transition hover:bg-stone-700"
                        >
                          Save changes
                        </button>
                        <AdminDeleteProductButton
                          action={deleteProductAction}
                          confirmMessage={`Remove ${selectedProduct.name} from the catalog?`}
                          className="inline-flex items-center justify-center rounded-full border border-rose-200 bg-white px-5 py-3 text-sm font-semibold text-rose-700 transition hover:border-rose-400 hover:bg-rose-50"
                        >
                          Remove product
                        </AdminDeleteProductButton>
                      </div>
                    </div>
                    <div className="grid gap-4 lg:grid-cols-2">
                      <label className="flex flex-col gap-2 text-sm font-medium text-stone-700">
                        Name
                        <input
                          name="name"
                          defaultValue={selectedProduct.name}
                          className="rounded-2xl border border-stone-200 px-4 py-3 outline-none focus:border-stone-900"
                          required
                        />
                      </label>
                      <label className="flex flex-col gap-2 text-sm font-medium text-stone-700">
                        Slug
                        <input
                          name="slug"
                          defaultValue={selectedProduct.slug}
                          className="rounded-2xl border border-stone-200 px-4 py-3 outline-none focus:border-stone-900"
                          required
                        />
                      </label>
                      <label className="flex flex-col gap-2 text-sm font-medium text-stone-700">
                        Category
                        <input
                          name="category"
                          defaultValue={selectedProduct.category}
                          className="rounded-2xl border border-stone-200 px-4 py-3 outline-none focus:border-stone-900"
                          required
                        />
                      </label>
                      <label className="flex flex-col gap-2 text-sm font-medium text-stone-700">
                        Price
                        <input
                          name="price"
                          type="number"
                          min="1"
                          defaultValue={selectedProduct.price}
                          className="rounded-2xl border border-stone-200 px-4 py-3 outline-none focus:border-stone-900"
                          required
                        />
                      </label>
                      <label className="flex flex-col gap-2 text-sm font-medium text-stone-700">
                        Original price
                        <input
                          name="originalPrice"
                          type="number"
                          min="1"
                          defaultValue={selectedProduct.originalPrice ?? ''}
                          className="rounded-2xl border border-stone-200 px-4 py-3 outline-none focus:border-stone-900"
                        />
                      </label>
                      <label className="flex flex-col gap-2 text-sm font-medium text-stone-700">
                        Rating
                        <input
                          name="rating"
                          type="number"
                          step="0.1"
                          min="0"
                          max="5"
                          defaultValue={selectedProduct.rating}
                          className="rounded-2xl border border-stone-200 px-4 py-3 outline-none focus:border-stone-900"
                        />
                      </label>
                      <label className="flex flex-col gap-2 text-sm font-medium text-stone-700">
                        Review count
                        <input
                          name="reviewCount"
                          type="number"
                          min="0"
                          defaultValue={selectedProduct.reviewCount}
                          className="rounded-2xl border border-stone-200 px-4 py-3 outline-none focus:border-stone-900"
                        />
                      </label>
                      <label className="flex flex-col gap-2 text-sm font-medium text-stone-700 lg:col-span-2">
                        Public image path
                        <input
                          name="image"
                          defaultValue={selectedProduct.image}
                          className="rounded-2xl border border-stone-200 px-4 py-3 outline-none focus:border-stone-900"
                          required
                        />
                      </label>
                      <label className="flex flex-col gap-2 text-sm font-medium text-stone-700 lg:col-span-2">
                        Image alt text
                        <input
                          name="imageAlt"
                          defaultValue={selectedProduct.imageAlt}
                          className="rounded-2xl border border-stone-200 px-4 py-3 outline-none focus:border-stone-900"
                          required
                        />
                      </label>
                      <label className="flex flex-col gap-2 text-sm font-medium text-stone-700 lg:col-span-2">
                        Short description
                        <input
                          name="shortDescription"
                          defaultValue={selectedProduct.shortDescription}
                          className="rounded-2xl border border-stone-200 px-4 py-3 outline-none focus:border-stone-900"
                          required
                        />
                      </label>
                      <label className="flex flex-col gap-2 text-sm font-medium text-stone-700 lg:col-span-2">
                        Full description
                        <textarea
                          name="description"
                          rows={4}
                          defaultValue={selectedProduct.description}
                          className="rounded-3xl border border-stone-200 px-4 py-3 outline-none focus:border-stone-900"
                          required
                        />
                      </label>
                      <label className="flex flex-col gap-2 text-sm font-medium text-stone-700">
                        Badge
                        <input
                          name="badge"
                          defaultValue={selectedProduct.badge ?? ''}
                          className="rounded-2xl border border-stone-200 px-4 py-3 outline-none focus:border-stone-900"
                        />
                      </label>
                      <label className="flex flex-col gap-2 text-sm font-medium text-stone-700">
                        Tags (comma separated)
                        <input
                          name="tags"
                          defaultValue={selectedProduct.tags.join(', ')}
                          className="rounded-2xl border border-stone-200 px-4 py-3 outline-none focus:border-stone-900"
                        />
                      </label>
                      <label className="flex flex-col gap-2 text-sm font-medium text-stone-700 lg:col-span-2">
                        Features (one per line)
                        <textarea
                          name="features"
                          rows={4}
                          defaultValue={selectedProduct.features.join('\n')}
                          className="rounded-3xl border border-stone-200 px-4 py-3 outline-none focus:border-stone-900"
                          required
                        />
                      </label>
                      <label className="flex flex-col gap-2 text-sm font-medium text-stone-700">
                        Material
                        <input
                          name="material"
                          defaultValue={selectedProduct.material}
                          className="rounded-2xl border border-stone-200 px-4 py-3 outline-none focus:border-stone-900"
                          required
                        />
                      </label>
                      <label className="flex flex-col gap-2 text-sm font-medium text-stone-700">
                        Finish
                        <input
                          name="finish"
                          defaultValue={selectedProduct.finish}
                          className="rounded-2xl border border-stone-200 px-4 py-3 outline-none focus:border-stone-900"
                          required
                        />
                      </label>
                      <label className="flex flex-col gap-2 text-sm font-medium text-stone-700">
                        Wearability
                        <input
                          name="wearability"
                          defaultValue={selectedProduct.wearability}
                          className="rounded-2xl border border-stone-200 px-4 py-3 outline-none focus:border-stone-900"
                          required
                        />
                      </label>
                      <label className="flex flex-col gap-2 text-sm font-medium text-stone-700">
                        Dispatch
                        <input
                          name="dispatch"
                          defaultValue={selectedProduct.dispatch}
                          className="rounded-2xl border border-stone-200 px-4 py-3 outline-none focus:border-stone-900"
                          required
                        />
                      </label>
                      <label className="flex items-center gap-3 text-sm font-medium text-stone-700">
                        <input
                          type="checkbox"
                          name="featured"
                          defaultChecked={Boolean(selectedProduct.featured)}
                          className="h-4 w-4 rounded border-stone-300"
                        />
                        Feature on storefront
                      </label>
                    </div>
                    <p className="mt-4 text-sm text-stone-500">
                      Removing a product deletes it from the live catalog in Redis. Existing orders keep their own stored item snapshot.
                    </p>
                  </form>
                ) : null}
              </div>
            )}
          </section>
        ) : null}
      </div>
    </div>
  );
}
