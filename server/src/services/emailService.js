const nodemailer = require('nodemailer');

const transporter = nodemailer.createTransport({
    host: process.env.SMTP_SERVICE,
    port: parseInt(process.env.SMTP_PORT),
    secure: process.env.SMTP_SECURE === 'true', // false = STARTTLS (port 587), true = SSL/TLS (port 465)
    auth: {
        user: process.env.SMTP_MAIL,
        pass: process.env.SMTP_PASSWORD,
    },
});

const sendOtpEmail = async (to, otp, purpose) => {
    const isSignup = purpose === 'signup';
    const subject = isSignup ? 'Verify your Mini CRM account' : 'Your Mini CRM login OTP';

    const html = `
<!DOCTYPE html>
<html>
<head><meta charset="utf-8"></head>
<body style="margin:0;padding:0;background:#f3f4f6;font-family:Arial,sans-serif;">
  <table width="100%" cellpadding="0" cellspacing="0" style="padding:40px 16px;">
    <tr><td align="center">
      <table width="480" cellpadding="0" cellspacing="0" style="background:#fff;border-radius:12px;border:1px solid #e5e7eb;overflow:hidden;">

        <!-- Header -->
        <tr>
          <td style="background:linear-gradient(135deg,#6366f1,#8b5cf6);padding:28px;text-align:center;">
            <div style="width:48px;height:48px;border-radius:12px;background:rgba(255,255,255,0.2);display:inline-flex;align-items:center;justify-content:center;font-size:22px;font-weight:800;color:#fff;margin-bottom:12px;">C</div>
            <h1 style="margin:0;color:#fff;font-size:1.3rem;font-weight:700;">Mini CRM</h1>
            <p style="margin:6px 0 0;color:rgba(255,255,255,0.8);font-size:0.85rem;">
              ${isSignup ? 'Account Verification' : 'Login Verification'}
            </p>
          </td>
        </tr>

        <!-- Body -->
        <tr>
          <td style="padding:36px 32px;">
            <p style="margin:0 0 8px;color:#374151;font-size:0.95rem;line-height:1.6;">
              ${isSignup
                ? 'Thanks for signing up! Use the code below to verify your email address and activate your account.'
                : 'Someone (hopefully you) is trying to sign in to Mini CRM. Use the code below to complete your login.'}
            </p>

            <!-- OTP Box -->
            <div style="margin:28px 0;text-align:center;">
              <div style="display:inline-block;background:#f5f3ff;border:2px solid #e0e7ff;border-radius:12px;padding:20px 36px;">
                <span style="font-size:2.4rem;font-weight:800;letter-spacing:10px;color:#6366f1;">${otp}</span>
              </div>
            </div>

            <div style="background:#fef3c7;border-radius:8px;padding:12px 16px;margin-bottom:20px;">
              <p style="margin:0;color:#92400e;font-size:0.82rem;">
                ⏱ This code expires in <strong>10 minutes</strong>. Do not share it with anyone.
              </p>
            </div>

            <p style="margin:0;color:#9ca3af;font-size:0.8rem;line-height:1.5;">
              If you didn't request this code, you can safely ignore this email.
              Your account remains secure.
            </p>
          </td>
        </tr>

        <!-- Footer -->
        <tr>
          <td style="background:#f9fafb;border-top:1px solid #e5e7eb;padding:16px 32px;text-align:center;">
            <p style="margin:0;color:#9ca3af;font-size:0.75rem;">
              &copy; 2026 Mini CRM. All rights reserved.
            </p>
          </td>
        </tr>

      </table>
    </td></tr>
  </table>
</body>
</html>
    `;

    await transporter.sendMail({
        from: `"Mini CRM" <${process.env.SMTP_FROM || process.env.SMTP_MAIL}>`,
        to,
        subject,
        html,
    });
};

