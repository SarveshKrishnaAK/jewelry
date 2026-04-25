import { neon } from '@neondatabase/serverless';

import type { OrderNotificationRecord, OrderRecord, PaymentCartItem } from '@/lib/types';

type SqlClient = ReturnType<typeof neon>;

type OrderRow = {
  id: string;
  razorpay_order_id: string;
  receipt: string;
  user_id: string;
  email: string;
  customer_name: string;
  customer_phone: string;
  shipping_address_ciphertext: string;
  amount: number;
  currency: 'INR';
  status: OrderRecord['status'];
  payment_status: OrderRecord['paymentStatus'];
  fulfillment_status: OrderRecord['fulfillmentStatus'];
  items_json: PaymentCartItem[] | string;
  payment_id: string | null;
  failure_reason: string | null;
  admin_note: string | null;
  tracking_number: string | null;
  created_at: string;
  updated_at: string;
  paid_at: string | null;
  cancelled_at: string | null;
};

type NotificationRow = {
  id: string;
  order_id: string;
  type: OrderNotificationRecord['type'];
  recipient_email: string;
  subject: string;
  message: string;
  sent_by: string;
  created_at: string;
};

let sqlClient: SqlClient | undefined;
let orderSchemaReadyPromise: Promise<void> | undefined;

export function isOrderStoreConfigured() {
  return Boolean(process.env.DATABASE_URL);
}

function getSql() {
  if (!process.env.DATABASE_URL) {
    throw new Error('Missing DATABASE_URL. Configure Neon Postgres before storing orders.');
  }

  if (!sqlClient) {
    sqlClient = neon(process.env.DATABASE_URL);
  }

  return sqlClient;
}

async function ensureOrderSchema() {
  if (!isOrderStoreConfigured()) {
    throw new Error('Missing DATABASE_URL. Configure Neon Postgres before storing orders.');
  }

  if (!orderSchemaReadyPromise) {
    orderSchemaReadyPromise = (async () => {
      const sql = getSql();

      await sql`
        CREATE TABLE IF NOT EXISTS aurum_orders (
          id TEXT PRIMARY KEY,
          razorpay_order_id TEXT NOT NULL UNIQUE,
          receipt TEXT NOT NULL,
          user_id TEXT NOT NULL,
          email TEXT NOT NULL,
          customer_name TEXT NOT NULL,
          customer_phone TEXT NOT NULL,
          shipping_address_ciphertext TEXT NOT NULL,
          amount INTEGER NOT NULL,
          currency TEXT NOT NULL,
          status TEXT NOT NULL,
          payment_status TEXT NOT NULL,
          fulfillment_status TEXT NOT NULL,
          items_json JSONB NOT NULL,
          payment_id TEXT,
          failure_reason TEXT,
          admin_note TEXT,
          tracking_number TEXT,
          created_at TEXT NOT NULL,
          updated_at TEXT NOT NULL,
          paid_at TEXT,
          cancelled_at TEXT
        )
      `;

      await sql`
        CREATE TABLE IF NOT EXISTS aurum_order_notifications (
          id TEXT PRIMARY KEY,
          order_id TEXT NOT NULL REFERENCES aurum_orders(id) ON DELETE CASCADE,
          type TEXT NOT NULL,
          recipient_email TEXT NOT NULL,
          subject TEXT NOT NULL,
          message TEXT NOT NULL,
          sent_by TEXT NOT NULL,
          created_at TEXT NOT NULL
        )
      `;

      await sql`CREATE INDEX IF NOT EXISTS aurum_orders_created_at_idx ON aurum_orders (created_at DESC)`;
      await sql`CREATE INDEX IF NOT EXISTS aurum_orders_user_id_idx ON aurum_orders (user_id)`;
      await sql`CREATE INDEX IF NOT EXISTS aurum_orders_status_idx ON aurum_orders (status)`;
      await sql`CREATE INDEX IF NOT EXISTS aurum_order_notifications_order_id_idx ON aurum_order_notifications (order_id, created_at DESC)`;
    })();
  }

  await orderSchemaReadyPromise;
}

function parseItems(items: PaymentCartItem[] | string) {
  if (Array.isArray(items)) {
    return items;
  }

  try {
    const parsed = JSON.parse(items) as PaymentCartItem[];
    return Array.isArray(parsed) ? parsed : [];
  } catch {
    return [];
  }
}

function mapOrderRow(row: OrderRow): OrderRecord {
  return {
    id: row.id,
    razorpayOrderId: row.razorpay_order_id,
    receipt: row.receipt,
    userId: row.user_id,
    email: row.email,
    customerName: row.customer_name,
    customerPhone: row.customer_phone,
    shippingAddressCiphertext: row.shipping_address_ciphertext,
    amount: Number(row.amount),
    currency: row.currency,
    status: row.status,
    paymentStatus: row.payment_status,
    fulfillmentStatus: row.fulfillment_status,
    items: parseItems(row.items_json),
    paymentId: row.payment_id ?? undefined,
    failureReason: row.failure_reason ?? undefined,
    adminNote: row.admin_note ?? undefined,
    trackingNumber: row.tracking_number ?? undefined,
    createdAt: row.created_at,
    updatedAt: row.updated_at,
    paidAt: row.paid_at ?? undefined,
    cancelledAt: row.cancelled_at ?? undefined,
  };
}

