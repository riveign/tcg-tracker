import { Resend } from 'resend';

const RESEND_API_KEY = process.env.RESEND_API_KEY || '';
const RESEND_FROM_EMAIL = process.env.RESEND_FROM_EMAIL || 'onboarding@resend.dev';
const FRONTEND_URL = process.env.FRONTEND_URL || 'http://localhost:5173';

const resend = new Resend(RESEND_API_KEY);

interface SendPasswordResetEmailParams {
  email: string;
  token: string;
  username: string;
}

/**
 * Send a password reset email to the user
 */
export async function sendPasswordResetEmail({
  email,
  token,
  username,
}: SendPasswordResetEmailParams): Promise<void> {
  const resetLink = `${FRONTEND_URL}/reset-password?token=${token}`;

  const htmlContent = `
<!DOCTYPE html>
<html>
<head>
  <meta charset="utf-8">
  <meta name="viewport" content="width=device-width, initial-scale=1.0">
  <title>Password Reset Request</title>
</head>
<body style="margin: 0; padding: 0; font-family: -apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto, 'Helvetica Neue', Arial, sans-serif; background-color: #f5f5f5;">
  <table role="presentation" style="width: 100%; border-collapse: collapse;">
    <tr>
      <td align="center" style="padding: 40px 0;">
        <table role="presentation" style="width: 600px; border-collapse: collapse; background-color: #ffffff; border-radius: 8px; box-shadow: 0 2px 8px rgba(0,0,0,0.1);">
          <!-- Header -->
          <tr>
            <td style="padding: 40px 40px 20px 40px; text-align: center;">
              <h1 style="margin: 0; font-size: 28px; font-weight: 600; color: #1a1a1a;">Password Reset Request</h1>
            </td>
          </tr>

          <!-- Content -->
          <tr>
            <td style="padding: 20px 40px;">
              <p style="margin: 0 0 16px 0; font-size: 16px; line-height: 24px; color: #4a4a4a;">
                Hi ${username},
              </p>
              <p style="margin: 0 0 16px 0; font-size: 16px; line-height: 24px; color: #4a4a4a;">
                We received a request to reset the password for your TCG Tracker account. Click the button below to create a new password:
              </p>

              <!-- CTA Button -->
              <table role="presentation" style="width: 100%; margin: 32px 0;">
                <tr>
                  <td align="center">
                    <a href="${resetLink}" style="display: inline-block; padding: 14px 32px; background-color: #2563eb; color: #ffffff; text-decoration: none; border-radius: 6px; font-weight: 600; font-size: 16px;">Reset Password</a>
                  </td>
                </tr>
              </table>

              <p style="margin: 24px 0 16px 0; font-size: 14px; line-height: 20px; color: #6b6b6b;">
                Or copy and paste this link into your browser:
              </p>
              <p style="margin: 0 0 24px 0; font-size: 14px; line-height: 20px; color: #2563eb; word-break: break-all;">
                ${resetLink}
              </p>

              <!-- Security Notice -->
              <div style="margin: 32px 0; padding: 16px; background-color: #fef3c7; border-left: 4px solid #f59e0b; border-radius: 4px;">
                <p style="margin: 0 0 8px 0; font-size: 14px; font-weight: 600; color: #92400e;">
                  Security Information:
                </p>
                <ul style="margin: 0; padding-left: 20px; font-size: 14px; color: #92400e;">
                  <li style="margin-bottom: 4px;">This link will expire in <strong>1 hour</strong></li>
                  <li style="margin-bottom: 4px;">It can only be used once</li>
                  <li>If you didn't request this, you can safely ignore this email</li>
                </ul>
              </div>

              <p style="margin: 24px 0 0 0; font-size: 14px; line-height: 20px; color: #6b6b6b;">
                If you didn't request a password reset, please ignore this email. Your password will not be changed.
              </p>
            </td>
          </tr>

          <!-- Footer -->
          <tr>
            <td style="padding: 40px; text-align: center; border-top: 1px solid #e5e5e5;">
              <p style="margin: 0; font-size: 12px; color: #9b9b9b;">
                This is an automated email from TCG Tracker. Please do not reply to this email.
              </p>
            </td>
          </tr>
        </table>
      </td>
    </tr>
  </table>
</body>
</html>
  `.trim();

  try {
    await resend.emails.send({
      from: RESEND_FROM_EMAIL,
      to: email,
      subject: 'Reset Your TCG Tracker Password',
      html: htmlContent,
    });
  } catch (error) {
    console.error('Failed to send password reset email:', error);
    throw new Error('Failed to send password reset email');
  }
}
