import bcrypt from "bcryptjs";
import { censorText } from "./censor";
import type {
  AdminSettings,
  AppEvent,
  Channel,
  ChannelPost,
  CommentItem,
  EventSubmission,
  Follow,
  Like,
  NewUserInput,
  Post,
  Session,
  User,
  WordWarQuestion,
  FriendRequest,
  Message,
  VerificationRequest,
  Report,
  Ban,
  VideoPost,
  UserBlock,
} from "./types";

/**
 * Browser-local data layer for the IDEL prototype.
 *
 * Everything lives in localStorage (namespace "idel.v2.") so the whole app is
 * functional without a server: users, posts, comments, likes, follows,
 * channels, events and admin settings. The only account that exists on first
 * run is the admin account.
 *
 * NOTE: this is a prototype — data is not shared between browsers and does not
 * exist server-side. Passwords are hashed locally with bcrypt, but real
 * security requires a server backend.
 */

const NS = "idel.v2.";
const KEYS = {
  users: `${NS}users`,
  posts: `${NS}posts`,
  comments: `${NS}comments`,
  likes: `${NS}likes`,
  follows: `${NS}follows`,
  channels: `${NS}channels`,
  channelPosts: `${NS}channelPosts`,
  events: `${NS}events`,
  submissions: `${NS}eventSubmissions`,
  adminSettings: `${NS}adminSettings`,
  session: `${NS}session`,
  initialized: `${NS}initialized`,
  friendRequests: `${NS}friendRequests`,
  messages: `${NS}messages`,
  verificationRequests: `${NS}verificationRequests`,
  reports: `${NS}reports`,
  bans: `${NS}bans`,
  videoPosts: `${NS}videoPosts`,
  blocks: `${NS}blocks`,
} as const;

export const ADMIN_USERNAME = "drobovikov";
export const VERIFY_BOT_USERNAME = "verifybot";

/** Usernames: letters (latin or cyrillic), digits, underscore. 3–20 chars. */
export const USERNAME_RE = /^[a-zа-яё0-9_]{3,20}$/i;

/** Usernames that are not allowed (country names and similar). */
export const BLOCKED_USERNAMES: string[] = [
  "россия", "рф", "russia", "сша", "usa", "украина", "ukraine", "беларусь",
  "belarus", "казахстан", "kazakhstan", "германия", "germany", "франция",
  "france", "англия", "england", "великобритания", "unitedkingdom", "uk",
  "япония", "japan", "китай", "china", "индия", "india", "бразилия", "brazil",
  "испания", "spain", "италия", "italy", "польша", "poland", "латвия",
  "latvia", "литва", "lithuania", "эстония", "estonia", "грузия", "georgia",
  "армения", "armenia", "азербайджан", "azerbaijan", "турция", "turkey",
  "израиль", "israel", "египет", "egypt", "канада", "canada", "мексика",
  "mexico", "австралия", "australia", "швейцария", "switzerland", "швеция",
  "sweden", "норвегия", "norway", "финляндия", "finland", "нидерланды",
  "netherlands", "бельгия", "belgium", "австрия", "austria", "чехия",
  "czechia", "сербия", "serbia", "болгария", "bulgaria", "румыния",
  "romania", "венгрия", "hungary", "греция", "greece", "португалия",
  "portugal", "ирландия", "ireland", "дания", "denmark", "кипр", "cyprus",
  "исландия", "iceland", "монголия", "mongolia", "корея", "korea",
  "таиланд", "thailand", "вьетнам", "vietnam", "индонезия", "indonesia",
  "иран", "iran", "ирак", "iraq", "пакистан", "pakistan", "афганистан",
  "afghanistan", "аргентина", "argentina", "чили", "chile", "колумбия",
  "colombia", "перу", "peru",
];

// ===== ИСПРАВЛЕННАЯ ФУНКЦИЯ uid (работает даже по HTTP) =====
export const uid = () => {
  // Пытаемся использовать нативный метод
  if (typeof crypto !== 'undefined' && typeof crypto.randomUUID === 'function') {
    return crypto.randomUUID();
  }
  // Запасной вариант: генерируем UUID вручную через getRandomValues
  const randomValues = (arr: Uint8Array) => {
    if (typeof crypto !== 'undefined' && typeof crypto.getRandomValues === 'function') {
      return crypto.getRandomValues(arr);
    }
    // Самый простой fallback, если нет даже getRandomValues
    for (let i = 0; i < arr.length; i++) {
      arr[i] = Math.floor(Math.random() * 256);
    }
    return arr;
  };
  
  const rnds = randomValues(new Uint8Array(16));
  rnds[6] = (rnds[6] & 0x0f) | 0x40; // Версия 4
  rnds[8] = (rnds[8] & 0x3f) | 0x80; // Вариант
  return 'xxxxxxxx-xxxx-4xxx-yxxx-xxxxxxxxxxxx'.replace(/[xy]/g, (c) => {
    const r = rnds[Math.floor(Math.random() * 16)] & 0xf;
    const v = c === 'x' ? r : (r & 0x3) | 0x8;
    return v.toString(16);
  });
};

function read<T>(key: string, fallback: T): T {
  try {
    const raw = localStorage.getItem(key);
    return raw ? (JSON.parse(raw) as T) : fallback;
  } catch {
    return fallback;
  }
}

function write<T>(key: string, value: T) {
  localStorage.setItem(key, JSON.stringify(value));
}

// ---------------------------------------------------------------------------
// Init: the only account on first run is the admin.
// ---------------------------------------------------------------------------

