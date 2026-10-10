const express = require("express");
const db = require("../db");
const { uid } = require("../utils/uid");
const { censorText } = require("../utils/censor");
const { requireAuth } = require("../middleware/auth");
const { serializeChannel, serializeChannelPost } = require("../utils/serialize");

const router = express.Router();

function isCensorEnabled() {
  const row = db.prepare("SELECT value FROM settings WHERE key = 'censorEnabled'").get();
  return !row || row.value === "1";
}

router.get("/", (_req, res) => {
  const rows = db.prepare("SELECT * FROM channels ORDER BY created_at DESC").all();
  res.json({ channels: rows.map(serializeChannel) });
});

router.post("/", requireAuth, (req, res) => {
  const { name, description } = req.body || {};
  if (!String(name || "").trim()) return res.status(400).json({ error: "Введите название канала" });
  const id = uid();
  db.prepare(
    "INSERT INTO channels (id, name, description, owner_id, created_at) VALUES (?, ?, ?, ?, ?)",
  ).run(id, String(name).trim(), String(description || "").trim(), req.userId, new Date().toISOString());
  const row = db.prepare("SELECT * FROM channels WHERE id = ?").get(id);
  res.status(201).json({ channel: serializeChannel(row) });
});

router.get("/:id", (req, res) => {
  const channel = db.prepare("SELECT * FROM channels WHERE id = ?").get(req.params.id);
  if (!channel) return res.status(404).json({ error: "Канал не найден" });
  const posts = db
    .prepare("SELECT * FROM channel_posts WHERE channel_id = ? ORDER BY created_at DESC")
    .all(req.params.id);
  res.json({ channel: serializeChannel(channel), posts: posts.map(serializeChannelPost) });
});

router.post("/:id/posts", requireAuth, (req, res) => {
  const channel = db.prepare("SELECT * FROM channels WHERE id = ?").get(req.params.id);
  if (!channel) return res.status(404).json({ error: "Канал не найден" });
  const { content, imageUrl, drawingUrl } = req.body || {};
  if (!String(content || "").trim() && !imageUrl && !drawingUrl) {
    return res.status(400).json({ error: "Введите текст или приложите файл" });
  }
  const censorEnabled = isCensorEnabled();
  const { text, changed } = censorEnabled
    ? censorText(String(content || ""))
    : { text: String(content || ""), changed: false };

  const id = uid();
  db.prepare(
    `INSERT INTO channel_posts (id, channel_id, user_id, content, image_url, drawing_url, censored, created_at)
     VALUES (?, ?, ?, ?, ?, ?, ?, ?)`,
  ).run(id, req.params.id, req.userId, text.trim(), imageUrl || null, drawingUrl || null, changed ? 1 : 0, new Date().toISOString());

  const row = db.prepare("SELECT * FROM channel_posts WHERE id = ?").get(id);
  res.status(201).json({ post: serializeChannelPost(row) });
});

router.delete("/posts/:id", requireAuth, (req, res) => {
  const post = db.prepare("SELECT * FROM channel_posts WHERE id = ?").get(req.params.id);
  if (!post) return res.status(404).json({ error: "Пост не найден" });
  const channel = db.prepare("SELECT * FROM channels WHERE id = ?").get(post.channel_id);
  const canDelete = post.user_id === req.userId || channel?.owner_id === req.userId || req.user.is_admin;
  if (!canDelete) return res.status(403).json({ error: "Нет доступа" });
  db.prepare("DELETE FROM channel_posts WHERE id = ?").run(req.params.id);
  res.json({ ok: true });
});

module.exports = router;
