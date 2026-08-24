/**
 * Email Service — powered by Resend
 * Sends verification emails, password reset links, and notifications.
 */
import { Resend } from 'resend';
import env from '../config/env.js';
import logger from '../utils/logger.js';

let resend = null;

const getResend = () => {
  if (!resend && env.RESEND_API_KEY && env.RESEND_API_KEY !== 'your-resend-api-key-change-this') {
    resend = new Resend(env.RESEND_API_KEY);
  }
  return resend;
};

export const sendVerificationEmail = async (to, token, frontendUrl) => {
  const resend = getResend();
  if (!resend) {
    logger.warn('Resend not configured — skipping verification email', { to });
    return { skipped: true };
  }

  const verifyUrl = `${frontendUrl}/verify-email?token=${token}`;

  try {
    const { data, error } = await resend.emails.send({
      from: env.RESEND_FROM_EMAIL,
      to,
      subject: 'Verify your Playwright Dashboard email address',
      html: `
<!DOCTYPE html>
<html>
  <head><meta charset="utf-8"><title>Email Verification</title></head>
  <body style="margin:0;padding:0;background:#08080a;font-family:Inter,sans-serif;">
    <table width="100%" cellpadding="0" cellspacing="0" style="background:#08080a;padding:40px 20px;">
      <tr>
        <td align="center">
          <table width="600" cellpadding="0" cellspacing="0" style="background:#0e0e13;border:1px solid #20202a;border-radius:12px;">
            <tr>
              <td style="padding:48px 40px;text-align:center;">
                <div style="width:56px;height:56px;border-radius:12px;background:rgba(59,130,246,0.12);border:1px solid rgba(59,130,246,0.3);display:flex;align-items:center;justify-content:center;margin:0 auto 24px;">
                  <svg width="24" height="24" viewBox="0 0 24 24" fill="none" xmlns="http://www.w3.org/2000/svg">
                    <path d="M12 22C17.5228 22 22 17.5228 22 12C22 6.4772 17.5228 2 12 2C6.4772 2 2 6.4772 2 12C2 17.5228 6.4772 22 12 22Z" stroke="#3B82F6" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"/>
                    <path d="M9 12L11 14L15 10M12 22C17.5228 22 22 17.5228 22 12C22 6.4772 17.5228 2 12 2C6.4772 2 2 6.4772 2 12C2 17.5228 6.4772 22 12 22Z" stroke="#3B82F6" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"/>
                  </svg>
                </div>
                <h1 style="color:#f4f4f7;font-size:24px;font-weight:700;margin-bottom:16px;">Verify your email address</h1>
                <p style="color:#9a9aa5;font-size:14px;line-height:1.6;margin-bottom:24px;">
                  Thanks for signing up to Playwright Dashboard. Please click the button below
                  to verify your email address and start managing your test results.
                </p>
                <a href="${verifyUrl}" style="display:inline-block;background:linear-gradient(135deg,#93c5fd,#3b82f6);border:none;color:#08080a;font-size:14px;font-weight:600;padding:12px 32px;border-radius:8px;text-decoration:none;">Verify email address</a>
                <p style="color:#5e5e68;font-size:12px;line-height:1.6;margin-top:24px;">
                  This link will expire in 24 hours. If you didn't sign up, you can safely ignore this email.
                </p>
              </td>
            </tr>
          </table>
        </td>
      </tr>
    </table>
  </body>
</html>
`,
    });

    if (error) {
      logger.error('Failed to send verification email', { to, error });
      return { error };
    }

    logger.info('Verification email sent', { to, messageId: data?.id });
    return { success: true, messageId: data?.id };
  } catch (err) {
    logger.error('Resend exception', { to, error: err.message });
    return { error: err.message };
  }
};

export const sendPasswordResetEmail = async (to, token, frontendUrl) => {
  const resend = getResend();
  if (!resend) {
    logger.warn('Resend not configured — skipping password reset email', { to });
    return { skipped: true };
  }

  const resetUrl = `${frontendUrl}/reset-password?token=${token}`;

  try {
    const { data, error } = await resend.emails.send({
      from: env.RESEND_FROM_EMAIL,
      to,
      subject: 'Reset your Playwright Dashboard password',
      html: `
<!DOCTYPE html>
<html>
  <head><meta charset="utf-8"><title>Password Reset</title></head>
  <body style="margin:0;padding:0;background:#08080a;font-family:Inter,sans-serif;">
    <table width="100%" cellpadding="0" cellspacing="0" style="background:#08080a;padding:40px 20px;">
      <tr>
        <td align="center">
          <table width="600" cellpadding="0" cellspacing="0" style="background:#0e0e13;border:1px solid #20202a;border-radius:12px;">
            <tr>
              <td style="padding:48px 40px;text-align:center;">
                <div style="width:56px;height:56px;border-radius:12px;background:rgba(59,130,246,0.12);border:1px solid rgba(59,130,246,0.3);display:flex;align-items:center;justify-content:center;margin:0 auto 24px;">
                  <svg width="24" height="24" viewBox="0 0 24 24" fill="none" xmlns="http://www.w3.org/2000/svg">
                    <path d="M12 22C17.5228 22 22 17.5228 22 12C22 6.4772 17.5228 2 12 2C6.4772 2 2 6.4772 2 12C2 17.5228 6.4772 22 12 22Z" stroke="#3B82F6" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"/>
                    <path d="M12 16V12M12 8H12.01" stroke="#3B82F6" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"/>
                  </svg>
                </div>
                <h1 style="color:#f4f4f7;font-size:24px;font-weight:700;margin-bottom:16px;">Reset your password</h1>
                <p style="color:#9a9aa5;font-size:14px;line-height:1.6;margin-bottom:24px;">
                  You requested a password reset for your Playwright Dashboard account.
                  Click the button below to set a new password.
                </p>
                <a href="${resetUrl}" style="display:inline-block;background:linear-gradient(135deg,#93c5fd,#3b82f6);border:none;color:#08080a;font-size:14px;font-weight:600;padding:12px 32px;border-radius:8px;text-decoration:none;">Reset password</a>
                <p style="color:#5e5e68;font-size:12px;line-height:1.6;margin-top:24px;">
                  This link will expire in 1 hour. If you didn't request this, you can safely ignore this email.
                </p>
              </td>
            </tr>
          </table>
        </td>
      </tr>
    </table>
  </body>
</html>
`,
    });

    if (error) {
      logger.error('Failed to send password reset email', { to, error });
      return { error };
    }

    logger.info('Password reset email sent', { to, messageId: data?.id });
    return { success: true, messageId: data?.id };
  } catch (err) {
    logger.error('Resend exception', { to, error: err.message });
    return { error: err.message };
  }
};

export default { sendVerificationEmail, sendPasswordResetEmail, getResend };