const sendPasswordResetEmail = async (to, resetLink) => {
    const html = `
<!DOCTYPE html>
<html>
<head><meta charset="utf-8"></head>
<body style="margin:0;padding:0;background:#f3f4f6;font-family:Arial,sans-serif;">
  <table width="100%" cellpadding="0" cellspacing="0" style="padding:40px 16px;">
    <tr><td align="center">
      <table width="480" cellpadding="0" cellspacing="0" style="background:#fff;border-radius:12px;border:1px solid #e5e7eb;overflow:hidden;">

        <!-- Header -->
        <tr>
          <td style="background:linear-gradient(135deg,#6366f1,#8b5cf6);padding:28px;text-align:center;">
            <div style="width:48px;height:48px;border-radius:12px;background:rgba(255,255,255,0.2);display:inline-flex;align-items:center;justify-content:center;font-size:22px;font-weight:800;color:#fff;margin-bottom:12px;">C</div>
            <h1 style="margin:0;color:#fff;font-size:1.3rem;font-weight:700;">Mini CRM</h1>
            <p style="margin:6px 0 0;color:rgba(255,255,255,0.8);font-size:0.85rem;">Password Reset Request</p>
          </td>
        </tr>

        <!-- Body -->
        <tr>
          <td style="padding:36px 32px;">
            <p style="margin:0 0 20px;color:#374151;font-size:0.95rem;line-height:1.6;">
              We received a request to reset your Mini CRM password. Click the button below to choose a new password.
            </p>

            <div style="text-align:center;margin:28px 0;">
              <a href="${resetLink}" style="display:inline-block;background:linear-gradient(135deg,#6366f1,#8b5cf6);color:#fff;text-decoration:none;padding:14px 36px;border-radius:10px;font-size:0.95rem;font-weight:700;">
                Reset My Password
              </a>
            </div>

            <div style="background:#fef3c7;border-radius:8px;padding:12px 16px;margin-bottom:20px;">
              <p style="margin:0;color:#92400e;font-size:0.82rem;">
                ⏱ This link expires in <strong>1 hour</strong>. Do not share it with anyone.
              </p>
            </div>

            <p style="margin:0 0 8px;color:#6b7280;font-size:0.82rem;">If the button doesn't work, copy this link:</p>
            <p style="margin:0;word-break:break-all;color:#6366f1;font-size:0.78rem;">${resetLink}</p>

            <p style="margin:20px 0 0;color:#9ca3af;font-size:0.8rem;line-height:1.5;">
              If you didn't request this, you can safely ignore this email.
            </p>
          </td>
        </tr>

        <!-- Footer -->
        <tr>
          <td style="background:#f9fafb;border-top:1px solid #e5e7eb;padding:16px 32px;text-align:center;">
            <p style="margin:0;color:#9ca3af;font-size:0.75rem;">&copy; 2026 Mini CRM. All rights reserved.</p>
          </td>
        </tr>

      </table>
    </td></tr>
  </table>
</body>
</html>
    `;

    await transporter.sendMail({
        from: `"Mini CRM" <${process.env.SMTP_FROM || process.env.SMTP_MAIL}>`,
        to,
        subject: 'Reset your Mini CRM password',
        html,
    });
};

// Sent to a brand-new user who was invited to a workspace
const sendInvitationEmail = async (to, { inviterName, workspaceName, role, setPasswordLink }) => {
    const html = `
<!DOCTYPE html>
<html>
<head><meta charset="utf-8"></head>
<body style="margin:0;padding:0;background:#f3f4f6;font-family:Arial,sans-serif;">
  <table width="100%" cellpadding="0" cellspacing="0" style="padding:40px 16px;">
    <tr><td align="center">
      <table width="480" cellpadding="0" cellspacing="0" style="background:#fff;border-radius:12px;border:1px solid #e5e7eb;overflow:hidden;">

        <!-- Header -->
        <tr>
          <td style="background:linear-gradient(135deg,#6366f1,#8b5cf6);padding:28px;text-align:center;">
            <div style="width:48px;height:48px;border-radius:12px;background:rgba(255,255,255,0.2);display:inline-flex;align-items:center;justify-content:center;font-size:22px;font-weight:800;color:#fff;margin-bottom:12px;">C</div>
            <h1 style="margin:0;color:#fff;font-size:1.3rem;font-weight:700;">Mini CRM</h1>
            <p style="margin:6px 0 0;color:rgba(255,255,255,0.8);font-size:0.85rem;">You've been invited!</p>
          </td>
        </tr>

        <!-- Body -->
        <tr>
          <td style="padding:36px 32px;">
            <p style="margin:0 0 16px;color:#374151;font-size:0.95rem;line-height:1.6;">
              <strong>${inviterName}</strong> has invited you to join the
              <strong>${workspaceName}</strong> workspace on <strong>Mini CRM</strong>
              as a <strong style="text-transform:capitalize;">${role}</strong>.
            </p>
            <p style="margin:0 0 24px;color:#6b7280;font-size:0.88rem;line-height:1.6;">
              Mini CRM is a lead management platform for sales teams. To get started,
              set a password for your new account by clicking the button below.
            </p>

            <div style="text-align:center;margin:28px 0;">
              <a href="${setPasswordLink}" style="display:inline-block;background:linear-gradient(135deg,#6366f1,#8b5cf6);color:#fff;text-decoration:none;padding:14px 36px;border-radius:10px;font-size:0.95rem;font-weight:700;">
                Set Password &amp; Join Workspace
              </a>
            </div>

            <div style="background:#fef3c7;border-radius:8px;padding:12px 16px;margin-bottom:20px;">
              <p style="margin:0;color:#92400e;font-size:0.82rem;">
                ⏱ This link expires in <strong>1 hour</strong>. Do not share it with anyone.
              </p>
            </div>

            <p style="margin:0 0 8px;color:#6b7280;font-size:0.82rem;">If the button doesn't work, copy this link:</p>
            <p style="margin:0;word-break:break-all;color:#6366f1;font-size:0.78rem;">${setPasswordLink}</p>

            <p style="margin:20px 0 0;color:#9ca3af;font-size:0.8rem;line-height:1.5;">
              If you weren't expecting this invitation, you can safely ignore this email.
            </p>
          </td>
        </tr>

        <!-- Footer -->
        <tr>
          <td style="background:#f9fafb;border-top:1px solid #e5e7eb;padding:16px 32px;text-align:center;">
            <p style="margin:0;color:#9ca3af;font-size:0.75rem;">&copy; 2026 Mini CRM. All rights reserved.</p>
          </td>
        </tr>

      </table>
    </td></tr>
  </table>
</body>
</html>
    `;

    await transporter.sendMail({
        from: `"Mini CRM" <${process.env.SMTP_FROM || process.env.SMTP_MAIL}>`,
        to,
        subject: `You've been invited to join ${workspaceName} on Mini CRM`,
        html,
    });
};

