const express = require("express");
const db = require("../db");
const { serializeUser } = require("../utils/serialize");
const { requireAuth, requireAdmin, optionalAuth } = require("../middleware/auth");
const { validateUsername } = require("../utils/validation");
const { uploadAvatar, uploadCover, fileUrl } = require("../middleware/upload");

const router = express.Router();

router.get("/", optionalAuth, (_req, res) => {
  const rows = db.prepare("SELECT * FROM users ORDER BY created_at ASC").all();
  res.json({ users: rows.map((r) => serializeUser(r)) });
});

router.get("/:username", (req, res) => {
  const username = req.params.username.trim().replace(/^@/, "").toLowerCase();
  const row = db.prepare("SELECT * FROM users WHERE lower(username) = ?").get(username);
  if (!row) return res.status(404).json({ error: "Пользователь не найден" });
  res.json({ user: serializeUser(row) });
});

router.put("/profile", requireAuth, (req, res) => {
  const { fullName, bio, avatarUrl, coverUrl } = req.body || {};
  db.prepare(
    "UPDATE users SET full_name = ?, bio = ?, avatar_url = ?, cover_url = ? WHERE id = ?",
  ).run(
    String(fullName ?? req.user.full_name).trim(),
    String(bio ?? req.user.bio).trim(),
    avatarUrl === undefined ? req.user.avatar_url : avatarUrl,
    coverUrl === undefined ? req.user.cover_url : coverUrl,
    req.userId,
  );
  const updated = db.prepare("SELECT * FROM users WHERE id = ?").get(req.userId);
  res.json({ user: serializeUser(updated) });
});

router.put("/username", requireAuth, (req, res) => {
  const validation = validateUsername(req.body?.username);
  if (!validation.ok) return res.status(400).json({ error: validation.error });

  if (validation.username !== req.user.username.toLowerCase()) {
    const taken = db
      .prepare("SELECT id FROM users WHERE lower(username) = ? AND id != ?")
      .get(validation.username, req.userId);
    if (taken) return res.status(409).json({ error: "Username уже занят" });
  }

  // The immutability trigger only blocks no-op updates; a real change goes through.
  db.prepare("UPDATE users SET username = ? WHERE id = ?").run(validation.username, req.userId);
  const updated = db.prepare("SELECT * FROM users WHERE id = ?").get(req.userId);
  res.json({ user: serializeUser(updated) });
});

router.delete("/account", requireAuth, (req, res) => {
  // ON DELETE CASCADE on every foreign key handles posts, comments, likes,
  // follows, channels, friend requests, messages, verification requests,
  // reports, bans and blocks automatically.
  db.prepare("DELETE FROM users WHERE id = ?").run(req.userId);
  res.json({ ok: true });
});

router.put("/:id/verified", requireAuth, requireAdmin, (req, res) => {
  const target = db.prepare("SELECT * FROM users WHERE id = ?").get(req.params.id);
  if (!target) return res.status(404).json({ error: "Пользователь не найден" });
  if (target.is_admin) return res.status(400).json({ error: "Нельзя изменить администратора" });
  db.prepare("UPDATE users SET verified = ? WHERE id = ?").run(req.body?.verified ? 1 : 0, req.params.id);
  const updated = db.prepare("SELECT * FROM users WHERE id = ?").get(req.params.id);
  res.json({ user: serializeUser(updated) });
});

router.post("/avatar", requireAuth, uploadAvatar.single("file"), (req, res) => {
  if (!req.file) return res.status(400).json({ error: "Файл не получен" });
  const url = fileUrl(req, "avatars", req.file.filename);
  res.json({ url });
});

router.post("/cover", requireAuth, uploadCover.single("file"), (req, res) => {
  if (!req.file) return res.status(400).json({ error: "Файл не получен" });
  const url = fileUrl(req, "covers", req.file.filename);
  res.json({ url });
});

module.exports = router;
