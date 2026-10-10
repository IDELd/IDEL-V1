const express = require("express");
const db = require("../db");
const { uid } = require("../utils/uid");
const { requireAuth, requireAdmin } = require("../middleware/auth");
const { serializeBan } = require("../utils/serialize");

const router = express.Router();

router.get("/", requireAuth, requireAdmin, (_req, res) => {
  const rows = db.prepare("SELECT * FROM bans ORDER BY created_at DESC").all();
  res.json({ bans: rows.map(serializeBan) });
});

router.get("/status/:userId", (req, res) => {
  const row = db.prepare("SELECT * FROM bans WHERE user_id = ?").get(req.params.userId);
  res.json({ banned: !!row, reason: row?.reason || null });
});

router.post("/", requireAuth, requireAdmin, (req, res) => {
  const { userId, reason } = req.body || {};
  if (!userId || !String(reason || "").trim()) {
    return res.status(400).json({ error: "userId и reason обязательны" });
  }
  const target = db.prepare("SELECT * FROM users WHERE id = ?").get(userId);
  if (target?.is_admin) return res.status(400).json({ error: "Нельзя забанить администратора" });

  const existing = db.prepare("SELECT id FROM bans WHERE user_id = ?").get(userId);
  if (existing) {
    db.prepare("UPDATE bans SET reason = ?, banned_by = ? WHERE user_id = ?").run(
      String(reason).trim(),
      req.userId,
      userId,
    );
  } else {
    db.prepare(
      "INSERT INTO bans (id, user_id, reason, banned_by, created_at) VALUES (?, ?, ?, ?, ?)",
    ).run(uid(), userId, String(reason).trim(), req.userId, new Date().toISOString());
  }
  res.json({ ok: true });
});

router.delete("/:userId", requireAuth, requireAdmin, (req, res) => {
  db.prepare("DELETE FROM bans WHERE user_id = ?").run(req.params.userId);
  res.json({ ok: true });
});

module.exports = router;