export function ensureInit(): void {
  ensureVerifyBot();
  if (read<boolean>(KEYS.initialized, false)) return;
  const users = getUsers();
  if (!users.some((u) => u.username.toLowerCase() === ADMIN_USERNAME)) {
    const admin: User = {
      id: uid(),
      username: ADMIN_USERNAME,
      fullName: "Администратор",
      bio: "",
      passwordHash: bcrypt.hashSync("iDrobo13*5448I", 10),
      avatarUrl: null,
      coverUrl: null,
      isAdmin: true,
      verified: true,
      aktiviki: 0,
      createdAt: new Date().toISOString(),
    };
    write(KEYS.users, [...users, admin]);
  }
  write(KEYS.initialized, true);
}

/**
 * Makes sure the @verifybot account exists. Runs on every boot (not gated by
 * the one-time `initialized` flag) so accounts created before this feature
 * shipped still get the bot the first time they reload the app.
 */
function ensureVerifyBot(): void {
  const users = getUsers();
  if (users.some((u) => u.username.toLowerCase() === VERIFY_BOT_USERNAME)) return;
  const bot: User = {
    id: uid(),
    username: VERIFY_BOT_USERNAME,
    fullName: "VerifyBot",
    bio: "Бот верификации ИДЕЛЬ. Напишите мне, чтобы подать заявку на верификацию аккаунта.",
    passwordHash: bcrypt.hashSync(uid(), 10),
    avatarUrl: null,
    coverUrl: null,
    isAdmin: false,
    verified: true,
    isBot: true,
    aktiviki: 0,
    createdAt: new Date().toISOString(),
  };
  write(KEYS.users, [...users, bot]);
}

export function getVerifyBotUser(): User {
  const bot = getUsers().find((u) => u.username.toLowerCase() === VERIFY_BOT_USERNAME);
  if (!bot) throw new Error("@verifybot не инициализирован");
  return bot;
}

// ---------------------------------------------------------------------------
// Admin settings / censor
// ---------------------------------------------------------------------------

const DEFAULT_ADMIN_SETTINGS: AdminSettings = { censorEnabled: true };

export function getAdminSettings(): AdminSettings {
  return read<AdminSettings>(KEYS.adminSettings, DEFAULT_ADMIN_SETTINGS);
}

export function isCensorEnabled(): boolean {
  return getAdminSettings().censorEnabled;
}

export function setCensorEnabled(enabled: boolean) {
  write(KEYS.adminSettings, { ...getAdminSettings(), censorEnabled: enabled });
}

/** Applies the profanity filter only when the admin has it enabled. */
function applyCensor(input: string): { text: string; changed: boolean } {
  return isCensorEnabled()
    ? censorText(input)
    : { text: input, changed: false };
}

// ---------------------------------------------------------------------------
// Users / auth
// ---------------------------------------------------------------------------

export function getUsers(): User[] {
  return read<User[]>(KEYS.users, []);
}

export function getUserById(id: string): User | undefined {
  return getUsers().find((u) => u.id === id);
}

export function getUserByUsername(username: string): User | undefined {
  const needle = username.trim().replace(/^@/, "").toLowerCase();
  return getUsers().find((u) => u.username.toLowerCase() === needle);
}

export function usernameExists(username: string): boolean {
  return getUserByUsername(username) !== undefined;
}

export function createUser(input: NewUserInput): User {
  const users = getUsers();
  const user: User = {
    id: uid(),
    username: input.username.trim().toLowerCase(),
    fullName: input.fullName.trim(),
    bio: input.bio.trim(),
    passwordHash: bcrypt.hashSync(input.password, 10),
    avatarUrl: input.avatarUrl,
    coverUrl: input.coverUrl,
    isAdmin: false,
    verified: false,
    aktiviki: 0,
    createdAt: new Date().toISOString(),
  };
  write(KEYS.users, [...users, user]);
  return user;
}

export function updateProfile(
  id: string,
  patch: {
    fullName?: string;
    bio?: string;
    avatarUrl?: string | null;
    coverUrl?: string | null;
  },
): User {
  const users = getUsers();
  const next = users.map((u) => (u.id === id ? { ...u, ...patch } : u));
  write(KEYS.users, next);
  const updated = next.find((u) => u.id === id);
  if (!updated) throw new Error("User not found");
  return updated;
}

/**
 * Changes a user's @username. Validates the format, the country-name
 * blocklist and uniqueness before writing.
 */
export function changeUsername(id: string, newUsername: string): User {
  const username = newUsername.trim().toLowerCase();
  if (!USERNAME_RE.test(username)) {
    throw new Error("Недопустимый username");
  }
  if (BLOCKED_USERNAMES.includes(username)) {
    throw new Error("Этот username запрещён");
  }
  const users = getUsers();
  const current = users.find((u) => u.id === id);
  if (!current) throw new Error("Пользователь не найден");
  if (
    current.username.toLowerCase() !== username &&
    users.some((u) => u.username.toLowerCase() === username)
  ) {
    throw new Error("Username уже занят");
  }
  const next = users.map((u) => (u.id === id ? { ...u, username } : u));
  write(KEYS.users, next);
  const updated = next.find((u) => u.id === id);
  if (!updated) throw new Error("Пользователь не найден");
  return updated;
}

/**
 * Permanently deletes a user account and every record that references it:
 * posts/comments/likes, follows, channels they own, channel posts, friend
 * requests, messages, verification requests, reports, bans and blocks.
 */
