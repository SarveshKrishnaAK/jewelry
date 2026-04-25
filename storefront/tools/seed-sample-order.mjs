import { existsSync, readFileSync } from 'node:fs';
import path from 'node:path';
import { fileURLToPath } from 'node:url';
import { createCipheriv, createHash, randomBytes } from 'node:crypto';

import { neon } from '@neondatabase/serverless';

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);
const projectRoot = path.resolve(__dirname, '..');

function loadEnvFile(filePath) {
  if (!existsSync(filePath)) {
    return;
  }

  const fileContents = readFileSync(filePath, 'utf8');

  for (const rawLine of fileContents.split(/\r?\n/)) {
    const line = rawLine.trim();

    if (!line || line.startsWith('#')) {
      continue;
    }

    const equalsIndex = line.indexOf('=');

    if (equalsIndex === -1) {
      continue;
    }

    const key = line.slice(0, equalsIndex).trim();
    let value = line.slice(equalsIndex + 1).trim();

    if ((value.startsWith('"') && value.endsWith('"')) || (value.startsWith("'") && value.endsWith("'"))) {
      value = value.slice(1, -1);
    }

    if (!(key in process.env)) {
      process.env[key] = value;
    }
  }
}

loadEnvFile(path.join(projectRoot, '.env.local'));
loadEnvFile(path.join(projectRoot, '.env.production.local'));
loadEnvFile(path.join(projectRoot, '.env'));

function base64UrlEncode(input) {
  return Buffer.from(input)
    .toString('base64')
    .replace(/\+/g, '-')
    .replace(/\//g, '_')
    .replace(/=+$/g, '');
}

function getFieldEncryptionKey() {
  const source = process.env.FIELD_ENCRYPTION_KEY ?? process.env.SESSION_SECRET;

  if (!source) {
    throw new Error('Missing FIELD_ENCRYPTION_KEY or SESSION_SECRET. Add one before seeding a sample order.');
  }

  return createHash('sha256').update(source).digest();
}

function encryptJson(value) {
  const key = getFieldEncryptionKey();
  const iv = randomBytes(12);
  const cipher = createCipheriv('aes-256-gcm', key, iv);
  const encrypted = Buffer.concat([cipher.update(JSON.stringify(value), 'utf8'), cipher.final()]);
  const authTag = cipher.getAuthTag();

  return [iv, authTag, encrypted].map((part) => base64UrlEncode(part)).join('.');
}

async function main() {
  if (!process.env.DATABASE_URL) {
    throw new Error('Missing DATABASE_URL. Add it to your environment or .env.local before seeding.');
  }

  const sql = neon(process.env.DATABASE_URL);
  const createdAt = '2026-04-26T11:30:00.000Z';
  const updatedAt = '2026-04-26T11:45:00.000Z';
  const paidAt = '2026-04-26T11:44:12.000Z';
  const orderId = 'sample-order-neon-preview';
  const notificationId = 'sample-order-neon-preview-notification';
  const addressCiphertext = encryptJson({
    fullName: 'Ananya Rao',
    phone: '+91 98765 10001',
    line1: '14 Palace Garden Road',
    line2: 'Near Residency Circle',
    city: 'Bengaluru',
    state: 'Karnataka',
    postalCode: '560001',
    country: 'India',
  });
  const items = [
    {
      productId: 'zaria-bridal-set',
      slug: 'zaria-bridal-set',
      name: 'Zaria Bridal Set',
      category: 'Bridal Sets',
      quantity: 1,
      unitAmount: 189900,
    },
    {
      productId: 'meera-temple-jhumkas',
      slug: 'meera-temple-jhumkas',
      name: 'Meera Temple Jhumkas',
      category: 'Earrings',
      quantity: 1,
      unitAmount: 74900,
    },
  ];
  const amount = items.reduce((total, item) => total + item.quantity * item.unitAmount, 0);

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
      ${orderId},
      ${'order_sample_neon_preview'},
      ${'receipt-sample-neon-preview'},
      ${'sample-user-neon-preview'},
      ${'ananya.rao@example.com'},
      ${'Ananya Rao'},
      ${'+91 98765 10001'},
      ${addressCiphertext},
      ${amount},
      ${'INR'},
      ${'paid'},
      ${'captured'},
      ${'processing'},
      ${JSON.stringify(items)},
      ${'pay_sample_neon_preview'},
      ${null},
      ${'Sample order created for Neon inspection. Safe to delete after review.'},
      ${'TRK-DEMO-001'},
      ${createdAt},
      ${updatedAt},
      ${paidAt},
      ${null}
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
      ${notificationId},
      ${orderId},
      ${'order_update'},
      ${'ananya.rao@example.com'},
      ${'Your Aurum order is being prepared'},
      ${'This is a sample notification record created to preview how order communication history appears in Neon.'},
      ${'sample-admin@aurumcoverings.com'},
      ${updatedAt}
    )
    ON CONFLICT (id) DO UPDATE SET
      recipient_email = EXCLUDED.recipient_email,
      subject = EXCLUDED.subject,
      message = EXCLUDED.message,
      sent_by = EXCLUDED.sent_by,
      created_at = EXCLUDED.created_at
  `;

  const [orderRow] = await sql`
    SELECT
      id,
      razorpay_order_id,
      amount,
      currency,
      status,
      payment_status,
      fulfillment_status,
      jsonb_array_length(items_json) AS item_count,
      shipping_address_ciphertext,
      admin_note
    FROM aurum_orders
    WHERE id = ${orderId}
    LIMIT 1
  `;

  console.log(
    JSON.stringify(
      {
        ok: true,
        orderId,
        table: 'aurum_orders',
        notificationsTable: 'aurum_order_notifications',
        storedRow: orderRow,
      },
      null,
      2,
    ),
  );
}

main().catch((error) => {
  console.error(error instanceof Error ? error.message : String(error));
  process.exitCode = 1;
});
