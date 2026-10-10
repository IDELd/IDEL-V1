const express = require("express");
const db = require("../db");
const { uid } = require("../utils/uid");
const { censorText } = require("../utils/censor");
const { serializePost, serializeVideo } = require("../utils/serialize");
const { requireAuth } = require("../middleware/auth");
const { uploadPostImage, uploadVideo, fileUrl } = require("../middleware/upload");
const { isBlockedEitherWay } = require("../utils/blockCheck");

const router = express.Router();

function isCensorEnabled() {
  const row = db.prepare("SELECT value FROM settings WHERE key = 'censorEnabled'").get();
  return !row || row.value === "1";
}

function attachVideo(post) {
  const row = db.prepare("SELECT * FROM posts WHERE id = ? AND video_url IS NOT NULL").get(post.id);
  if (row && row.video_url) {
    return { ...post, video: { ...serializeVideo(row), postId: post.id } };
  }
  return post;
}

router.get("/", requireAuth, (req, res) => {
  const rows = db.prepare("SELECT * FROM posts ORDER BY created_at DESC").all();
  const visible = rows.filter((r) => !isBlockedEitherWay(db, req.userId, r.user_id));
  res.json({ posts: visible.map((r) => attachVideo(serializePost(r))) });
});

router.get("/user/:userId", (req, res) => {
  const rows = db
    .prepare("SELECT * FROM posts WHERE user_id = ? ORDER BY created_at DESC")
    .all(req.params.userId);
  res.json({ posts: rows.map((r) => attachVideo(serializePost(r))) });
});

router.post("/", requireAuth, (req, res) => {
  const { content, imageUrl, drawingUrl, videoUrl, videoThumbnailUrl, videoDuration } = req.body || {};
  if (!String(content || "").trim() && !imageUrl && !drawingUrl && !videoUrl) {
    return res.status(400).json({ error: "Введите текст или приложите файл" });
  }
  const censorEnabled = isCensorEnabled();
  const { text, changed } = censorEnabled ? censorText(String(content || "")) : { text: String(content || ""), changed: false };

  const id = uid();
  const createdAt = new Date().toISOString();
  db.prepare(
    `INSERT INTO posts (id, user_id, content, image_url, drawing_url, video_url, video_thumbnail_url, video_duration, censored, created_at)
     VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?)`,
  ).run(
    id,
    req.userId,
    text.trim(),
    imageUrl || null,
    drawingUrl || null,
    videoUrl || null,
    videoThumbnailUrl || null,
    videoDuration || null,
    changed ? 1 : 0,
    createdAt,
  );

  const row = db.prepare("SELECT * FROM posts WHERE id = ?").get(id);
  res.status(201).json({ post: attachVideo(serializePost(row)) });
});

router.delete("/:id", requireAuth, (req, res) => {
  const post = db.prepare("SELECT * FROM posts WHERE id = ?").get(req.params.id);
  if (!post) return res.status(404).json({ error: "Пост не найден" });
  if (post.user_id !== req.userId && !req.user.is_admin) {
    return res.status(403).json({ error: "Нет доступа" });
  }
  db.prepare("DELETE FROM posts WHERE id = ?").run(req.params.id);
  res.json({ ok: true });
});

router.post("/upload/image", requireAuth, uploadPostImage.single("file"), (req, res) => {
  if (!req.file) return res.status(400).json({ error: "Файл не получен" });
  res.json({ url: fileUrl(req, "posts", req.file.filename) });
});

router.post("/upload/video", requireAuth, uploadVideo.single("file"), (req, res) => {
  if (!req.file) return res.status(400).json({ error: "Файл не получен" });
  res.json({ url: fileUrl(req, "video", req.file.filename) });
});

module.exports = router;