export function deleteAccount(id: string): void {
  // Posts (and their comments/likes) authored by this user.
  for (const post of getPostsByUser(id)) {
    deletePost(post.id);
  }
  // Comments this user left on other people's posts.
  write(
    KEYS.comments,
    read<CommentItem[]>(KEYS.comments, []).filter((c) => c.userId !== id),
  );
  // Likes this user gave.
  write(
    KEYS.likes,
    read<Like[]>(KEYS.likes, []).filter((l) => l.userId !== id),
  );
  // Follow relationships in either direction.
  write(
    KEYS.follows,
    read<Follow[]>(KEYS.follows, []).filter(
      (f) => f.followerId !== id && f.followingId !== id,
    ),
  );
  // Channels owned by this user (and their posts).
  const ownedChannels = read<Channel[]>(KEYS.channels, []).filter(
    (c) => c.ownerId === id,
  );
  const ownedChannelIds = new Set(ownedChannels.map((c) => c.id));
  write(
    KEYS.channels,
    read<Channel[]>(KEYS.channels, []).filter((c) => c.ownerId !== id),
  );
  write(
    KEYS.channelPosts,
    read<ChannelPost[]>(KEYS.channelPosts, []).filter(
      (cp) => !ownedChannelIds.has(cp.channelId) && cp.userId !== id,
    ),
  );
  // Friend requests, messages, verification requests, reports, bans, blocks.
  write(
    KEYS.friendRequests,
    read<FriendRequest[]>(KEYS.friendRequests, []).filter(
      (r) => r.fromUserId !== id && r.toUserId !== id,
    ),
  );
  write(
    KEYS.messages,
    read<Message[]>(KEYS.messages, []).filter(
      (m) => m.fromUserId !== id && m.toUserId !== id,
    ),
  );
  write(
    KEYS.verificationRequests,
    read<VerificationRequest[]>(KEYS.verificationRequests, []).filter(
      (r) => r.userId !== id,
    ),
  );
  write(
    KEYS.reports,
    read<Report[]>(KEYS.reports, []).filter(
      (r) => r.reporterUserId !== id && r.reportedUserId !== id,
    ),
  );
  write(
    KEYS.bans,
    read<Ban[]>(KEYS.bans, []).filter((b) => b.userId !== id),
  );
  write(
    KEYS.blocks,
    read<UserBlock[]>(KEYS.blocks, []).filter(
      (b) => b.blockerId !== id && b.blockedId !== id,
    ),
  );
  // Finally, the account itself and its session.
  write(KEYS.users, getUsers().filter((u) => u.id !== id));
  const session = getSession();
  if (session?.userId === id) setSession(null);
}

export function setVerified(id: string, verified: boolean): User {
  const users = getUsers();
  const next = users.map((u) => (u.id === id ? { ...u, verified } : u));
  write(KEYS.users, next);
  const updated = next.find((u) => u.id === id);
  if (!updated) throw new Error("User not found");
  return updated;
}

export function addAktiviki(id: string, amount: number) {
  const users = getUsers();
  write(
    KEYS.users,
    users.map((u) => (u.id === id ? { ...u, aktiviki: u.aktiviki + amount } : u)),
  );
}

export function verifyCredentials(
  username: string,
  password: string,
): User | undefined {
  const user = getUserByUsername(username);
  if (!user) return undefined;
  return bcrypt.compareSync(password, user.passwordHash) ? user : undefined;
}

// ---------------------------------------------------------------------------
// Session
// ---------------------------------------------------------------------------

export function getSession(): Session | null {
  return read<Session | null>(KEYS.session, null);
}

export function setSession(userId: string | null) {
  if (userId) {
    write(KEYS.session, { userId });
  } else {
    localStorage.removeItem(KEYS.session);
  }
}

// ---------------------------------------------------------------------------
// Posts
// ---------------------------------------------------------------------------

export function getPosts(): Post[] {
  return read<Post[]>(KEYS.posts, []).sort(
    (a, b) => +new Date(b.createdAt) - +new Date(a.createdAt),
  );
}

export function getPostsByUser(userId: string): Post[] {
  return getPosts().filter((p) => p.userId === userId);
}

export function createPost(input: {
  userId: string;
  content: string;
  imageUrl: string | null;
  drawingUrl: string | null;
}): Post {
  const posts = read<Post[]>(KEYS.posts, []);
  const { text, changed } = applyCensor(input.content);
  const post: Post = {
    id: uid(),
    userId: input.userId,
    content: text.trim(),
    imageUrl: input.imageUrl,
    drawingUrl: input.drawingUrl,
    censored: changed,
    createdAt: new Date().toISOString(),
  };
  write(KEYS.posts, [post, ...posts]);
  return post;
}

export function deletePost(id: string) {
  write(
    KEYS.posts,
    read<Post[]>(KEYS.posts, []).filter((p) => p.id !== id),
  );
  write(
    KEYS.comments,
    read<CommentItem[]>(KEYS.comments, []).filter((c) => c.postId !== id),
  );
  write(
    KEYS.likes,
    read<Like[]>(KEYS.likes, []).filter((l) => l.postId !== id),
  );
}

// ---------------------------------------------------------------------------
// Comments
// ---------------------------------------------------------------------------

export function getComments(postId: string): CommentItem[] {
  return read<CommentItem[]>(KEYS.comments, [])
    .filter((c) => c.postId === postId)
    .sort((a, b) => +new Date(a.createdAt) - +new Date(b.createdAt));
}

