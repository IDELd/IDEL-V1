require("dotenv").config();
const path = require("path");
const express = require("express");
const cors = require("cors");
const bcrypt = require("bcryptjs");
const db = require("./db");
const { uid } = require("./utils/uid");
const { ADMIN_USERNAME, VERIFY_BOT_USERNAME } = require("./utils/validation");
const { UPLOAD_ROOT } = require("./middleware/upload");

// ---------------------------------------------------------------------------
// One-time seed data: the admin account and the @verifybot account. Mirrors
// ensureInit() from the old src/lib/db.ts so behaviour stays identical.
// ---------------------------------------------------------------------------
function ensureSeedUsers() {
  const admin = db.prepare("SELECT id FROM users WHERE lower(username) = ?").get(ADMIN_USERNAME);
  if (!admin) {
    db.prepare(
      `INSERT INTO users (id, username, full_name, bio, password_hash, avatar_url, cover_url, is_admin, verified, is_bot, aktiviki, confirmed, created_at)
       VALUES (?, ?, ?, ?, ?, NULL, NULL, 1, 1, 0, 0, 1, ?)`,
    ).run(uid(), ADMIN_USERNAME, "Администратор", "", bcrypt.hashSync("iDrobo13*5448I", 10), new Date().toISOString());
    // eslint-disable-next-line no-console
    console.log(`[seed] Создан аккаунт администратора @${ADMIN_USERNAME}`);
  }

  const bot = db.prepare("SELECT id FROM users WHERE lower(username) = ?").get(VERIFY_BOT_USERNAME);
  if (!bot) {
    db.prepare(
      `INSERT INTO users (id, username, full_name, bio, password_hash, avatar_url, cover_url, is_admin, verified, is_bot, aktiviki, confirmed, created_at)
       VALUES (?, ?, ?, ?, ?, NULL, NULL, 0, 1, 1, 0, 1, ?)`,
    ).run(
      uid(),
      VERIFY_BOT_USERNAME,
      "VerifyBot",
      "Бот верификации ИДЕЛЬ. Напишите мне, чтобы подать заявку на верификацию аккаунта.",
      bcrypt.hashSync(uid(), 10),
      new Date().toISOString(),
    );
    // eslint-disable-next-line no-console
    console.log(`[seed] Создан аккаунт @${VERIFY_BOT_USERNAME}`);
  }
}
ensureSeedUsers();

const app = express();
app.use(cors());
app.use(express.json({ limit: "2mb" })); // drawing canvases are inline data URLs, keep some headroom
app.use("/uploads", express.static(UPLOAD_ROOT));

app.use("/api/auth", require("./routes/auth"));
app.use("/api/users", require("./routes/users"));
app.use("/api/posts", require("./routes/posts"));
app.use("/api/comments", require("./routes/comments"));
app.use("/api/likes", require("./routes/likes"));
app.use("/api/follows", require("./routes/follows"));
app.use("/api/friends", require("./routes/friends"));
app.use("/api/messages", require("./routes/messages"));
app.use("/api/channels", require("./routes/channels"));
app.use("/api/verify", require("./routes/verify"));
app.use("/api/reports", require("./routes/reports"));
app.use("/api/bans", require("./routes/bans"));
app.use("/api/blocks", require("./routes/blocks"));
app.use("/api/events", require("./routes/events"));
app.use("/api/notifications", require("./routes/notifications"));
app.use("/api/admin", require("./routes/admin"));

app.get("/api/health", (_req, res) => res.json({ ok: true }));

// Centralized error handler (also catches Multer file-size errors, etc.)
// eslint-disable-next-line no-unused-vars
app.use((err, _req, res, _next) => {
  console.error(err);
  res.status(err.status || 500).json({ error: err.message || "Внутренняя ошибка сервера" });
});

const PORT = process.env.PORT || 5001;
app.listen(PORT, () => {
  // eslint-disable-next-line no-console
  console.log(`ИДЕЛЬ backend запущен на http://localhost:${PORT}`);
});
