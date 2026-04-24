export type ProductReview = {
  id: string;
  author: string;
  location: string;
  rating: number;
  title: string;
  body: string;
  date: string;
  verified: boolean;
};

export type Product = {
  id: string;
  slug: string;
  name: string;
  category: string;
  price: number;
  originalPrice?: number;
  rating: number;
  reviewCount: number;
  shortDescription: string;
  description: string;
  image: string;
  imageAlt: string;
  badge?: string;
  featured?: boolean;
  tags: string[];
  features: string[];
  material: string;
  finish: string;
  wearability: string;
  dispatch: string;
  reviews: ProductReview[];
  createdAt?: string;
  updatedAt?: string;
};

export type CartEntry = {
  productId: string;
  quantity: number;
};

export type PaymentCartItem = {
  productId: string;
  slug: string;
  name: string;
  category: string;
  quantity: number;
  unitAmount: number;
};

export type RazorpayPaymentStatus = 'created' | 'authorized' | 'captured' | 'failed';

export type RazorpayOrderRecord = {
  orderId: string;
  receipt: string;
  userId: string;
  email: string;
  amount: number;
  currency: 'INR';
  status: RazorpayPaymentStatus;
  items: PaymentCartItem[];
  paymentId?: string;
  failureReason?: string;
  createdAt: string;
  updatedAt: string;
  expiresAt: number;
};

export type NavigationLink = {
  href: string;
  label: string;
};

export type AuthRole = 'admin' | 'user';

export type AuthSession = {
  role: AuthRole;
  subject: string;
  email: string;
  name?: string;
  expiresAt: number;
};

export type UserAddress = {
  fullName: string;
  phone: string;
  line1: string;
  line2?: string;
  city: string;
  state: string;
  postalCode: string;
  country: string;
};

export type UserRecord = {
  id: string;
  email: string;
  name: string;
  passwordHash: string;
  addressCiphertext?: string;
  createdAt: string;
  updatedAt: string;
};

export type AdminRecord = {
  email: string;
  passwordHash: string;
  createdAt: string;
  updatedAt: string;
};

export type OtpChallengeScope = 'admin-setup' | 'admin-login' | 'user-signup' | 'user-login';

export type OtpChallenge = {
  id: string;
  scope: OtpChallengeScope;
  email: string;
  codeHash: string;
  expiresAt: number;
  attemptsRemaining: number;
  payload: Record<string, string>;
};