export function createComment(input: {
  postId: string;
  userId: string;
  content: string | null;
  voiceUrl: string | null;
  duration: number | null;
}): CommentItem {
  const comments = read<CommentItem[]>(KEYS.comments, []);
  const { text, changed } = applyCensor(input.content ?? "");
  const comment: CommentItem = {
    id: uid(),
    postId: input.postId,
    userId: input.userId,
    content: text.trim() || null,
    voiceUrl: input.voiceUrl,
    duration: input.duration,
    censored: changed,
    createdAt: new Date().toISOString(),
  };
  write(KEYS.comments, [...comments, comment]);
  return comment;
}

export function deleteComment(id: string) {
  write(
    KEYS.comments,
    read<CommentItem[]>(KEYS.comments, []).filter((c) => c.id !== id),
  );
}

export function getCommentCount(): number {
  return read<CommentItem[]>(KEYS.comments, []).length;
}

// ---------------------------------------------------------------------------
// Likes
// ---------------------------------------------------------------------------

export function getLikeCount(postId: string): number {
  return read<Like[]>(KEYS.likes, []).filter((l) => l.postId === postId).length;
}

export function hasLiked(postId: string, userId: string): boolean {
  return read<Like[]>(KEYS.likes, []).some(
    (l) => l.postId === postId && l.userId === userId,
  );
}

/** Toggles a like; returns true if the post is now liked. */
export function toggleLike(postId: string, userId: string): boolean {
  const likes = read<Like[]>(KEYS.likes, []);
  const existing = likes.find(
    (l) => l.postId === postId && l.userId === userId,
  );
  const next = existing
    ? likes.filter((l) => l !== existing)
    : [...likes, { postId: postId, userId: userId }];
  write(KEYS.likes, next);
  return !existing;
}

// ---------------------------------------------------------------------------
// Follows
// ---------------------------------------------------------------------------

export function isFollowing(followerId: string, followingId: string): boolean {
  return read<Follow[]>(KEYS.follows, []).some(
    (f) => f.followerId === followerId && f.followingId === followingId,
  );
}

/** Toggles a follow; returns true if now following. */
export function toggleFollow(followerId: string, followingId: string): boolean {
  if (followerId === followingId) return true;
  const follows = read<Follow[]>(KEYS.follows, []);
  const existing = follows.find(
    (f) => f.followerId === followerId && f.followingId === followingId,
  );
  const next = existing
    ? follows.filter((f) => f !== existing)
    : [...follows, { followerId, followingId }];
  write(KEYS.follows, next);
  return !existing;
}

export function getFollowerCount(userId: string): number {
  return read<Follow[]>(KEYS.follows, []).filter(
    (f) => f.followingId === userId,
  ).length;
}

export function getFollowingCount(userId: string): number {
  return read<Follow[]>(KEYS.follows, []).filter(
    (f) => f.followerId === userId,
  ).length;
}

/** Popularity points for a user: followers + likes received on their posts. */
export function getUserPoints(userId: string): number {
  const likes = read<Like[]>(KEYS.likes, []);
  const likesReceived = likes.filter(
    (l) => getPostById(l.postId)?.userId === userId,
  ).length;
  return getFollowerCount(userId) + likesReceived;
}

export function getPostById(id: string): Post | undefined {
  return read<Post[]>(KEYS.posts, []).find((p) => p.id === id);
}

// ---------------------------------------------------------------------------
// Channels
// ---------------------------------------------------------------------------

export function getChannels(): Channel[] {
  return read<Channel[]>(KEYS.channels, []).sort(
    (a, b) => +new Date(b.createdAt) - +new Date(a.createdAt),
  );
}

export function getChannel(id: string): Channel | undefined {
  return read<Channel[]>(KEYS.channels, []).find((c) => c.id === id);
}

export function createChannel(input: {
  name: string;
  description: string;
  ownerId: string;
}): Channel {
  const channels = read<Channel[]>(KEYS.channels, []);
  const channel: Channel = {
    id: uid(),
    name: input.name.trim(),
    description: input.description.trim(),
    ownerId: input.ownerId,
    createdAt: new Date().toISOString(),
  };
  write(KEYS.channels, [...channels, channel]);
  return channel;
}

export function getChannelPosts(channelId: string): ChannelPost[] {
  return read<ChannelPost[]>(KEYS.channelPosts, [])
    .filter((p) => p.channelId === channelId)
    .sort((a, b) => +new Date(b.createdAt) - +new Date(a.createdAt));
}

export function createChannelPost(input: {
  channelId: string;
  userId: string;
  content: string;
  imageUrl: string | null;
  drawingUrl: string | null;
}): ChannelPost {
  const posts = read<ChannelPost[]>(KEYS.channelPosts, []);
  const { text, changed } = applyCensor(input.content);
  const post: ChannelPost = {
    id: uid(),
    channelId: input.channelId,
    userId: input.userId,
    content: text.trim(),
    imageUrl: input.imageUrl,
    drawingUrl: input.drawingUrl,
    censored: changed,
    createdAt: new Date().toISOString(),
  };
  write(KEYS.channelPosts, [...posts, post]);
  return post;
}

export function deleteChannelPost(id: string) {
  write(
    KEYS.channelPosts,
    read<ChannelPost[]>(KEYS.channelPosts, []).filter((p) => p.id !== id),
  );
}

// ---------------------------------------------------------------------------
// Events (admin-created competitions)
// ---------------------------------------------------------------------------

