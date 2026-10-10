const express = require("express");
const db = require("../db");
const { requireAuth, requireAdmin } = require("../middleware/auth");

const router = express.Router();

router.get("/stats", requireAuth, requireAdmin, (_req, res) => {
  const count = (sql) => db.prepare(sql).get().c;
  res.json({
    stats: {
      users: count("SELECT COUNT(*) AS c FROM users"),
      posts: count("SELECT COUNT(*) AS c FROM posts"),
      comments: count("SELECT COUNT(*) AS c FROM comments"),
      channels: count("SELECT COUNT(*) AS c FROM channels"),
      events: count("SELECT COUNT(*) AS c FROM events"),
      aktiviki: db.prepare("SELECT COALESCE(SUM(aktiviki),0) AS c FROM users").get().c,
    },
  });
});

router.get("/censor", (_req, res) => {
  const row = db.prepare("SELECT value FROM settings WHERE key = 'censorEnabled'").get();
  res.json({ enabled: !row || row.value === "1" });
});

router.put("/censor", requireAuth, requireAdmin, (req, res) => {
  const enabled = !!req.body?.enabled;
  db.prepare("UPDATE settings SET value = ? WHERE key = 'censorEnabled'").run(enabled ? "1" : "0");
  res.json({ enabled });
});

module.exports = router;
