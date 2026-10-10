const express = require("express");
const db = require("../db");
const { uid } = require("../utils/uid");
const { requireAuth } = require("../middleware/auth");
const { serializeUser, serializeMessage } = require("../utils/serialize");
const { isBlockedEitherWay } = require("../utils/blockCheck");
const { VERIFY_BOT_USERNAME } = require("../utils/validation");

const router = express.Router();

function chatIdFor(a, b) {
  return [a, b].sort().join("_");
}

function getBotUser() {
  return db.prepare("SELECT * FROM users WHERE lower(username) = ?").get(VERIFY_BOT_USERNAME);
}

/** Very small rule-based "algorithm" behind @verifybot's replies — ported 1:1 from the client. */
function getBotReplyText(userId, incomingText) {
  const user = db.prepare("SELECT * FROM users WHERE id = ?").get(userId);
  const lower = String(incomingText || "").trim().toLowerCase();

  if (user?.verified) {
    return "Ваш аккаунт уже верифицирован ✅. Спасибо, что пользуетесь ИДЕЛЬ!";
  }

  const pending = db
    .prepare("SELECT 1 FROM verification_requests WHERE user_id = ? AND status = 'pending'")
    .get(userId);
  if (pending) {
    return "Ваша заявка уже на рассмотрении у администрации. Я сообщу здесь, как только будет решение.";
  }

  const wantsVerification =
    /(верифи|verify|подтверд)/.test(lower) ||
    lower === "/verify" ||
    lower === "начать" ||
    lower === "старт" ||
    lower === "/start";

  if (wantsVerification) {
    db.prepare(
      "INSERT INTO verification_requests (id, user_id, status, created_at) VALUES (?, ?, 'pending', ?)",
    ).run(uid(), userId, new Date().toISOString());
    return "Заявка на верификацию отправлена ✅. Администрация рассмотрит её в ближайшее время, я напишу сюда о результате.";
  }

  return (
    "Привет! Я @verifybot — я подаю заявки на верификацию аккаунтов ИДЕЛЬ.\n\n" +
    "Напишите мне «верификация» (или /verify), чтобы отправить заявку."
  );
}

router.get("/chats", requireAuth, (req, res) => {
  const rows = db
    .prepare(
      `SELECT DISTINCT CASE WHEN from_user_id = ? THEN to_user_id ELSE from_user_id END AS other_id
       FROM messages WHERE from_user_id = ? OR to_user_id = ?`,
    )
    .all(req.userId, req.userId, req.userId);
  if (rows.length === 0) return res.json({ users: [] });
  const placeholders = rows.map(() => "?").join(",");
  const users = db
    .prepare(`SELECT * FROM users WHERE id IN (${placeholders})`)
    .all(...rows.map((r) => r.other_id));
  res.json({ users: users.map((u) => serializeUser(u)) });
});

router.get("/bot", requireAuth, (_req, res) => {
  const bot = getBotUser();
  if (!bot) return res.status(404).json({ error: "@verifybot не инициализирован" });
  res.json({ user: serializeUser(bot) });
});

router.post("/bot/welcome", requireAuth, (req, res) => {
  const bot = getBotUser();
  if (!bot) return res.status(404).json({ error: "@verifybot не инициализирован" });
  const chatId = chatIdFor(bot.id, req.userId);
  const already = db.prepare("SELECT 1 FROM messages WHERE chat_id = ?").get(chatId);
  if (!already) {
    db.prepare(
      "INSERT INTO messages (id, chat_id, from_user_id, to_user_id, text, read, created_at) VALUES (?, ?, ?, ?, ?, 0, ?)",
    ).run(uid(), chatId, bot.id, req.userId, getBotReplyText(req.userId, ""), new Date().toISOString());
  }
  res.json({ ok: true });
});

router.get("/:userId", requireAuth, (req, res) => {
  const chatId = chatIdFor(req.userId, req.params.userId);
  const rows = db
    .prepare("SELECT * FROM messages WHERE chat_id = ? ORDER BY created_at ASC")
    .all(chatId);
  res.json({ messages: rows.map(serializeMessage) });
});

router.post("/", requireAuth, (req, res) => {
  const { toUserId, text } = req.body || {};
  if (!toUserId || !String(text || "").trim()) {
    return res.status(400).json({ error: "toUserId и text обязательны" });
  }
  if (isBlockedEitherWay(db, req.userId, toUserId)) {
    return res.status(403).json({ error: "Пользователь недоступен" });
  }
  const chatId = chatIdFor(req.userId, toUserId);
  const id = uid();
  const createdAt = new Date().toISOString();
  db.prepare(
    "INSERT INTO messages (id, chat_id, from_user_id, to_user_id, text, read, created_at) VALUES (?, ?, ?, ?, ?, 0, ?)",
  ).run(id, chatId, req.userId, toUserId, String(text).trim(), createdAt);

  // @verifybot answers automatically, right in the same conversation.
  const recipient = db.prepare("SELECT * FROM users WHERE id = ?").get(toUserId);
  if (recipient?.is_bot) {
    db.prepare(
      "INSERT INTO messages (id, chat_id, from_user_id, to_user_id, text, read, created_at) VALUES (?, ?, ?, ?, ?, 0, ?)",
    ).run(uid(), chatId, recipient.id, req.userId, getBotReplyText(req.userId, text), new Date().toISOString());
  }

  const row = db.prepare("SELECT * FROM messages WHERE id = ?").get(id);
  res.status(201).json({ message: serializeMessage(row) });
});

module.exports = router;
