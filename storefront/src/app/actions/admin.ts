'use server';

import { revalidatePath, revalidateTag } from 'next/cache';
import { redirect } from 'next/navigation';

import {
  clearPendingAuthCookie,
  clearSessionCookie,
  getCurrentSession,
  getPendingAuthCookie,
  setPendingAuthCookie,
  setSessionCookie,
} from '@/lib/auth';
import { getAdminPortalSlug } from '@/lib/admin';
import {
  adminExists,
  assertOtpChallenge,
  getAdminRecord,
  hashOtpCode,
  isPersistentAuthConfigured,
  saveAdminRecord,
  saveOtpChallenge,
} from '@/lib/auth-store';
import { isEmailConfigured, sendOrderNotificationEmail, sendOtpEmail } from '@/lib/mailer';
import { deriveOrderStatus, getOrderById, saveOrderNotification, updateOrderRecord } from '@/lib/order-store';
import { getPasswordValidationError, hashPassword, verifyPassword } from '@/lib/password';
import { deleteProduct, getAllProducts, getProductBySlug, PRODUCT_DATA_TAG, upsertProduct } from '@/lib/product-store';
import { assertRateLimit } from '@/lib/security';
import type { OrderFulfillmentStatus, OrderNotificationType, Product } from '@/lib/types';
import { createId, createOtpCode, createSlug, normalizeEmail } from '@/lib/utils';

const OTP_TTL_MS = 10 * 60 * 1000;
const AUTH_WINDOW_MS = 15 * 60 * 1000;
type AdminReturnTab = 'orders' | 'add-product' | 'modify-products';

function buildPortalPath(formData: FormData) {
  const requestedPath = String(formData.get('portalPath') ?? '').trim();
  return requestedPath.startsWith('/gateway/') ? requestedPath : `/gateway/${getAdminPortalSlug()}`;
}

function normalizeAdminReturnTab(value: string): AdminReturnTab | null {
  switch (value) {
    case 'orders':
    case 'add-product':
    case 'modify-products':
      return value;
    default:
      return null;
  }
}

function readAdminReturnTab(formData: FormData) {
  return normalizeAdminReturnTab(String(formData.get('returnTab') ?? '').trim());
}

function withMessage(pathname: string, type: 'error' | 'notice', message: string, returnTab?: AdminReturnTab | null) {
  const url = new URL(pathname, 'http://localhost:3000');
  if (returnTab) {
    url.searchParams.set('tab', returnTab);
  }
  url.searchParams.set(type, message);
  return `${url.pathname}${url.search}`;
}

function withPortalParams(pathname: string, params: Record<string, string>, returnTab?: AdminReturnTab | null) {
  const url = new URL(pathname, 'http://localhost:3000');

  if (returnTab) {
    url.searchParams.set('tab', returnTab);
  }

  for (const [key, value] of Object.entries(params)) {
    url.searchParams.set(key, value);
  }

  return `${url.pathname}${url.search}`;
}

function readPendingChallenge(cookieValue: string | null, scope: string) {
  if (!cookieValue) {
    return null;
  }

  const [cookieScope, challengeId] = cookieValue.split(':');
  return cookieScope === scope && challengeId ? challengeId : null;
}

function ensureAuthFoundation(pathname: string) {
  if (!process.env.SESSION_SECRET) {
    redirect(withMessage(pathname, 'error', 'Add SESSION_SECRET before using authentication.'));
  }

  if (!isPersistentAuthConfigured()) {
    redirect(withMessage(pathname, 'error', 'Configure Upstash Redis before using admin authentication.'));
  }
}

function ensureOtpReadiness(pathname: string) {
  ensureAuthFoundation(pathname);

  if (!isEmailConfigured()) {
    redirect(withMessage(pathname, 'error', 'Configure Resend email before using OTP verification.'));
  }
}

function ensureRateLimit(pathname: string, bucket: string, identifier: string, maxRequests: number) {
  try {
    assertRateLimit({
      bucket,
      identifier,
      maxRequests,
      windowMs: AUTH_WINDOW_MS,
    });
  } catch (error) {
    redirect(withMessage(pathname, 'error', error instanceof Error ? error.message : 'Too many requests. Please try again shortly.'));
  }
}

