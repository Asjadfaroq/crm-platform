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

const APP_NAME = process.env.APP_NAME || 'Mini CRM';
const SUPPORT_EMAIL = process.env.SUPPORT_EMAIL || process.env.SMTP_FROM || '';

// ── Design tokens ────────────────────────────────────────────────────────────
// Deliberately conservative: no gradients, no web fonts, no flexbox. Outlook
// renders none of those, and enterprise inboxes are disproportionately Outlook.
const C = {
    pageBg: '#f1f3f5',
    card: '#ffffff',
    border: '#e4e7eb',
    rule: '#eef0f3',
    accent: '#4f46e5',
    accentDark: '#4338ca',
    ink: '#16191f',
    body: '#4a5361',
    muted: '#8a94a6',
    codeBg: '#f7f8fa',
    warnBg: '#fffaf0',
    warnBorder: '#f5dfae',
    warnInk: '#7a5c14',
    dangerBg: '#fdf3f3',
    dangerBorder: '#f0c7c7',
    dangerInk: '#9b2226',
};

const FONT = "-apple-system,BlinkMacSystemFont,'Segoe UI',Roboto,'Helvetica Neue',Arial,sans-serif";
const MONO = "'SF Mono',SFMono-Regular,Consolas,'Liberation Mono',Menlo,monospace";

