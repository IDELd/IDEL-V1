const express = require("express");
const db = require("../db");
const { uid } = require("../utils/uid");
const { censorText } = require("../utils/censor");
const { serializeComment } = require("../utils/serialize");
const { requireAuth } = require("../middleware/auth");
const { uploadVoice, fileUrl } = require("../middleware/upload");

const router = express.Router();

function isCensorEnabled() {
  const row = db.prepare("SELECT value FROM settings WHERE key = 'censorEnabled'").get();
  return !row || row.value === "1";
}

router.get("/post/:postId", (req, res) => {
  const rows = db
    .prepare("SELECT * FROM comments WHERE post_id = ? ORDER BY created_at ASC")
    .all(req.params.postId);
  res.json({ comments: rows.map(serializeComment) });
});

router.post("/", requireAuth, (req, res) => {
  const { postId, content, voiceUrl, duration } = req.body || {};
  if (!postId) return res.status(400).json({ error: "postId обязателен" });
  if (!String(content || "").trim() && !voiceUrl) {
    return res.status(400).json({ error: "Пустой комментарий" });
  }
  const censorEnabled = isCensorEnabled();
  const { text, changed } = censorEnabled
    ? censorText(String(content || ""))
    : { text: String(content || ""), changed: false };

  const id = uid();
  const createdAt = new Date().toISOString();
  db.prepare(
    `INSERT INTO comments (id, post_id, user_id, content, voice_url, duration, censored, created_at)
     VALUES (?, ?, ?, ?, ?, ?, ?, ?)`,
  ).run(id, postId, req.userId, text.trim() || null, voiceUrl || null, duration || null, changed ? 1 : 0, createdAt);

  const row = db.prepare("SELECT * FROM comments WHERE id = ?").get(id);
  res.status(201).json({ comment: serializeComment(row) });
});

router.delete("/:id", requireAuth, (req, res) => {
  const comment = db.prepare("SELECT * FROM comments WHERE id = ?").get(req.params.id);
  if (!comment) return res.status(404).json({ error: "Комментарий не найден" });
  if (comment.user_id !== req.userId && !req.user.is_admin) {
    return res.status(403).json({ error: "Нет доступа" });
  }
  db.prepare("DELETE FROM comments WHERE id = ?").run(req.params.id);
  res.json({ ok: true });
});

router.post("/upload/voice", requireAuth, uploadVoice.single("file"), (req, res) => {
  if (!req.file) return res.status(400).json({ error: "Файл не получен" });
  res.json({ url: fileUrl(req, "voice", req.file.filename) });
});

module.exports = router;