// Sent to an existing user who was added to a new workspace
const sendWorkspaceAddedEmail = async (to, { inviterName, workspaceName, role, loginLink }) => {
    const html = `
<!DOCTYPE html>
<html>
<head><meta charset="utf-8"></head>
<body style="margin:0;padding:0;background:#f3f4f6;font-family:Arial,sans-serif;">
  <table width="100%" cellpadding="0" cellspacing="0" style="padding:40px 16px;">
    <tr><td align="center">
      <table width="480" cellpadding="0" cellspacing="0" style="background:#fff;border-radius:12px;border:1px solid #e5e7eb;overflow:hidden;">

        <!-- Header -->
        <tr>
          <td style="background:linear-gradient(135deg,#6366f1,#8b5cf6);padding:28px;text-align:center;">
            <div style="width:48px;height:48px;border-radius:12px;background:rgba(255,255,255,0.2);display:inline-flex;align-items:center;justify-content:center;font-size:22px;font-weight:800;color:#fff;margin-bottom:12px;">C</div>
            <h1 style="margin:0;color:#fff;font-size:1.3rem;font-weight:700;">Mini CRM</h1>
            <p style="margin:6px 0 0;color:rgba(255,255,255,0.8);font-size:0.85rem;">New Workspace Access</p>
          </td>
        </tr>

        <!-- Body -->
        <tr>
          <td style="padding:36px 32px;">
            <p style="margin:0 0 16px;color:#374151;font-size:0.95rem;line-height:1.6;">
              <strong>${inviterName}</strong> has added you to the
              <strong>${workspaceName}</strong> workspace on <strong>Mini CRM</strong>
              as a <strong style="text-transform:capitalize;">${role}</strong>.
            </p>
            <p style="margin:0 0 24px;color:#6b7280;font-size:0.88rem;line-height:1.6;">
              Log in to your account and switch to the <strong>${workspaceName}</strong> workspace to get started.
            </p>

            <div style="text-align:center;margin:28px 0;">
              <a href="${loginLink}" style="display:inline-block;background:linear-gradient(135deg,#6366f1,#8b5cf6);color:#fff;text-decoration:none;padding:14px 36px;border-radius:10px;font-size:0.95rem;font-weight:700;">
                Go to Mini CRM
              </a>
            </div>

            <p style="margin:20px 0 0;color:#9ca3af;font-size:0.8rem;line-height:1.5;">
              If you weren't expecting this, please contact your workspace administrator.
            </p>
          </td>
        </tr>

        <!-- Footer -->
        <tr>
          <td style="background:#f9fafb;border-top:1px solid #e5e7eb;padding:16px 32px;text-align:center;">
            <p style="margin:0;color:#9ca3af;font-size:0.75rem;">&copy; 2026 Mini CRM. All rights reserved.</p>
          </td>
        </tr>

      </table>
    </td></tr>
  </table>
</body>
</html>
    `;

    await transporter.sendMail({
        from: `"Mini CRM" <${process.env.SMTP_FROM || process.env.SMTP_MAIL}>`,
        to,
        subject: `You've been added to ${workspaceName} on Mini CRM`,
        html,
    });
};