export function getEvents(): AppEvent[] {
  return read<AppEvent[]>(KEYS.events, []).sort(
    (a, b) => +new Date(b.createdAt) - +new Date(a.createdAt),
  );
}

export function getEvent(id: string): AppEvent | undefined {
  return read<AppEvent[]>(KEYS.events, []).find((e) => e.id === id);
}

export function createEvent(input: Omit<AppEvent, "id" | "createdAt" | "finalized" | "winnerId">): AppEvent {
  const events = read<AppEvent[]>(KEYS.events, []);
  const event: AppEvent = {
    ...input,
    id: uid(),
    finalized: false,
    winnerId: null,
    createdAt: new Date().toISOString(),
  };
  write(KEYS.events, [...events, event]);
  return event;
}

export function setEventActive(id: string, active: boolean) {
  write(
    KEYS.events,
    read<AppEvent[]>(KEYS.events, []).map((e) =>
      e.id === id ? { ...e, active } : e,
    ),
  );
}

export function deleteEvent(id: string) {
  write(
    KEYS.events,
    read<AppEvent[]>(KEYS.events, []).filter((e) => e.id !== id),
  );
  write(
    KEYS.submissions,
    read<EventSubmission[]>(KEYS.submissions, []).filter((s) => s.eventId !== id),
  );
}

export function getSubmissions(eventId: string): EventSubmission[] {
  return read<EventSubmission[]>(KEYS.submissions, []).filter(
    (s) => s.eventId === eventId,
  );
}

export function getSubmission(eventId: string, userId: string) {
  return read<EventSubmission[]>(KEYS.submissions, []).find(
    (s) => s.eventId === eventId && s.userId === userId,
  );
}

export function submitPixelWar(eventId: string, userId: string, drawingUrl: string): EventSubmission {
  const submissions = read<EventSubmission[]>(KEYS.submissions, []);
  const existing = submissions.find((s) => s.eventId === eventId && s.userId === userId);
  const submission: EventSubmission = {
    id: existing?.id ?? uid(),
    eventId,
    userId,
    drawingUrl,
    answers: null,
    score: null,
    createdAt: existing?.createdAt ?? new Date().toISOString(),
  };
  write(
    KEYS.submissions,
    existing
      ? submissions.map((s) => (s.id === existing.id ? submission : s))
      : [...submissions, submission],
  );
  return submission;
}

export function submitWordWar(
  eventId: string,
  userId: string,
  answers: number[],
): EventSubmission {
  const event = getEvent(eventId);
  const submissions = read<EventSubmission[]>(KEYS.submissions, []);
  const existing = submissions.find((s) => s.eventId === eventId && s.userId === userId);
  const score = event
    ? event.questions.reduce(
        (acc, q, i) => acc + (answers[i] === q.correctIndex ? 1 : 0),
        0,
      )
    : 0;
  const submission: EventSubmission = {
    id: existing?.id ?? uid(),
    eventId,
    userId,
    drawingUrl: null,
    answers,
    score,
    createdAt: existing?.createdAt ?? new Date().toISOString(),
  };
  write(
    KEYS.submissions,
    existing
      ? submissions.map((s) => (s.id === existing.id ? submission : s))
      : [...submissions, submission],
  );
  return submission;
}

export function setEventWinner(eventId: string, winnerId: string) {
  write(
    KEYS.events,
    read<AppEvent[]>(KEYS.events, []).map((e) =>
      e.id === eventId ? { ...e, winnerId } : e,
    ),
  );
}

/** Awards prizes (Aktiviki) and marks the event as finalized. Idempotent. */
export function finalizeEvent(eventId: string): AppEvent | undefined {
  const events = read<AppEvent[]>(KEYS.events, []);
  const event = events.find((e) => e.id === eventId);
  if (!event || event.finalized) return event;

  const submissions = getSubmissions(eventId);
  let winnerId: string | null = event.winnerId;

  if (event.type === "pixelwar") {
    // Winner is picked manually by the admin beforehand.
    if (winnerId) {
      addAktiviki(winnerId, event.reward);
      submissions
        .filter((s) => s.userId !== winnerId)
        .forEach((s) => addAktiviki(s.userId, event.participationReward));
    }
  } else if (event.type === "wordwar") {
    const ranked = [...submissions]
      .filter((s) => s.score !== null)
      .sort((a, b) => (b.score ?? 0) - (a.score ?? 0));
    if (ranked.length > 0) {
      winnerId = ranked[0].userId;
      addAktiviki(winnerId, event.reward);
      ranked
        .slice(1)
        .forEach((s) => addAktiviki(s.userId, event.participationReward));
    }
  } else {
    // popuwar: top 3 users by popularity points.
    const ranked = getUsers()
      .map((u) => ({ userId: u.id, points: getUserPoints(u.id) }))
      .filter((r) => r.points > 0)
      .sort((a, b) => b.points - a.points)
      .slice(0, 3);
    if (ranked.length > 0) {
      winnerId = ranked[0].userId;
      addAktiviki(winnerId, event.reward);
      ranked.slice(1).forEach((r) => addAktiviki(r.userId, event.participationReward));
    }
  }

  const next = events.map((e) =>
    e.id === eventId ? { ...e, finalized: true, winnerId } : e,
  );
  write(KEYS.events, next);
  return next.find((e) => e.id === eventId);
}

