const express = require("express");
const bcrypt = require("bcryptjs");
const db = require("../db");
const { uid } = require("../utils/uid");
const { validateUsername } = require("../utils/validation");
const { serializeUser } = require("../utils/serialize");
const { signToken, requireAuth } = require("../middleware/auth");
const { sendConfirmationEmail } = require("../utils/mailer");

const router = express.Router();

const CONFIRM_TOKEN_TTL_MS = 24 * 60 * 60 * 1000; // 24h

router.post("/register", async (req, res) => {
  const { username, password, fullName, bio, email, avatarUrl, coverUrl } = req.body || {};

  if (!username || !password) {
    return res.status(400).json({ error: "Укажите имя пользователя и пароль" });
  }
  if (String(password).length < 6) {
    return res.status(400).json({ error: "Пароль слишком короткий" });
  }
  const validation = validateUsername(username);
  if (!validation.ok) {
    return res.status(400).json({ error: validation.error });
  }
  const existing = db.prepare("SELECT id FROM users WHERE lower(username) = ?").get(validation.username);
  if (existing) {
    return res.status(409).json({ error: "Username уже занят" });
  }

  const id = uid();
  const passwordHash = bcrypt.hashSync(password, 10);
  const createdAt = new Date().toISOString();

  db.prepare(
    `INSERT INTO users (id, username, full_name, bio, password_hash, avatar_url, cover_url, is_admin, verified, is_bot, aktiviki, confirmed, created_at)
     VALUES (?, ?, ?, ?, ?, ?, ?, 0, 0, 0, 0, ?, ?)`,
  ).run(
    id,
    validation.username,
    String(fullName || "").trim(),
    String(bio || "").trim(),
    passwordHash,
    avatarUrl || null,
    coverUrl || null,
    email ? 0 : 1, // if no email was supplied, there's nothing to confirm
    createdAt,
  );

  let confirmation = null;
  if (email) {
    const token = uid();
    const expiresAt = new Date(Date.now() + CONFIRM_TOKEN_TTL_MS).toISOString();
    db.prepare(
      "INSERT INTO confirmations (id, user_id, token, expires_at) VALUES (?, ?, ?, ?)",
    ).run(uid(), id, token, expiresAt);
    const confirmLink = `${process.env.FRONTEND_URL || "http://localhost:5173"}/#/confirm?token=${token}`;
    confirmation = await sendConfirmationEmail(email, validation.username, confirmLink);
  }

  const user = db.prepare("SELECT * FROM users WHERE id = ?").get(id);
  const token = signToken(id);
  res.status(201).json({ token, user: serializeUser(user), confirmation });
});

router.get("/confirm", (req, res) => {
  const { token } = req.query;
  if (!token) return res.status(400).json({ error: "Токен не указан" });

  const row = db.prepare("SELECT * FROM confirmations WHERE token = ?").get(token);
  if (!row) return res.status(404).json({ error: "Ссылка недействительна" });
  if (new Date(row.expires_at).getTime() < Date.now()) {
    return res.status(410).json({ error: "Ссылка истекла" });
  }

  db.prepare("UPDATE users SET confirmed = 1 WHERE id = ?").run(row.user_id);
  db.prepare("DELETE FROM confirmations WHERE id = ?").run(row.id);
  res.json({ ok: true });
});

router.post("/login", (req, res) => {
  const { username, password } = req.body || {};
  if (!username || !password) {
    return res.status(400).json({ error: "Укажите имя пользователя и пароль" });
  }
  const clean = String(username).trim().replace(/^@/, "").toLowerCase();
  const user = db.prepare("SELECT * FROM users WHERE lower(username) = ?").get(clean);
  if (!user || !bcrypt.compareSync(password, user.password_hash)) {
    return res.status(401).json({ error: "Неверные данные" });
  }
  const token = signToken(user.id);
  res.json({ token, user: serializeUser(user) });
});

router.post("/logout", requireAuth, (_req, res) => {
  // Stateless JWT — nothing to invalidate server-side; the client just drops the token.
  res.json({ ok: true });
});

router.get("/me", requireAuth, (req, res) => {
  res.json({ user: serializeUser(req.user) });
});

module.exports = router;