function isSafeProductImagePath(image: string) {
  return image.startsWith('/') && !image.startsWith('//') && !image.includes('..');
}

function normalizeFulfillmentStatus(value: string): OrderFulfillmentStatus | null {
  switch (value) {
    case 'pending':
    case 'processing':
    case 'shipped':
    case 'delivered':
    case 'cancelled':
      return value;
    default:
      return null;
  }
}

function normalizeNotificationType(value: string): OrderNotificationType {
  switch (value) {
    case 'order_update':
    case 'shipping_update':
      return value;
    default:
      return 'custom';
  }
}

function parseProductForm(formData: FormData, existingProduct?: Product | null) {
  const name = String(formData.get('name') ?? '').trim();
  const slugInput = String(formData.get('slug') ?? '').trim();
  const slug = createSlug(slugInput || name);
  const category = String(formData.get('category') ?? '').trim();
  const price = Number(formData.get('price') ?? 0);
  const originalPriceValue = String(formData.get('originalPrice') ?? '').trim();
  const originalPrice = originalPriceValue ? Number(originalPriceValue) : undefined;
  const shortDescription = String(formData.get('shortDescription') ?? '').trim();
  const description = String(formData.get('description') ?? '').trim();
  const image = String(formData.get('image') ?? '').trim();
  const imageAlt = String(formData.get('imageAlt') ?? '').trim();
  const badge = String(formData.get('badge') ?? '').trim();
  const ratingValue = String(formData.get('rating') ?? '').trim();
  const reviewCountValue = String(formData.get('reviewCount') ?? '').trim();
  const featured = String(formData.get('featured') ?? '').trim() === 'on';
  const tags = String(formData.get('tags') ?? '')
    .split(',')
    .map((value) => value.trim())
    .filter(Boolean);
  const features = String(formData.get('features') ?? '')
    .split(/\r?\n/)
    .map((value) => value.trim())
    .filter(Boolean);
  const material = String(formData.get('material') ?? '').trim();
  const finish = String(formData.get('finish') ?? '').trim();
  const wearability = String(formData.get('wearability') ?? '').trim();
  const dispatch = String(formData.get('dispatch') ?? '').trim();
  const rating = ratingValue ? Number(ratingValue) : existingProduct?.rating ?? 0;
  const reviewCount = reviewCountValue ? Number(reviewCountValue) : existingProduct?.reviewCount ?? 0;

  if (!name || !slug || !category || !image || !imageAlt || !shortDescription || !description || !material || !finish || !wearability || !dispatch) {
    throw new Error('Complete every required product field before saving.');
  }

  if (!isSafeProductImagePath(image)) {
    throw new Error('Use a safe public image path such as /products/item.jpg. External URLs are blocked in admin product forms.');
  }

  if (!Number.isFinite(price) || price <= 0) {
    throw new Error('Enter a valid product price.');
  }

  if (originalPrice !== undefined && (!Number.isFinite(originalPrice) || originalPrice <= 0)) {
    throw new Error('Enter a valid original price or leave it empty.');
  }

  if (!Number.isFinite(rating) || rating < 0 || rating > 5) {
    throw new Error('Enter a rating between 0 and 5.');
  }

  if (!Number.isInteger(reviewCount) || reviewCount < 0) {
    throw new Error('Enter a valid whole number for review count.');
  }

  if (features.length === 0) {
    throw new Error('Add at least one product feature.');
  }

  return {
    id: existingProduct?.id ?? createId('prod'),
    slug,
    name,
    category,
    price: Math.round(price),
    originalPrice: originalPrice ? Math.round(originalPrice) : undefined,
    rating: Number(rating.toFixed(1)),
    reviewCount,
    shortDescription,
    description,
    image,
    imageAlt,
    badge: badge || undefined,
    featured,
    tags,
    features,
    material,
    finish,
    wearability,
    dispatch,
    reviews: existingProduct?.reviews ?? [],
    createdAt: existingProduct?.createdAt ?? new Date().toISOString(),
    updatedAt: new Date().toISOString(),
  } satisfies Product;
}