function mapNotificationRow(row: NotificationRow): OrderNotificationRecord {
  return {
    id: row.id,
    orderId: row.order_id,
    type: row.type,
    to: row.recipient_email,
    subject: row.subject,
    message: row.message,
    sentBy: row.sent_by,
    createdAt: row.created_at,
  };
}

export function deriveOrderStatus({
  paymentStatus,
  fulfillmentStatus,
  failureReason,
}: Pick<OrderRecord, 'paymentStatus' | 'fulfillmentStatus' | 'failureReason'>): OrderRecord['status'] {
  if (fulfillmentStatus === 'cancelled') {
    return 'cancelled';
  }

  if (fulfillmentStatus === 'delivered') {
    return 'delivered';
  }

  if (fulfillmentStatus === 'shipped') {
    return 'shipped';
  }

  if (fulfillmentStatus === 'processing') {
    return 'processing';
  }

  if (paymentStatus === 'captured' || paymentStatus === 'authorized') {
    return 'paid';
  }

  if (paymentStatus === 'failed' || failureReason) {
    return 'payment_failed';
  }

  return 'pending_payment';
}

export async function createOrderRecord(record: OrderRecord) {
  await ensureOrderSchema();
  const sql = getSql();

  await sql`
    INSERT INTO aurum_orders (
      id,
      razorpay_order_id,
      receipt,
      user_id,
      email,
      customer_name,
      customer_phone,
      shipping_address_ciphertext,
      amount,
      currency,
      status,
      payment_status,
      fulfillment_status,
      items_json,
      payment_id,
      failure_reason,
      admin_note,
      tracking_number,
      created_at,
      updated_at,
      paid_at,
      cancelled_at
    ) VALUES (
      ${record.id},
      ${record.razorpayOrderId},
      ${record.receipt},
      ${record.userId},
      ${record.email},
      ${record.customerName},
      ${record.customerPhone},
      ${record.shippingAddressCiphertext},
      ${record.amount},
      ${record.currency},
      ${record.status},
      ${record.paymentStatus},
      ${record.fulfillmentStatus},
      ${JSON.stringify(record.items)},
      ${record.paymentId ?? null},
      ${record.failureReason ?? null},
      ${record.adminNote ?? null},
      ${record.trackingNumber ?? null},
      ${record.createdAt},
      ${record.updatedAt},
      ${record.paidAt ?? null},
      ${record.cancelledAt ?? null}
    )
    ON CONFLICT (id) DO UPDATE SET
      razorpay_order_id = EXCLUDED.razorpay_order_id,
      receipt = EXCLUDED.receipt,
      user_id = EXCLUDED.user_id,
      email = EXCLUDED.email,
      customer_name = EXCLUDED.customer_name,
      customer_phone = EXCLUDED.customer_phone,
      shipping_address_ciphertext = EXCLUDED.shipping_address_ciphertext,
      amount = EXCLUDED.amount,
      currency = EXCLUDED.currency,
      status = EXCLUDED.status,
      payment_status = EXCLUDED.payment_status,
      fulfillment_status = EXCLUDED.fulfillment_status,
      items_json = EXCLUDED.items_json,
      payment_id = EXCLUDED.payment_id,
      failure_reason = EXCLUDED.failure_reason,
      admin_note = EXCLUDED.admin_note,
      tracking_number = EXCLUDED.tracking_number,
      updated_at = EXCLUDED.updated_at,
      paid_at = EXCLUDED.paid_at,
      cancelled_at = EXCLUDED.cancelled_at
  `;
}

export async function updateOrderRecord(record: OrderRecord) {
  await createOrderRecord(record);
}

export async function getOrderById(orderId: string) {
  await ensureOrderSchema();
  const sql = getSql();
  const rows = (await sql`SELECT * FROM aurum_orders WHERE id = ${orderId} LIMIT 1`) as OrderRow[];
  return rows[0] ? mapOrderRow(rows[0]) : null;
}

export async function getOrderByRazorpayOrderId(razorpayOrderId: string) {
  await ensureOrderSchema();
  const sql = getSql();
  const rows = (await sql`SELECT * FROM aurum_orders WHERE razorpay_order_id = ${razorpayOrderId} LIMIT 1`) as OrderRow[];
  return rows[0] ? mapOrderRow(rows[0]) : null;
}

export async function getRecentOrders(limit = 50) {
  await ensureOrderSchema();
  const sql = getSql();
  const rows = (await sql`
    SELECT *
    FROM aurum_orders
    ORDER BY created_at DESC
    LIMIT ${Math.max(1, Math.min(limit, 100))}
  `) as OrderRow[];
  return rows.map(mapOrderRow);
}

export async function saveOrderNotification(notification: OrderNotificationRecord) {
  await ensureOrderSchema();
  const sql = getSql();

  await sql`
    INSERT INTO aurum_order_notifications (
      id,
      order_id,
      type,
      recipient_email,
      subject,
      message,
      sent_by,
      created_at
    ) VALUES (
      ${notification.id},
      ${notification.orderId},
      ${notification.type},
      ${notification.to},
      ${notification.subject},
      ${notification.message},
      ${notification.sentBy},
      ${notification.createdAt}
    )
  `;
}

export async function getOrderNotifications(orderId: string) {
  await ensureOrderSchema();
  const sql = getSql();
  const rows = (await sql`
    SELECT *
    FROM aurum_order_notifications
    WHERE order_id = ${orderId}
    ORDER BY created_at DESC
  `) as NotificationRow[];
  return rows.map(mapNotificationRow);
}