// User-supplied values (names, workspace names) land inside HTML — escape them.
const esc = (v) =>
    String(v ?? '')
        .replace(/&/g, '&amp;')
        .replace(/</g, '&lt;')
        .replace(/>/g, '&gt;')
        .replace(/"/g, '&quot;')
        .replace(/'/g, '&#39;');

// ── Building blocks ──────────────────────────────────────────────────────────

/** Bulletproof CTA — a bgcolor'd table cell, which every client renders. */
const button = (href, label) => `
<table role="presentation" cellpadding="0" cellspacing="0" border="0" align="center" style="margin:0 auto;">
  <tr>
    <td align="center" bgcolor="${C.accent}" style="border-radius:6px;">
      <a href="${href}" style="display:inline-block;padding:13px 32px;font-family:${FONT};font-size:15px;font-weight:600;line-height:20px;color:#ffffff;text-decoration:none;border-radius:6px;">${label}</a>
    </td>
  </tr>
</table>`;

const codeBlock = (code) => `
<table role="presentation" cellpadding="0" cellspacing="0" border="0" width="100%">
  <tr>
    <td align="center" style="padding:4px 0 8px;">
      <table role="presentation" cellpadding="0" cellspacing="0" border="0">
        <tr>
          <td align="center" bgcolor="${C.codeBg}" style="border:1px solid ${C.border};border-radius:8px;padding:20px 32px;">
            <span style="font-family:${MONO};font-size:32px;font-weight:600;letter-spacing:8px;color:${C.ink};">${esc(code)}</span>
          </td>
        </tr>
      </table>
    </td>
  </tr>
</table>`;

const notice = (html, tone = 'warn') => {
    const bg = tone === 'danger' ? C.dangerBg : C.warnBg;
    const bd = tone === 'danger' ? C.dangerBorder : C.warnBorder;
    const ink = tone === 'danger' ? C.dangerInk : C.warnInk;
    return `
<table role="presentation" cellpadding="0" cellspacing="0" border="0" width="100%" style="margin:24px 0 0;">
  <tr>
    <td bgcolor="${bg}" style="border:1px solid ${bd};border-radius:6px;padding:12px 16px;font-family:${FONT};font-size:13px;line-height:20px;color:${ink};">${html}</td>
  </tr>
</table>`;
};

/** Fallback link shown under a CTA, for clients that strip buttons. */
const rawLink = (href) => `
<table role="presentation" cellpadding="0" cellspacing="0" border="0" width="100%" style="margin:24px 0 0;">
  <tr><td style="border-top:1px solid ${C.rule};padding-top:16px;font-family:${FONT};font-size:12px;line-height:18px;color:${C.muted};">
    If the button does not work, paste this link into your browser:<br>
    <a href="${href}" style="color:${C.accent};text-decoration:none;word-break:break-all;">${esc(href)}</a>
  </td></tr>
</table>`;

const p = (text, { size = 15, color = C.body, top = 0 } = {}) =>
    `<p style="margin:${top}px 0 0;font-family:${FONT};font-size:${size}px;line-height:23px;color:${color};">${text}</p>`;

/**
 * Shared shell. `label` is the small uppercase category in the header,
 * `preheader` is the grey preview line inboxes show next to the subject.
 */
const layout = ({ label, preheader, content }) => `<!DOCTYPE html PUBLIC "-//W3C//DTD XHTML 1.0 Transitional//EN" "http://www.w3.org/TR/xhtml1/DTD/xhtml1-transitional.dtd">
<html xmlns="http://www.w3.org/1999/xhtml">
<head>
  <meta charset="utf-8">
  <meta name="viewport" content="width=device-width,initial-scale=1">
  <meta name="x-apple-disable-message-reformatting">
  <meta name="color-scheme" content="light">
  <meta name="supported-color-schemes" content="light">
  <title>${esc(APP_NAME)}</title>
</head>
<body style="margin:0;padding:0;background-color:${C.pageBg};-webkit-font-smoothing:antialiased;">

  <div style="display:none;font-size:1px;color:${C.pageBg};line-height:1px;max-height:0;max-width:0;opacity:0;overflow:hidden;">${esc(preheader)}&#8199;&#65279;&#847;&#8199;&#65279;&#847;&#8199;&#65279;&#847;&#8199;&#65279;&#847;&#8199;&#65279;&#847;</div>

  <table role="presentation" cellpadding="0" cellspacing="0" border="0" width="100%" style="background-color:${C.pageBg};">
    <tr>
      <td align="center" style="padding:40px 16px;">

        <table role="presentation" cellpadding="0" cellspacing="0" border="0" width="600" style="width:600px;max-width:600px;background-color:${C.card};border:1px solid ${C.border};border-radius:10px;overflow:hidden;">

          <tr><td style="height:3px;line-height:3px;font-size:0;background-color:${C.accent};">&nbsp;</td></tr>

          <tr>
            <td style="padding:26px 40px 20px;border-bottom:1px solid ${C.rule};">
              <table role="presentation" cellpadding="0" cellspacing="0" border="0" width="100%">
                <tr>
                  <td align="left" style="font-family:${FONT};font-size:17px;font-weight:700;letter-spacing:-0.2px;color:${C.ink};">${esc(APP_NAME)}</td>
                  <td align="right" style="font-family:${FONT};font-size:11px;font-weight:600;letter-spacing:0.9px;text-transform:uppercase;color:${C.muted};">${esc(label)}</td>
                </tr>
              </table>
            </td>
          </tr>

          <tr><td style="padding:32px 40px 36px;">${content}</td></tr>

          <tr>
            <td style="padding:20px 40px 24px;border-top:1px solid ${C.rule};background-color:#fbfcfd;">
              <p style="margin:0;font-family:${FONT};font-size:12px;line-height:19px;color:${C.muted};">
                This is an automated message from ${esc(APP_NAME)}. Please do not reply.${SUPPORT_EMAIL ? ` For help, contact <a href="mailto:${esc(SUPPORT_EMAIL)}" style="color:${C.muted};text-decoration:underline;">${esc(SUPPORT_EMAIL)}</a>.` : ''}
              </p>
              <p style="margin:8px 0 0;font-family:${FONT};font-size:12px;line-height:19px;color:${C.muted};">
                &copy; ${new Date().getFullYear()} ${esc(APP_NAME)}
              </p>
            </td>
          </tr>

        </table>

      </td>
    </tr>
  </table>
</body>
</html>`;

/**
 * Every message ships a text/plain part — spam filters and CLI clients want it.
 *
 * Transport selection: hosts that block outbound SMTP (Render's free tier blocks
 * 25/465/587) can set BREVO_API_KEY to deliver over HTTPS instead. Falls back to
 * SMTP when the key is absent, which is what local development uses.
 */
const send = async ({ to, subject, html, text }) => {
    const fromAddress = process.env.SMTP_FROM || process.env.SMTP_MAIL;

    if (process.env.BREVO_API_KEY) {
        const res = await fetch('https://api.brevo.com/v3/smtp/email', {
            method: 'POST',
            headers: {
                'api-key': process.env.BREVO_API_KEY,
                'content-type': 'application/json',
                accept: 'application/json',
            },
            body: JSON.stringify({
                sender: { name: APP_NAME, email: fromAddress },
                to: [{ email: to }],
                subject,
                htmlContent: html,
                textContent: text,
            }),
        });

        if (!res.ok) {
            const detail = await res.text().catch(() => '');
            throw new Error(`Brevo API ${res.status}: ${detail.slice(0, 300)}`);
        }
        return;
    }

    await transporter.sendMail({
        from: `"${APP_NAME}" <${fromAddress}>`,
        to,
        subject,
        html,
        text,
    });
};

// ── Messages ─────────────────────────────────────────────────────────────────

const sendOtpEmail = async (to, otp, purpose) => {
    const isSignup = purpose === 'signup';
    const label = isSignup ? 'Account verification' : 'Sign-in verification';
    const subject = isSignup
        ? `Verify your ${APP_NAME} account`
        : `${otp} is your ${APP_NAME} verification code`;

    const intro = isSignup
        ? `Enter the verification code below to confirm your email address and finish setting up your ${esc(APP_NAME)} account.`
        : `A sign-in attempt to ${esc(APP_NAME)} requires verification. Enter the code below to continue.`;

    const content = `
${p(`<strong style="color:${C.ink};font-weight:600;">${isSignup ? 'Confirm your email address' : 'Verify your sign-in'}</strong>`, { size: 19 })}
${p(intro, { top: 12 })}
<div style="height:28px;line-height:28px;font-size:0;">&nbsp;</div>
${codeBlock(otp)}
${notice('This code expires in <strong>10 minutes</strong> and can be used once. Never share it with anyone.')}
${p(
        isSignup
            ? 'If you did not create this account, no further action is required and the address will not be used.'
            : 'If you did not attempt to sign in, your account is still secure. We recommend changing your password.',
        { size: 13, color: C.muted, top: 24 }
    )}`;

    await send({
        to,
        subject,
        html: layout({ label, preheader: `Your verification code is ${otp}. It expires in 10 minutes.`, content }),
        text: `${isSignup ? 'Confirm your email address' : 'Verify your sign-in'}

${isSignup
                ? `Enter this code to finish setting up your ${APP_NAME} account.`
                : `A sign-in attempt to ${APP_NAME} requires verification.`}

Verification code: ${otp}

This code expires in 10 minutes and can be used once. Never share it with anyone.

If you did not request this, no action is required.

— ${APP_NAME}`,
    });
};

const sendPasswordResetEmail = async (to, resetLink) => {
    const content = `
${p(`<strong style="color:${C.ink};font-weight:600;">Reset your password</strong>`, { size: 19 })}
${p(`We received a request to reset the password for your ${esc(APP_NAME)} account. Choose a new password using the button below.`, { top: 12 })}
<div style="height:28px;line-height:28px;font-size:0;">&nbsp;</div>
${button(resetLink, 'Reset password')}
${notice('This link expires in <strong>1 hour</strong> and can be used once.')}
${rawLink(resetLink)}
${p('If you did not request a password reset, you can ignore this message. Your current password remains active.', { size: 13, color: C.muted, top: 20 })}`;

    await send({
        to,
        subject: `Reset your ${APP_NAME} password`,
        html: layout({ label: 'Password reset', preheader: 'Reset your password. This link expires in 1 hour.', content }),
        text: `Reset your password

We received a request to reset the password for your ${APP_NAME} account.

Reset it here: ${resetLink}

This link expires in 1 hour and can be used once.

If you did not request this, you can ignore this message.

— ${APP_NAME}`,
    });
};

// Sent to a brand-new user who was invited to a workspace
const sendInvitationEmail = async (to, { inviterName, workspaceName, role, setPasswordLink }) => {
    const content = `
${p(`<strong style="color:${C.ink};font-weight:600;">You have been invited to ${esc(workspaceName)}</strong>`, { size: 19 })}
${p(`<strong style="color:${C.ink};font-weight:600;">${esc(inviterName)}</strong> has invited you to join the <strong style="color:${C.ink};font-weight:600;">${esc(workspaceName)}</strong> workspace on ${esc(APP_NAME)} with the role of <strong style="color:${C.ink};font-weight:600;text-transform:capitalize;">${esc(role)}</strong>.`, { top: 12 })}
${p(`${esc(APP_NAME)} is a lead management platform for sales teams. Set a password to activate your account and access the workspace.`, { size: 14, color: C.muted, top: 12 })}
<div style="height:28px;line-height:28px;font-size:0;">&nbsp;</div>
${button(setPasswordLink, 'Accept invitation')}
${notice('This invitation expires in <strong>1 hour</strong>. Do not forward this email — the link grants access to your account.')}
${rawLink(setPasswordLink)}
${p('If you were not expecting this invitation, you can safely ignore this message.', { size: 13, color: C.muted, top: 20 })}`;

    await send({
        to,
        subject: `${inviterName} invited you to ${workspaceName} on ${APP_NAME}`,
        html: layout({
            label: 'Workspace invitation',
            preheader: `${inviterName} invited you to join ${workspaceName} as ${role}.`,
            content,
        }),
        text: `You have been invited to ${workspaceName}

${inviterName} has invited you to join the ${workspaceName} workspace on ${APP_NAME} as ${role}.

Set your password to accept: ${setPasswordLink}

This invitation expires in 1 hour. Do not forward this email.

— ${APP_NAME}`,
    });
};

// Sent to an existing user who was added to a new workspace
const sendWorkspaceAddedEmail = async (to, { inviterName, workspaceName, role, loginLink }) => {
    const content = `
${p(`<strong style="color:${C.ink};font-weight:600;">You now have access to ${esc(workspaceName)}</strong>`, { size: 19 })}
${p(`<strong style="color:${C.ink};font-weight:600;">${esc(inviterName)}</strong> added you to the <strong style="color:${C.ink};font-weight:600;">${esc(workspaceName)}</strong> workspace with the role of <strong style="color:${C.ink};font-weight:600;text-transform:capitalize;">${esc(role)}</strong>.`, { top: 12 })}
${p(`Sign in and switch to ${esc(workspaceName)} from the workspace selector to get started.`, { size: 14, color: C.muted, top: 12 })}
<div style="height:28px;line-height:28px;font-size:0;">&nbsp;</div>
${button(loginLink, `Open ${APP_NAME}`)}
${p('If you were not expecting this, contact your workspace administrator.', { size: 13, color: C.muted, top: 28 })}`;

    await send({
        to,
        subject: `You were added to ${workspaceName} on ${APP_NAME}`,
        html: layout({
            label: 'Workspace access',
            preheader: `${inviterName} added you to ${workspaceName} as ${role}.`,
            content,
        }),
        text: `You now have access to ${workspaceName}

${inviterName} added you to the ${workspaceName} workspace as ${role}.

Sign in: ${loginLink}

If you were not expecting this, contact your workspace administrator.

— ${APP_NAME}`,
    });
};

// Sent to the current owner when they initiate an ownership transfer
const sendOwnershipTransferOtpEmail = async (to, { workspaceName, newOwnerName, otp }) => {
    const content = `
${p(`<strong style="color:${C.ink};font-weight:600;">Confirm ownership transfer</strong>`, { size: 19 })}
${p(`You requested to transfer ownership of <strong style="color:${C.ink};font-weight:600;">${esc(workspaceName)}</strong> to <strong style="color:${C.ink};font-weight:600;">${esc(newOwnerName)}</strong>. Enter the code below to confirm.`, { top: 12 })}
<div style="height:28px;line-height:28px;font-size:0;">&nbsp;</div>
${codeBlock(otp)}
${notice('This code expires in <strong>10 minutes</strong> and can be used once. Never share it with anyone.')}
${notice(`<strong>This action cannot be undone.</strong> ${esc(newOwnerName)} will gain full control of ${esc(workspaceName)}, including the ability to remove members. You will remain an administrator.`, 'danger')}
${p('If you did not request this transfer, do not enter the code. Change your password immediately and review your workspace members.', { size: 13, color: C.muted, top: 24 })}`;

    await send({
        to,
        subject: `Confirm ownership transfer for ${workspaceName}`,
        html: layout({
            label: 'Ownership transfer',
            preheader: `Confirm transferring ${workspaceName} to ${newOwnerName}. Code expires in 10 minutes.`,
            content,
        }),
        text: `Confirm ownership transfer

You requested to transfer ownership of ${workspaceName} to ${newOwnerName}.

Confirmation code: ${otp}

This code expires in 10 minutes and can be used once.

WARNING: This action cannot be undone. ${newOwnerName} will gain full control of ${workspaceName}. You will remain an administrator.

If you did not request this, do not enter the code and change your password immediately.

— ${APP_NAME}`,
    });
};

module.exports = { sendOtpEmail, sendPasswordResetEmail, sendInvitationEmail, sendWorkspaceAddedEmail, sendOwnershipTransferOtpEmail };