function parseProductFormOrRedirect(
  formData: FormData,
  portalPath: string,
  returnTab?: AdminReturnTab | null,
  existingProduct?: Product | null,
) {
  try {
    return parseProductForm(formData, existingProduct);
  } catch (error) {
    redirect(withMessage(portalPath, 'error', error instanceof Error ? error.message : 'Unable to save the product.', returnTab));
  }
}

async function ensureAdminSession(portalPath: string) {
  ensureAuthFoundation(portalPath);
  const session = await getCurrentSession();

  if (!session || session.role !== 'admin') {
    redirect(withMessage(portalPath, 'error', 'Please sign in as admin to continue.'));
  }

  return session;
}

export async function beginAdminSetup(formData: FormData) {
  const portalPath = buildPortalPath(formData);
  ensureOtpReadiness(portalPath);

  const email = normalizeEmail(String(formData.get('email') ?? ''));
  const password = String(formData.get('password') ?? '');
  const passwordError = getPasswordValidationError(password);

  if (await adminExists()) {
    redirect(withMessage(portalPath, 'error', 'Admin access has already been configured.'));
  }

  if (!email.includes('@')) {
    redirect(withMessage(portalPath, 'error', 'Enter a valid admin email address.'));
  }

  if (passwordError) {
    redirect(withMessage(portalPath, 'error', passwordError));
  }

  ensureRateLimit(portalPath, 'auth:admin-setup', email, 5);

  const code = createOtpCode();
  const challengeId = createId('otp');

  await saveOtpChallenge({
    id: challengeId,
    scope: 'admin-setup',
    email,
    codeHash: hashOtpCode(code),
    expiresAt: Date.now() + OTP_TTL_MS,
    attemptsRemaining: 5,
    payload: {
      passwordHash: hashPassword(password),
    },
  });

  await sendOtpEmail({
    to: email,
    code,
    subject: 'Verify your Aurum admin setup',
    headline: 'Confirm the first admin setup',
    description: 'Enter this OTP to lock in the one and only admin account for Aurum Coverings.',
  });

  await setPendingAuthCookie(`admin-setup:${challengeId}`);
  redirect(
    withPortalParams(portalPath, {
      mode: 'verify-setup',
      email,
      notice: 'We sent an OTP to the admin email.',
    }),
  );
}

export async function completeAdminSetup(formData: FormData) {
  const portalPath = buildPortalPath(formData);
  ensureAuthFoundation(portalPath);

  const otp = String(formData.get('otp') ?? '').trim();
  const challengeId = readPendingChallenge(await getPendingAuthCookie(), 'admin-setup');

  if (!challengeId) {
    redirect(withMessage(portalPath, 'error', 'The admin setup session expired. Start again.'));
  }

  const result = await assertOtpChallenge(challengeId, 'admin-setup', otp);

  if (!result.challenge) {
    redirect(withMessage(withPortalParams(portalPath, { mode: 'verify-setup' }), 'error', result.message ?? 'Invalid OTP.'));
  }

  if (await adminExists()) {
    await clearPendingAuthCookie();
    redirect(withMessage(portalPath, 'error', 'Admin access has already been configured.'));
  }

  const now = new Date().toISOString();
  await saveAdminRecord({
    email: result.challenge.email,
    passwordHash: result.challenge.payload.passwordHash,
    createdAt: now,
    updatedAt: now,
  });

  await clearPendingAuthCookie();
  await setSessionCookie({ role: 'admin', subject: result.challenge.email, email: result.challenge.email });
  redirect(withMessage(portalPath, 'notice', 'Admin access is now configured.'));
}