/** Shuffles 4 options and returns the index of the correct one in the new order. */
export function shuffleOptions(options: string[], correctIndex: number): WordWarQuestion {
  const indexed = options.map((option, i) => ({ option, i }));
  for (let i = indexed.length - 1; i > 0; i--) {
    const j = Math.floor(Math.random() * (i + 1));
    [indexed[i], indexed[j]] = [indexed[j], indexed[i]];
  }
  return {
    word: "",
    options: indexed.map((x) => x.option),
    correctIndex: indexed.findIndex((x) => x.i === correctIndex),
  };
}

// ================================================================
// НОВЫЕ ФУНКЦИИ (друзья, чаты, верификация, репорты, баны, видео, уведомления)
// ================================================================

// ---------- БЛОКИРОВКА ПОЛЬЗОВАТЕЛЕЙ ----------
/** Blocks `blockedId` on behalf of `blockerId`. Also removes any friendship/follow between them. */
export function blockUser(blockerId: string, blockedId: string): UserBlock {
  if (blockerId === blockedId) throw new Error("Нельзя заблокировать самого себя");
  const blocks = read<UserBlock[]>(KEYS.blocks, []);
  const existing = blocks.find(
    (b) => b.blockerId === blockerId && b.blockedId === blockedId,
  );
  if (existing) return existing;
  const block: UserBlock = {
    id: uid(),
    blockerId,
    blockedId,
    createdAt: new Date().toISOString(),
  };
  write(KEYS.blocks, [...blocks, block]);

  // A block also ends any follow or friendship between the two users.
  write(
    KEYS.follows,
    read<Follow[]>(KEYS.follows, []).filter(
      (f) =>
        !(
          (f.followerId === blockerId && f.followingId === blockedId) ||
          (f.followerId === blockedId && f.followingId === blockerId)
        ),
    ),
  );
  write(
    KEYS.friendRequests,
    read<FriendRequest[]>(KEYS.friendRequests, []).filter(
      (r) =>
        !(
          (r.fromUserId === blockerId && r.toUserId === blockedId) ||
          (r.fromUserId === blockedId && r.toUserId === blockerId)
        ),
    ),
  );
  return block;
}

export function unblockUser(blockerId: string, blockedId: string): void {
  write(
    KEYS.blocks,
    read<UserBlock[]>(KEYS.blocks, []).filter(
      (b) => !(b.blockerId === blockerId && b.blockedId === blockedId),
    ),
  );
}

/** True when `blockerId` has blocked `blockedId` (direction matters). */
export function isBlocked(blockerId: string, blockedId: string): boolean {
  return read<UserBlock[]>(KEYS.blocks, []).some(
    (b) => b.blockerId === blockerId && b.blockedId === blockedId,
  );
}

/** True when either user has blocked the other — used to hide interactions both ways. */
export function isBlockedEitherWay(userId: string, otherUserId: string): boolean {
  return read<UserBlock[]>(KEYS.blocks, []).some(
    (b) =>
      (b.blockerId === userId && b.blockedId === otherUserId) ||
      (b.blockerId === otherUserId && b.blockedId === userId),
  );
}

export function getBlockedUsers(blockerId: string): User[] {
  const ids = read<UserBlock[]>(KEYS.blocks, [])
    .filter((b) => b.blockerId === blockerId)
    .map((b) => b.blockedId);
  return getUsers().filter((u) => ids.includes(u.id));
}

// ---------- ДРУЗЬЯ ----------
export function getFriends(userId: string): User[] {
  const requests = read<FriendRequest[]>(KEYS.friendRequests, []);
  const accepted = requests.filter(r => 
    (r.fromUserId === userId || r.toUserId === userId) && r.status === 'accepted'
  );
  const friendIds = accepted.map(r => 
    r.fromUserId === userId ? r.toUserId : r.fromUserId
  );
  return getUsers().filter(u => friendIds.includes(u.id));
}

export function getPendingFriendRequests(userId: string): FriendRequest[] {
  return read<FriendRequest[]>(KEYS.friendRequests, [])
    .filter(r => r.toUserId === userId && r.status === 'pending');
}

export function sendFriendRequest(fromUserId: string, toUserId: string): FriendRequest {
  if (fromUserId === toUserId) throw new Error('Нельзя добавить себя');
  if (isBlockedEitherWay(fromUserId, toUserId)) throw new Error('Пользователь недоступен');
  const requests = read<FriendRequest[]>(KEYS.friendRequests, []);
  const existing = requests.find(r => 
    (r.fromUserId === fromUserId && r.toUserId === toUserId) ||
    (r.fromUserId === toUserId && r.toUserId === fromUserId)
  );
  if (existing) throw new Error('Заявка уже отправлена');
  const newRequest: FriendRequest = {
    id: uid(),
    fromUserId,
    toUserId,
    status: 'pending',
    createdAt: new Date().toISOString(),
  };
  requests.push(newRequest);
  write(KEYS.friendRequests, requests);
  return newRequest;
}

export function acceptFriendRequest(requestId: string): void {
  const requests = read<FriendRequest[]>(KEYS.friendRequests, []);
  const req = requests.find(r => r.id === requestId);
  if (!req) throw new Error('Заявка не найдена');
  req.status = 'accepted';
  write(KEYS.friendRequests, requests);
}

export function rejectFriendRequest(requestId: string): void {
  const requests = read<FriendRequest[]>(KEYS.friendRequests, []);
  const req = requests.find(r => r.id === requestId);
  if (!req) throw new Error('Заявка не найдена');
  req.status = 'rejected';
  write(KEYS.friendRequests, requests);
}

