import { env } from '../config/env';

export interface SendEmailOptions {
  to: string;
  subject: string;
  html: string;
}

export async function sendEmail(options: SendEmailOptions): Promise<void> {
  if (!env.EMAIL_API_KEY) {
    if (env.NODE_ENV === 'development' || env.NODE_ENV === 'test') {
      console.info(`[email] To: ${options.to} | Subject: ${options.subject}`);
    }
    return;
  }

  const response = await fetch('https://api.resend.com/emails', {
    method: 'POST',
    headers: {
      Authorization: `Bearer ${env.EMAIL_API_KEY}`,
      'Content-Type': 'application/json',
    },
    body: JSON.stringify({
      from: env.EMAIL_FROM,
      to: options.to,
      subject: options.subject,
      html: options.html,
    }),
  });

  if (!response.ok) {
    const body = await response.text();
    console.error(`[email] Failed to send (${response.status}): ${body}`);
  }
}

export function buildPasswordResetEmail(resetUrl: string): string {
  return `
    <p>You requested a password reset.</p>
    <p><a href="${resetUrl}">Reset your password</a></p>
    <p>This link expires in 1 hour. If you did not request this, you can ignore this email.</p>
  `.trim();
}

export function buildWorkspaceInvitationEmail(workspaceName: string, acceptUrl: string): string {
  return `
    <p>You have been invited to join <strong>${workspaceName}</strong>.</p>
    <p><a href="${acceptUrl}">Accept invitation</a></p>
  `.trim();
}
