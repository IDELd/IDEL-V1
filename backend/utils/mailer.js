const nodemailer = require("nodemailer");

let transporter = null;

function getTransporter() {
  if (transporter) return transporter;
  if (!process.env.SMTP_USER || !process.env.SMTP_PASS) {
    return null; // not configured — caller falls back to console logging
  }
  transporter = nodemailer.createTransport({
    host: process.env.SMTP_HOST,
    port: Number(process.env.SMTP_PORT || 587),
    secure: Number(process.env.SMTP_PORT) === 465,
    auth: {
      user: process.env.SMTP_USER,
      pass: process.env.SMTP_PASS,
    },
  });
  return transporter;
}

/**
 * Sends the "confirm your account" email. If SMTP credentials are not set
 * (the default for local development), the link is logged to the console
 * instead so the flow can still be tested end-to-end.
 */
async function sendConfirmationEmail(to, username, confirmLink) {
  const subject = "Подтверждение регистрации в ИДЕЛЬ";
  const text = `Привет, ${username}!\n\nПерейдите по ссылке, чтобы подтвердить аккаунт:\n${confirmLink}\n\nЕсли вы не регистрировались в ИДЕЛЬ, просто проигнорируйте это письмо.`;
  const html = `
    <div style="font-family: sans-serif; max-width: 480px; margin: 0 auto;">
      <h2>Подтверждение регистрации в ИДЕЛЬ</h2>
      <p>Привет, <b>${escapeHtml(username)}</b>!</p>
      <p>Перейдите по ссылке, чтобы подтвердить аккаунт:</p>
      <p><a href="${confirmLink}" style="display:inline-block;padding:10px 18px;background:#000;color:#fff;border-radius:8px;text-decoration:none;">Подтвердить аккаунт</a></p>
      <p style="color:#666;font-size:12px;">Если кнопка не работает, скопируйте эту ссылку: ${confirmLink}</p>
    </div>`;

  const t = getTransporter();
  if (!t) {
    // eslint-disable-next-line no-console
    console.log(
      `\n[mailer] SMTP не настроен (см. backend/.env). Ссылка для подтверждения ${to}:\n${confirmLink}\n`,
    );
    return { delivered: false, reason: "smtp_not_configured" };
  }

  try {
    await t.sendMail({
      from: process.env.SMTP_FROM || "ИДЕЛЬ <no-reply@idel.app>",
      to,
      subject,
      text,
      html,
    });
    return { delivered: true };
  } catch (err) {
    // eslint-disable-next-line no-console
    console.error("[mailer] Не удалось отправить письмо:", err.message);
    console.log(`[mailer] Ссылка для подтверждения ${to}:\n${confirmLink}\n`);
    return { delivered: false, reason: "send_failed" };
  }
}

function escapeHtml(s) {
  return String(s).replace(/[&<>"']/g, (c) => ({
    "&": "&amp;",
    "<": "&lt;",
    ">": "&gt;",
    '"': "&quot;",
    "'": "&#39;",
  })[c]);
}

module.exports = { sendConfirmationEmail };
