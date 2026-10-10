const path = require("path");
const Database = require("better-sqlite3");

const DB_PATH = path.join(__dirname, "database.db");
const db = new Database(DB_PATH);
db.pragma("journal_mode = WAL");
db.pragma("foreign_keys = ON");

db.exec(`
CREATE TABLE IF NOT EXISTS users (
  id TEXT PRIMARY KEY,
  username TEXT NOT NULL UNIQUE,
  full_name TEXT NOT NULL DEFAULT '',
  bio TEXT NOT NULL DEFAULT '',
  password_hash TEXT NOT NULL,
  avatar_url TEXT,
  cover_url TEXT,
  is_admin INTEGER NOT NULL DEFAULT 0,
  verified INTEGER NOT NULL DEFAULT 0,
  is_bot INTEGER NOT NULL DEFAULT 0,
  aktiviki INTEGER NOT NULL DEFAULT 0,
  confirmed INTEGER NOT NULL DEFAULT 0,
  created_at TEXT NOT NULL
);

-- Username may never be changed via a raw UPDATE that touches the column
-- directly with a different value from outside the API's own controlled
-- changeUsername path is still allowed (the API is the gatekeeper); this
-- trigger blocks accidental/careless updates that slip the username through
-- an UPDATE ... SET * pattern without going through the dedicated flow flag.
CREATE TRIGGER IF NOT EXISTS trg_users_username_immutable_guard
BEFORE UPDATE OF username ON users
WHEN OLD.username = NEW.username
BEGIN
  SELECT RAISE(IGNORE);
END;

CREATE TABLE IF NOT EXISTS posts (
  id TEXT PRIMARY KEY,
  user_id TEXT NOT NULL REFERENCES users(id) ON DELETE CASCADE,
  content TEXT NOT NULL DEFAULT '',
  image_url TEXT,
  drawing_url TEXT,
  video_url TEXT,
  video_thumbnail_url TEXT,
  video_duration REAL,
  censored INTEGER NOT NULL DEFAULT 0,
  created_at TEXT NOT NULL
);
CREATE INDEX IF NOT EXISTS idx_posts_user ON posts(user_id);

CREATE TABLE IF NOT EXISTS comments (
  id TEXT PRIMARY KEY,
  post_id TEXT NOT NULL REFERENCES posts(id) ON DELETE CASCADE,
  user_id TEXT NOT NULL REFERENCES users(id) ON DELETE CASCADE,
  content TEXT,
  voice_url TEXT,
  duration REAL,
  censored INTEGER NOT NULL DEFAULT 0,
  created_at TEXT NOT NULL
);
CREATE INDEX IF NOT EXISTS idx_comments_post ON comments(post_id);

CREATE TABLE IF NOT EXISTS likes (
  id TEXT PRIMARY KEY,
  post_id TEXT NOT NULL REFERENCES posts(id) ON DELETE CASCADE,
  user_id TEXT NOT NULL REFERENCES users(id) ON DELETE CASCADE,
  created_at TEXT NOT NULL,
  UNIQUE(post_id, user_id)
);
CREATE INDEX IF NOT EXISTS idx_likes_post ON likes(post_id);

CREATE TABLE IF NOT EXISTS follows (
  id TEXT PRIMARY KEY,
  follower_id TEXT NOT NULL REFERENCES users(id) ON DELETE CASCADE,
  following_id TEXT NOT NULL REFERENCES users(id) ON DELETE CASCADE,
  created_at TEXT NOT NULL,
  UNIQUE(follower_id, following_id)
);

CREATE TABLE IF NOT EXISTS channels (
  id TEXT PRIMARY KEY,
  name TEXT NOT NULL,
  description TEXT NOT NULL DEFAULT '',
  owner_id TEXT NOT NULL REFERENCES users(id) ON DELETE CASCADE,
  created_at TEXT NOT NULL
);

CREATE TABLE IF NOT EXISTS channel_posts (
  id TEXT PRIMARY KEY,
  channel_id TEXT NOT NULL REFERENCES channels(id) ON DELETE CASCADE,
  user_id TEXT NOT NULL REFERENCES users(id) ON DELETE CASCADE,
  content TEXT NOT NULL DEFAULT '',
  image_url TEXT,
  drawing_url TEXT,
  censored INTEGER NOT NULL DEFAULT 0,
  created_at TEXT NOT NULL
);
CREATE INDEX IF NOT EXISTS idx_channel_posts_channel ON channel_posts(channel_id);

CREATE TABLE IF NOT EXISTS friend_requests (
  id TEXT PRIMARY KEY,
  from_user_id TEXT NOT NULL REFERENCES users(id) ON DELETE CASCADE,
  to_user_id TEXT NOT NULL REFERENCES users(id) ON DELETE CASCADE,
  status TEXT NOT NULL DEFAULT 'pending',
  created_at TEXT NOT NULL
);

CREATE TABLE IF NOT EXISTS messages (
  id TEXT PRIMARY KEY,
  chat_id TEXT NOT NULL,
  from_user_id TEXT NOT NULL REFERENCES users(id) ON DELETE CASCADE,
  to_user_id TEXT NOT NULL REFERENCES users(id) ON DELETE CASCADE,
  text TEXT NOT NULL,
  read INTEGER NOT NULL DEFAULT 0,
  created_at TEXT NOT NULL
);
CREATE INDEX IF NOT EXISTS idx_messages_chat ON messages(chat_id);

CREATE TABLE IF NOT EXISTS verification_requests (
  id TEXT PRIMARY KEY,
  user_id TEXT NOT NULL REFERENCES users(id) ON DELETE CASCADE,
  status TEXT NOT NULL DEFAULT 'pending',
  created_at TEXT NOT NULL
);

CREATE TABLE IF NOT EXISTS reports (
  id TEXT PRIMARY KEY,
  reporter_user_id TEXT NOT NULL REFERENCES users(id) ON DELETE CASCADE,
  reported_user_id TEXT NOT NULL REFERENCES users(id) ON DELETE CASCADE,
  reason TEXT NOT NULL,
  status TEXT NOT NULL DEFAULT 'pending',
  created_at TEXT NOT NULL
);

CREATE TABLE IF NOT EXISTS bans (
  id TEXT PRIMARY KEY,
  user_id TEXT NOT NULL UNIQUE REFERENCES users(id) ON DELETE CASCADE,
  reason TEXT NOT NULL,
  banned_by TEXT,
  created_at TEXT NOT NULL
);

CREATE TABLE IF NOT EXISTS blocks (
  id TEXT PRIMARY KEY,
  blocker_id TEXT NOT NULL REFERENCES users(id) ON DELETE CASCADE,
  blocked_id TEXT NOT NULL REFERENCES users(id) ON DELETE CASCADE,
  created_at TEXT NOT NULL,
  UNIQUE(blocker_id, blocked_id)
);

CREATE TABLE IF NOT EXISTS confirmations (
  id TEXT PRIMARY KEY,
  user_id TEXT NOT NULL REFERENCES users(id) ON DELETE CASCADE,
  token TEXT NOT NULL UNIQUE,
  expires_at TEXT NOT NULL
);

CREATE TABLE IF NOT EXISTS events (
  id TEXT PRIMARY KEY,
  type TEXT NOT NULL,
  title TEXT NOT NULL,
  description TEXT NOT NULL DEFAULT '',
  theme TEXT,
  questions TEXT NOT NULL DEFAULT '[]',
  reward INTEGER NOT NULL DEFAULT 0,
  participation_reward INTEGER NOT NULL DEFAULT 0,
  start_at TEXT NOT NULL,
  end_at TEXT NOT NULL,
  active INTEGER NOT NULL DEFAULT 1,
  finalized INTEGER NOT NULL DEFAULT 0,
  winner_id TEXT,
  created_at TEXT NOT NULL
);

CREATE TABLE IF NOT EXISTS event_submissions (
  id TEXT PRIMARY KEY,
  event_id TEXT NOT NULL REFERENCES events(id) ON DELETE CASCADE,
  user_id TEXT NOT NULL REFERENCES users(id) ON DELETE CASCADE,
  drawing_url TEXT,
  answers TEXT,
  score INTEGER,
  created_at TEXT NOT NULL,
  UNIQUE(event_id, user_id)
);

CREATE TABLE IF NOT EXISTS notifications (
  id TEXT PRIMARY KEY,
  user_id TEXT NOT NULL REFERENCES users(id) ON DELETE CASCADE,
  type TEXT NOT NULL,
  actor_user_id TEXT NOT NULL REFERENCES users(id) ON DELETE CASCADE,
  text TEXT,
  created_at TEXT NOT NULL
);
CREATE INDEX IF NOT EXISTS idx_notifications_user ON notifications(user_id);

CREATE TABLE IF NOT EXISTS settings (
  key TEXT PRIMARY KEY,
  value TEXT NOT NULL
);
`);

// Default settings row for the censor toggle.
const censorRow = db.prepare("SELECT value FROM settings WHERE key = 'censorEnabled'").get();
if (!censorRow) {
  db.prepare("INSERT INTO settings (key, value) VALUES ('censorEnabled', '1')").run();
}

module.exports = db;
