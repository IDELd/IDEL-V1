const jwt = require("jsonwebtoken");
const db = require("../db");

const JWT_SECRET = process.env.JWT_SECRET || "dev_secret_change_me";

function signToken(userId) {
  return jwt.sign({ userId }, JWT_SECRET, {
    expiresIn: process.env.JWT_EXPIRES_IN || "30d",
  });
}

/** Requires a valid JWT. Attaches `req.userId` and `req.user` (full row). */
function requireAuth(req, res, next) {
  const header = req.headers.authorization || "";
  const token = header.startsWith("Bearer ") ? header.slice(7) : null;
  if (!token) {
    return res.status(401).json({ error: "Требуется авторизация" });
  }
  try {
    const payload = jwt.verify(token, JWT_SECRET);
    const user = db.prepare("SELECT * FROM users WHERE id = ?").get(payload.userId);
    if (!user) return res.status(401).json({ error: "Пользователь не найден" });
    req.userId = user.id;
    req.user = user;
    next();
  } catch {
    return res.status(401).json({ error: "Недействительный токен" });
  }
}

/** Like requireAuth, but does not fail when there's no token — req.user stays undefined. */
function optionalAuth(req, _res, next) {
  const header = req.headers.authorization || "";
  const token = header.startsWith("Bearer ") ? header.slice(7) : null;
  if (token) {
    try {
      const payload = jwt.verify(token, JWT_SECRET);
      const user = db.prepare("SELECT * FROM users WHERE id = ?").get(payload.userId);
      if (user) {
        req.userId = user.id;
        req.user = user;
      }
    } catch {
      // ignore invalid token for optional auth
    }
  }
  next();
}

function requireAdmin(req, res, next) {
  if (!req.user?.is_admin) {
    return res.status(403).json({ error: "Требуются права администратора" });
  }
  next();
}

module.exports = { signToken, requireAuth, optionalAuth, requireAdmin, JWT_SECRET };