export function getFriendStatus(userId: string, otherUserId: string): 'none' | 'pending' | 'accepted' | 'rejected' {
  if (userId === otherUserId) return 'none';
  const requests = read<FriendRequest[]>(KEYS.friendRequests, []);
  const found = requests.find(r => 
    (r.fromUserId === userId && r.toUserId === otherUserId) ||
    (r.fromUserId === otherUserId && r.toUserId === userId)
  );
  if (!found) return 'none';
  return found.status;
}

// ---------- ЛИЧНЫЕ СООБЩЕНИЯ ----------
export function getChats(userId: string): User[] {
  const messages = read<Message[]>(KEYS.messages, []);
  const uniqueUserIds = new Set<string>();
  messages.forEach(m => {
    if (m.fromUserId === userId) uniqueUserIds.add(m.toUserId);
    else if (m.toUserId === userId) uniqueUserIds.add(m.fromUserId);
  });
  return getUsers().filter(u => uniqueUserIds.has(u.id));
}

export function getMessages(userId: string, otherUserId: string): Message[] {
  const chatId = [userId, otherUserId].sort().join('_');
  return read<Message[]>(KEYS.messages, [])
    .filter(m => m.chatId === chatId)
    .sort((a, b) => a.createdAt.localeCompare(b.createdAt));
}

export function sendMessage(fromUserId: string, toUserId: string, text: string): Message {
  if (isBlockedEitherWay(fromUserId, toUserId)) throw new Error('Пользователь недоступен');
  const chatId = [fromUserId, toUserId].sort().join('_');
  const messages = read<Message[]>(KEYS.messages, []);
  const newMsg: Message = {
    id: uid(),
    chatId,
    fromUserId,
    toUserId,
    text,
    read: false,
    createdAt: new Date().toISOString(),
  };
  messages.push(newMsg);

  // @verifybot answers automatically, right in the same conversation.
  const bot = getUsers().find((u) => u.id === toUserId && u.isBot);
  if (bot) {
    messages.push(buildBotReply(bot.id, fromUserId, text));
  }

  write(KEYS.messages, messages);
  return newMsg;
}

function buildBotReply(botId: string, userId: string, incomingText: string): Message {
  const chatId = [botId, userId].sort().join('_');
  return {
    id: uid(),
    chatId,
    fromUserId: botId,
    toUserId: userId,
    text: getBotReplyText(userId, incomingText),
    read: false,
    createdAt: new Date().toISOString(),
  };
}

/** Very small rule-based "algorithm" behind @verifybot's replies. */
function getBotReplyText(userId: string, incomingText: string): string {
  const user = getUserById(userId);
  const lower = incomingText.trim().toLowerCase();

  if (user?.verified) {
    return "Ваш аккаунт уже верифицирован ✅. Спасибо, что пользуетесь ИДЕЛЬ!";
  }

  const pending = read<VerificationRequest[]>(KEYS.verificationRequests, []).some(
    (r) => r.userId === userId && r.status === "pending",
  );
  if (pending) {
    return "Ваша заявка уже на рассмотрении у администрации. Я сообщу здесь, как только будет решение.";
  }

  const wantsVerification =
    /(верифи|verify|подтверд)/.test(lower) || lower === "/verify" || lower === "начать" || lower === "старт" || lower === "/start";

  if (wantsVerification) {
    submitVerificationRequest(userId);
    return "Заявка на верификацию отправлена ✅. Администрация рассмотрит её в ближайшее время, я напишу сюда о результате.";
  }

  return (
    "Привет! Я @verifybot — я подаю заявки на верификацию аккаунтов ИДЕЛЬ.\n\n" +
    "Напишите мне «верификация» (или /verify), чтобы отправить заявку."
  );
}

/**
 * Seeds the bot's welcome message the first time a user opens a chat with
 * it, so the conversation never starts on an empty screen.
 */
export function ensureBotWelcome(userId: string): void {
  const bot = getVerifyBotUser();
  const chatId = [bot.id, userId].sort().join('_');
  const messages = read<Message[]>(KEYS.messages, []);
  if (messages.some((m) => m.chatId === chatId)) return;
  messages.push({
    id: uid(),
    chatId,
    fromUserId: bot.id,
    toUserId: userId,
    text: getBotReplyText(userId, ""),
    read: false,
    createdAt: new Date().toISOString(),
  });
  write(KEYS.messages, messages);
}

// ---------- ВЕРИФИКАЦИЯ (@verify_bot) ----------
export function submitVerificationRequest(userId: string): VerificationRequest {
  const requests = read<VerificationRequest[]>(KEYS.verificationRequests, []);
  const existing = requests.find(r => r.userId === userId && r.status === 'pending');
  if (existing) throw new Error('Заявка уже отправлена');
  const newReq: VerificationRequest = {
    id: uid(),
    userId,
    status: 'pending',
    createdAt: new Date().toISOString(),
  };
  requests.push(newReq);
  write(KEYS.verificationRequests, requests);
  return newReq;
}

export function getVerificationRequests(): VerificationRequest[] {
  return read<VerificationRequest[]>(KEYS.verificationRequests, []);
}

export function processVerificationRequest(requestId: string, approve: boolean): void {
  const requests = read<VerificationRequest[]>(KEYS.verificationRequests, []);
  const req = requests.find(r => r.id === requestId);
  if (!req) throw new Error('Заявка не найдена');
  req.status = approve ? 'approved' : 'rejected';
  write(KEYS.verificationRequests, requests);
  if (approve) {
    const users = getUsers();
    const user = users.find(u => u.id === req.userId);
    if (user) {
      user.verified = true;
      write(KEYS.users, users);
    }
  }
}