export async function beginAdminLogin(formData: FormData) {
  const portalPath = buildPortalPath(formData);
  ensureOtpReadiness(portalPath);

  const email = normalizeEmail(String(formData.get('email') ?? ''));
  const password = String(formData.get('password') ?? '');
  const admin = await getAdminRecord();

  if (!admin) {
    redirect(withMessage(portalPath, 'error', 'Admin access has not been configured yet.'));
  }

  ensureRateLimit(portalPath, 'auth:admin-login', email || 'unknown', 7);

  if (normalizeEmail(admin.email) !== email || !verifyPassword(password, admin.passwordHash)) {
    redirect(withMessage(portalPath, 'error', 'Incorrect admin email or password.'));
  }

  const code = createOtpCode();
  const challengeId = createId('otp');

  await saveOtpChallenge({
    id: challengeId,
    scope: 'admin-login',
    email: admin.email,
    codeHash: hashOtpCode(code),
    expiresAt: Date.now() + OTP_TTL_MS,
    attemptsRemaining: 5,
    payload: {},
  });

  await sendOtpEmail({
    to: admin.email,
    code,
    subject: 'Your Aurum admin verification code',
    headline: 'Approve this admin sign-in',
    description: 'Use this OTP to complete the second step before entering the hidden product management portal.',
  });

  await setPendingAuthCookie(`admin-login:${challengeId}`);
  redirect(
    withPortalParams(portalPath, {
      mode: 'verify-login',
      email: admin.email,
      notice: 'We sent an OTP to the admin email.',
    }),
  );
}

export async function completeAdminLogin(formData: FormData) {
  const portalPath = buildPortalPath(formData);
  ensureAuthFoundation(portalPath);

  const otp = String(formData.get('otp') ?? '').trim();
  const challengeId = readPendingChallenge(await getPendingAuthCookie(), 'admin-login');

  if (!challengeId) {
    redirect(withMessage(portalPath, 'error', 'The admin login session expired. Start again.'));
  }

  const result = await assertOtpChallenge(challengeId, 'admin-login', otp);

  if (!result.challenge) {
    redirect(withMessage(withPortalParams(portalPath, { mode: 'verify-login' }), 'error', result.message ?? 'Invalid OTP.'));
  }

  await clearPendingAuthCookie();
  await setSessionCookie({ role: 'admin', subject: result.challenge.email, email: result.challenge.email });
  redirect(withMessage(portalPath, 'notice', 'Admin sign-in successful.'));
}

export async function logoutAdminAction(formData: FormData) {
  const portalPath = buildPortalPath(formData);
  await clearPendingAuthCookie();
  await clearSessionCookie();
  redirect(withMessage(portalPath, 'notice', 'You have been signed out from the admin portal.'));
}

export async function createProductAction(formData: FormData) {
  const portalPath = buildPortalPath(formData);
  const returnTab = readAdminReturnTab(formData);
  ensureAuthFoundation(portalPath);
  await ensureAdminSession(portalPath);

  const product = parseProductFormOrRedirect(formData, portalPath, returnTab);
  const existingProduct = await getProductBySlug(product.slug);

  if (existingProduct) {
    redirect(withMessage(portalPath, 'error', 'That product slug already exists. Use a different slug.', returnTab));
  }

  await upsertProduct(product);
  revalidateTag(PRODUCT_DATA_TAG, 'max');
  revalidatePath('/');
  revalidatePath('/products');
  revalidatePath(`/products/${product.slug}`);
  redirect(withMessage(portalPath, 'notice', 'The new product has been created.', returnTab));
}

export async function updateProductAction(formData: FormData) {
  const portalPath = buildPortalPath(formData);
  const returnTab = readAdminReturnTab(formData);
  ensureAuthFoundation(portalPath);
  await ensureAdminSession(portalPath);

  const productId = String(formData.get('productId') ?? '');
  const products = await getAllProducts();
  const existingProduct = products.find((product) => product.id === productId);

  if (!existingProduct) {
    redirect(withMessage(portalPath, 'error', 'The selected product could not be found.', returnTab));
  }

  const nextProduct = parseProductFormOrRedirect(formData, portalPath, returnTab, existingProduct);
  const productWithSameSlug = await getProductBySlug(nextProduct.slug);

  if (productWithSameSlug && productWithSameSlug.id !== nextProduct.id) {
    redirect(withMessage(portalPath, 'error', 'That slug already belongs to another product.', returnTab));
  }

  await upsertProduct(nextProduct, existingProduct.slug);
  revalidateTag(PRODUCT_DATA_TAG, 'max');
  revalidatePath('/');
  revalidatePath('/products');
  revalidatePath(`/products/${existingProduct.slug}`);
  revalidatePath(`/products/${nextProduct.slug}`);
  redirect(withMessage(portalPath, 'notice', `Updated ${nextProduct.name}.`, returnTab));
}

