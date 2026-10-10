const express = require("express");
const db = require("../db");
const { uid } = require("../utils/uid");
const { requireAuth, requireAdmin } = require("../middleware/auth");
const { serializeVerificationRequest } = require("../utils/serialize");

const router = express.Router();

router.post("/request", requireAuth, (req, res) => {
  if (req.user.verified) {
    return res.status(400).json({ error: "Аккаунт уже верифицирован" });
  }
  const pending = db
    .prepare("SELECT id FROM verification_requests WHERE user_id = ? AND status = 'pending'")
    .get(req.userId);
  if (pending) return res.status(409).json({ error: "Заявка уже отправлена" });

  const id = uid();
  db.prepare(
    "INSERT INTO verification_requests (id, user_id, status, created_at) VALUES (?, ?, 'pending', ?)",
  ).run(id, req.userId, new Date().toISOString());
  const row = db.prepare("SELECT * FROM verification_requests WHERE id = ?").get(id);
  res.status(201).json({ request: serializeVerificationRequest(row) });
});

router.get("/", requireAuth, requireAdmin, (_req, res) => {
  const rows = db.prepare("SELECT * FROM verification_requests ORDER BY created_at DESC").all();
  res.json({ requests: rows.map(serializeVerificationRequest) });
});

router.put("/:id", requireAuth, requireAdmin, (req, res) => {
  const { approve } = req.body || {};
  const request = db.prepare("SELECT * FROM verification_requests WHERE id = ?").get(req.params.id);
  if (!request) return res.status(404).json({ error: "Заявка не найдена" });

  db.prepare("UPDATE verification_requests SET status = ? WHERE id = ?").run(
    approve ? "accepted" : "rejected",
    req.params.id,
  );
  if (approve) {
    db.prepare("UPDATE users SET verified = 1 WHERE id = ?").run(request.user_id);
  }
  res.json({ ok: true });
});

module.exports = router;