// Sent to the current owner when they initiate an ownership transfer
const sendOwnershipTransferOtpEmail = async (to, { workspaceName, newOwnerName, otp }) => {
    const html = `
<!DOCTYPE html>
<html>
<head><meta charset="utf-8"></head>
<body style="margin:0;padding:0;background:#f3f4f6;font-family:Arial,sans-serif;">
  <table width="100%" cellpadding="0" cellspacing="0" style="padding:40px 16px;">
    <tr><td align="center">
      <table width="480" cellpadding="0" cellspacing="0" style="background:#fff;border-radius:12px;border:1px solid #e5e7eb;overflow:hidden;">

        <!-- Header -->
        <tr>
          <td style="background:linear-gradient(135deg,#6366f1,#8b5cf6);padding:28px;text-align:center;">
            <div style="width:48px;height:48px;border-radius:12px;background:rgba(255,255,255,0.2);display:inline-flex;align-items:center;justify-content:center;font-size:22px;font-weight:800;color:#fff;margin-bottom:12px;">C</div>
            <h1 style="margin:0;color:#fff;font-size:1.3rem;font-weight:700;">Mini CRM</h1>
            <p style="margin:6px 0 0;color:rgba(255,255,255,0.8);font-size:0.85rem;">Ownership Transfer Request</p>
          </td>
        </tr>

        <!-- Body -->
        <tr>
          <td style="padding:36px 32px;">
            <p style="margin:0 0 16px;color:#374151;font-size:0.95rem;line-height:1.6;">
              You requested to transfer ownership of the <strong>${workspaceName}</strong> workspace to <strong>${newOwnerName}</strong>.
            </p>
            <p style="margin:0 0 20px;color:#6b7280;font-size:0.88rem;line-height:1.6;">
              Use the verification code below to confirm this action. This cannot be undone once confirmed.
            </p>

            <!-- OTP Box -->
            <div style="margin:28px 0;text-align:center;">
              <div style="display:inline-block;background:#f5f3ff;border:2px solid #e0e7ff;border-radius:12px;padding:20px 36px;">
                <span style="font-size:2.4rem;font-weight:800;letter-spacing:10px;color:#6366f1;">${otp}</span>
              </div>
            </div>

            <div style="background:#fef3c7;border-radius:8px;padding:12px 16px;margin-bottom:20px;">
              <p style="margin:0;color:#92400e;font-size:0.82rem;">
                ⏱ This code expires in <strong>10 minutes</strong>. Do not share it with anyone.
              </p>
            </div>

            <div style="background:#fee2e2;border-radius:8px;padding:12px 16px;margin-bottom:20px;">
              <p style="margin:0;color:#991b1b;font-size:0.82rem;">
                ⚠️ <strong>Warning:</strong> Transferring ownership will permanently give <strong>${newOwnerName}</strong> full control of this workspace. You will remain as an Admin.
              </p>
            </div>

            <p style="margin:0;color:#9ca3af;font-size:0.8rem;line-height:1.5;">
              If you didn't request this transfer, please secure your account immediately.
            </p>
          </td>
        </tr>

        <!-- Footer -->
        <tr>
          <td style="background:#f9fafb;border-top:1px solid #e5e7eb;padding:16px 32px;text-align:center;">
            <p style="margin:0;color:#9ca3af;font-size:0.75rem;">&copy; 2026 Mini CRM. All rights reserved.</p>
          </td>
        </tr>

      </table>
    </td></tr>
  </table>
</body>
</html>
    `;

    await transporter.sendMail({
        from: `"Mini CRM" <${process.env.SMTP_FROM || process.env.SMTP_MAIL}>`,
        to,
        subject: `Confirm ownership transfer for ${workspaceName}`,
        html,
    });
};

module.exports = { sendOtpEmail, sendPasswordResetEmail, sendInvitationEmail, sendWorkspaceAddedEmail, sendOwnershipTransferOtpEmail };