// ---------- РЕПОРТЫ ----------
export function submitReport(reporterUserId: string, reportedUserId: string, reason: string): Report {
  const reports = read<Report[]>(KEYS.reports, []);
  const newReport: Report = {
    id: uid(),
    reporterUserId,
    reportedUserId,
    reason,
    status: 'pending',
    createdAt: new Date().toISOString(),
  };
  reports.push(newReport);
  write(KEYS.reports, reports);
  return newReport;
}

export function getReports(): Report[] {
  return read<Report[]>(KEYS.reports, []);
}

export function resolveReport(reportId: string, action: 'resolve' | 'dismiss'): void {
  const reports = read<Report[]>(KEYS.reports, []);
  const report = reports.find(r => r.id === reportId);
  if (!report) throw new Error('Репорт не найден');
  report.status = action === 'resolve' ? 'resolved' : 'dismissed';
  write(KEYS.reports, reports);
}

// ---------- БАНЫ ----------
export function banUser(userId: string, reason: string, adminId: string): void {
  const bans = read<Ban[]>(KEYS.bans, []);
  if (bans.some(b => b.userId === userId)) throw new Error('Пользователь уже забанен');
  bans.push({
    userId,
    reason,
    bannedBy: adminId,
    createdAt: new Date().toISOString(),
  });
  write(KEYS.bans, bans);
}

export function unbanUser(userId: string): void {
  let bans = read<Ban[]>(KEYS.bans, []);
  bans = bans.filter(b => b.userId !== userId);
  write(KEYS.bans, bans);
}

export function isUserBanned(userId: string): boolean {
  return read<Ban[]>(KEYS.bans, []).some(b => b.userId === userId);
}

export function getBans(): Ban[] {
  return read<Ban[]>(KEYS.bans, []);
}

export function getBanReason(userId: string): string | null {
  const ban = read<Ban[]>(KEYS.bans, []).find(b => b.userId === userId);
  return ban ? ban.reason : null;
}

// ---------- ВИДЕО (привязка к посту) ----------
export function addVideoToPost(postId: string, videoUrl: string, thumbnailUrl?: string, duration?: number): VideoPost {
  const videos = read<VideoPost[]>(KEYS.videoPosts, []);
  const newVideo: VideoPost = {
    id: uid(),
    postId,
    videoUrl,
    thumbnailUrl,
    duration,
  };
  videos.push(newVideo);
  write(KEYS.videoPosts, videos);
  return newVideo;
}

export function getVideoForPost(postId: string): VideoPost | undefined {
  return read<VideoPost[]>(KEYS.videoPosts, []).find(v => v.postId === postId);
}

// ---------- УВЕДОМЛЕНИЯ ----------
export type NotificationEvent = {
  id: string;
  type: 'like' | 'comment' | 'follow' | 'friend_request';
  userId: string;
  targetUserId: string;
  postId?: string;
  commentId?: string;
  text?: string;
  createdAt: string;
};

export function getNotifications(userId: string): NotificationEvent[] {
  const events: NotificationEvent[] = [];

  // 1. Лайки на посты пользователя
  const likes = read<Like[]>(KEYS.likes, []);
  const posts = getPostsByUser(userId);
  const postIds = posts.map(p => p.id);
  likes.forEach(like => {
    if (postIds.includes(like.postId) && like.userId !== userId) {
      // У лайков нет даты, используем дату поста или текущую
      const post = getPostById(like.postId);
      events.push({
        id: `like_${like.postId}_${like.userId}`,
        type: 'like',
        userId: like.userId,
        targetUserId: userId,
        postId: like.postId,
        createdAt: post?.createdAt || new Date().toISOString(),
      });
    }
  });

  // 2. Комментарии к постам пользователя
  const comments = read<CommentItem[]>(KEYS.comments, []);
  comments.forEach(comment => {
    if (postIds.includes(comment.postId) && comment.userId !== userId) {
      events.push({
        id: `comment_${comment.id}`,
        type: 'comment',
        userId: comment.userId,
        targetUserId: userId,
        postId: comment.postId,
        commentId: comment.id,
        text: comment.content || undefined,
        createdAt: comment.createdAt,
      });
    }
  });

  // 3. Подписки
  const follows = read<Follow[]>(KEYS.follows, []);
  follows.forEach(follow => {
    if (follow.followingId === userId && follow.followerId !== userId) {
      events.push({
        id: `follow_${follow.followerId}_${follow.followingId}`,
        type: 'follow',
        userId: follow.followerId,
        targetUserId: userId,
        createdAt: new Date().toISOString(), // у follows нет даты
      });
    }
  });

  // 4. Заявки в друзья
  const friendRequests = read<FriendRequest[]>(KEYS.friendRequests, []);
  friendRequests.forEach(req => {
    if (req.toUserId === userId && req.status === 'pending' && req.fromUserId !== userId) {
      events.push({
        id: `friend_${req.id}`,
        type: 'friend_request',
        userId: req.fromUserId,
        targetUserId: userId,
        createdAt: req.createdAt,
      });
    }
  });

  // Сортируем по времени (новые сверху)
  events.sort((a, b) => b.createdAt.localeCompare(a.createdAt));
  // Убираем дубликаты
  const unique = events.filter((v, i, a) => a.findIndex(t => t.id === v.id) === i);
  return unique.slice(0, 50);
}