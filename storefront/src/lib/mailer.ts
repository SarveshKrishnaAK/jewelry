import { Resend } from 'resend';

let resendClient: Resend | undefined;

function escapeHtml(value: string) {
  return value
    .replaceAll('&', '&amp;')
    .replaceAll('<', '&lt;')
    .replaceAll('>', '&gt;')
    .replaceAll('"', '&quot;')
    .replaceAll("'", '&#39;');
}

export function isEmailConfigured() {
  return Boolean(process.env.RESEND_API_KEY && process.env.RESEND_FROM_EMAIL);
}

function getResend() {
  if (!isEmailConfigured()) {
    throw new Error('Missing email configuration. Add RESEND_API_KEY and RESEND_FROM_EMAIL.');
  }

  if (!resendClient) {
    resendClient = new Resend(process.env.RESEND_API_KEY);
  }

  return resendClient;
}

export async function sendEmail({
  to,
  subject,
  html,
}: {
  to: string;
  subject: string;
  html: string;
}) {
  const resend = getResend();

  await resend.emails.send({
    from: process.env.RESEND_FROM_EMAIL!,
    to,
    subject,
    html,
  });
}

export async function sendOtpEmail({
  to,
  code,
  subject,
  headline,
  description,
}: {
  to: string;
  code: string;
  subject: string;
  headline: string;
  description: string;
}) {
  await sendEmail({
    to,
    subject,
    html: `
      <div style="font-family: Arial, sans-serif; max-width: 560px; margin: 0 auto; padding: 24px; color: #1f1a15;">
        <p style="font-size: 12px; letter-spacing: 0.28em; text-transform: uppercase; color: #8a6c49;">Aurum Coverings Security</p>
        <h1 style="font-size: 28px; margin: 12px 0 8px;">${escapeHtml(headline)}</h1>
        <p style="font-size: 15px; line-height: 1.7; color: #5f5246;">${escapeHtml(description)}</p>
        <div style="margin: 28px 0; padding: 18px 22px; border-radius: 18px; background: #f7ecdc; font-size: 32px; font-weight: 700; letter-spacing: 0.32em; text-align: center;">${escapeHtml(code)}</div>
        <p style="font-size: 13px; line-height: 1.7; color: #7d6d5e;">This one-time code expires in 10 minutes. If you did not request this, you can ignore the email.</p>
      </div>
    `,
  });
}

export async function sendOrderNotificationEmail({
  to,
  customerName,
  subject,
  message,
  orderReference,
}: {
  to: string;
  customerName: string;
  subject: string;
  message: string;
  orderReference: string;
}) {
  const greeting = customerName.trim() ? `Hello ${customerName},` : 'Hello,';

  await sendEmail({
    to,
    subject,
    html: `
      <div style="font-family: Arial, sans-serif; max-width: 560px; margin: 0 auto; padding: 24px; color: #1f1a15;">
        <p style="font-size: 12px; letter-spacing: 0.28em; text-transform: uppercase; color: #8a6c49;">Aurum Coverings Orders</p>
        <h1 style="font-size: 28px; margin: 12px 0 8px;">${escapeHtml(subject)}</h1>
        <p style="font-size: 15px; line-height: 1.7; color: #5f5246;">${escapeHtml(greeting)}</p>
        <p style="font-size: 15px; line-height: 1.8; color: #5f5246; white-space: pre-line;">${escapeHtml(message)}</p>
        <div style="margin: 24px 0; padding: 16px 18px; border-radius: 18px; background: #f7ecdc;">
          <p style="margin: 0; font-size: 12px; letter-spacing: 0.18em; text-transform: uppercase; color: #8a6c49;">Order reference</p>
          <p style="margin: 8px 0 0; font-size: 18px; font-weight: 700; color: #1f1a15;">${escapeHtml(orderReference)}</p>
        </div>
        <p style="font-size: 13px; line-height: 1.7; color: #7d6d5e;">If you have any questions, reply to this email or reach out through the support details on the storefront.</p>
      </div>
    `,
  });
}