export async function deleteProductAction(formData: FormData) {
  const portalPath = buildPortalPath(formData);
  const returnTab = readAdminReturnTab(formData);
  ensureAuthFoundation(portalPath);
  await ensureAdminSession(portalPath);

  const productId = String(formData.get('productId') ?? '').trim();

  if (!productId) {
    redirect(withMessage(portalPath, 'error', 'Choose a valid product to remove.', returnTab));
  }

  const products = await getAllProducts();
  const existingProduct = products.find((product) => product.id === productId);

  if (!existingProduct) {
    redirect(withMessage(portalPath, 'error', 'The selected product could not be found.', returnTab));
  }

  await deleteProduct(existingProduct);
  revalidateTag(PRODUCT_DATA_TAG, 'max');
  revalidatePath('/');
  revalidatePath('/products');
  revalidatePath(`/products/${existingProduct.slug}`);
  redirect(withMessage(portalPath, 'notice', `Removed ${existingProduct.name} from the catalog.`, returnTab));
}

export async function updateOrderAction(formData: FormData) {
  const portalPath = buildPortalPath(formData);
  const returnTab = readAdminReturnTab(formData);
  ensureAuthFoundation(portalPath);
  await ensureAdminSession(portalPath);

  const orderId = String(formData.get('orderId') ?? '').trim();
  const fulfillmentStatus = normalizeFulfillmentStatus(String(formData.get('fulfillmentStatus') ?? '').trim());
  const trackingNumber = String(formData.get('trackingNumber') ?? '').trim();
  const adminNote = String(formData.get('adminNote') ?? '').trim();

  if (!orderId || !fulfillmentStatus) {
    redirect(withMessage(portalPath, 'error', 'Choose a valid order and fulfillment status.', returnTab));
  }

  const order = await getOrderById(orderId);

  if (!order) {
    redirect(withMessage(portalPath, 'error', 'The selected order could not be found.', returnTab));
  }

  const updatedAt = new Date().toISOString();
  await updateOrderRecord({
    ...order,
    fulfillmentStatus,
    status: deriveOrderStatus({
      paymentStatus: order.paymentStatus,
      fulfillmentStatus,
      failureReason: order.failureReason,
    }),
    trackingNumber: trackingNumber || undefined,
    adminNote: adminNote || undefined,
    updatedAt,
    cancelledAt: fulfillmentStatus === 'cancelled' ? order.cancelledAt ?? updatedAt : undefined,
  });

  revalidatePath(portalPath);
  redirect(withMessage(portalPath, 'notice', `Updated order ${order.id}.`, returnTab));
}

export async function sendOrderNotificationAction(formData: FormData) {
  const portalPath = buildPortalPath(formData);
  const returnTab = readAdminReturnTab(formData);
  ensureOtpReadiness(portalPath);
  const session = await ensureAdminSession(portalPath);

  const orderId = String(formData.get('orderId') ?? '').trim();
  const subject = String(formData.get('subject') ?? '').trim();
  const message = String(formData.get('message') ?? '').trim();
  const type = normalizeNotificationType(String(formData.get('type') ?? '').trim());

  if (!orderId || !subject || !message) {
    redirect(withMessage(portalPath, 'error', 'Complete the customer notification subject and message.', returnTab));
  }

  const order = await getOrderById(orderId);

  if (!order) {
    redirect(withMessage(portalPath, 'error', 'The selected order could not be found.', returnTab));
  }

  await sendOrderNotificationEmail({
    to: order.email,
    customerName: order.customerName,
    subject,
    message,
    orderReference: order.id,
  });

  await saveOrderNotification({
    id: createId('notify'),
    orderId: order.id,
    type,
    to: order.email,
    subject,
    message,
    sentBy: session.email,
    createdAt: new Date().toISOString(),
  });

  revalidatePath(portalPath);
  redirect(withMessage(portalPath, 'notice', `Sent an order notification to ${order.email}.`, returnTab));
}
