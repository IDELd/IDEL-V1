import type {
  User,
  Post,
  CommentItem,
  Channel,
  ChannelPost,
  FriendRequest,
  FriendStatus,
  Message,
  VerificationRequest,
  Report,
  Ban,
  AppEvent,
  EventSubmission,
} from "./types";

const API_BASE = (import.meta.env.VITE_API_URL as string | undefined) || "http://localhost:5001";
const TOKEN_KEY = "idel_token";

export function getToken(): string | null {
  return localStorage.getItem(TOKEN_KEY);
}

function setToken(token: string | null) {
  if (token) localStorage.setItem(TOKEN_KEY, token);
  else localStorage.removeItem(TOKEN_KEY);
}

class ApiError extends Error {}

async function request<T>(path: string, options: RequestInit = {}): Promise<T> {
  const token = getToken();
  const isFormData = options.body instanceof FormData;
  const headers: Record<string, string> = {
    ...(isFormData ? {} : { "Content-Type": "application/json" }),
    ...(options.headers as Record<string, string> | undefined),
  };
  if (token) headers.Authorization = `Bearer ${token}`;

  const res = await fetch(`${API_BASE}${path}`, { ...options, headers });
  const data = await res.json().catch(() => ({}));
  if (!res.ok) {
    throw new ApiError(data?.error || `Ошибка запроса (${res.status})`);
  }
  return data as T;
}

const get = <T>(path: string) => request<T>(path);
const post = <T>(path: string, body?: unknown) =>
  request<T>(path, { method: "POST", body: body !== undefined ? JSON.stringify(body) : undefined });
const put = <T>(path: string, body?: unknown) =>
  request<T>(path, { method: "PUT", body: body !== undefined ? JSON.stringify(body) : undefined });
const del = <T>(path: string) => request<T>(path, { method: "DELETE" });

async function uploadFile(path: string, file: File): Promise<{ url: string }> {
  const formData = new FormData();
  formData.append("file", file);
  return request<{ url: string }>(path, { method: "POST", body: formData });
}

// ---------- AUTH ----------
export interface RegisterInput {
  username: string;
  password: string;
  fullName: string;
  bio: string;
  avatarUrl: string | null;
  coverUrl: string | null;
  email?: string;
}

export async function register(input: RegisterInput): Promise<User> {
  const { token, user } = await post<{ token: string; user: User }>("/api/auth/register", input);
  setToken(token);
  invalidateUsersCache();
  return user;
}

export async function login(username: string, password: string): Promise<User> {
  const { token, user } = await post<{ token: string; user: User }>("/api/auth/login", {
    username,
    password,
  });
  setToken(token);
  return user;
}

export function logout() {
  setToken(null);
}

export async function getMe(): Promise<User | null> {
  if (!getToken()) return null;
  try {
    const { user } = await get<{ user: User }>("/api/auth/me");
    return user;
  } catch {
    setToken(null);
    return null;
  }
}

export async function confirmEmail(token: string): Promise<void> {
  await get(`/api/auth/confirm?token=${encodeURIComponent(token)}`);
}

// ---------- USERS ----------
let usersCache: User[] | null = null;
let usersCachePromise: Promise<User[]> | null = null;

export function invalidateUsersCache() {
  usersCache = null;
  usersCachePromise = null;
}

/** Cached version of getUsers() for call sites that need many cheap lookups (e.g. post authors). */
export async function getUsersCached(): Promise<User[]> {
  if (usersCache) return usersCache;
  if (!usersCachePromise) {
    usersCachePromise = getUsers().then((u) => {
      usersCache = u;
      return u;
    });
  }
  return usersCachePromise;
}

export async function getUserById(id: string): Promise<User | undefined> {
  const users = await getUsersCached();
  return users.find((u) => u.id === id);
}

export async function getUsers(): Promise<User[]> {
  const { users } = await get<{ users: User[] }>("/api/users");
  return users;
}

export async function getUserByUsername(username: string): Promise<User | null> {
  try {
    const { user } = await get<{ user: User }>(`/api/users/${encodeURIComponent(username)}`);
    return user;
  } catch {
    return null;
  }
}

export async function updateProfile(input: {
  fullName?: string;
  bio?: string;
  avatarUrl?: string | null;
  coverUrl?: string | null;
}): Promise<User> {
  const { user } = await put<{ user: User }>("/api/users/profile", input);
  invalidateUsersCache();
  return user;
}

export async function changeUsername(username: string): Promise<User> {
  const { user } = await put<{ user: User }>("/api/users/username", { username });
  invalidateUsersCache();
  return user;
}

export async function setUserVerified(userId: string, verified: boolean): Promise<User> {
  const { user } = await put<{ user: User }>(`/api/users/${userId}/verified`, { verified });
  invalidateUsersCache();
  return user;
}

export async function deleteAccount(): Promise<void> {
  await del("/api/users/account");
  invalidateUsersCache();
  setToken(null);
}

export const uploadAvatar = (file: File) => uploadFile("/api/users/avatar", file);
export const uploadCover = (file: File) => uploadFile("/api/users/cover", file);

// ---------- POSTS ----------
export async function getPosts(): Promise<Post[]> {
  const { posts } = await get<{ posts: Post[] }>("/api/posts");
  return posts;
}

export async function getPostsByUser(userId: string): Promise<Post[]> {
  const { posts } = await get<{ posts: Post[] }>(`/api/posts/user/${userId}`);
  return posts;
}

export interface CreatePostInput {
  content: string;
  imageUrl?: string | null;
  drawingUrl?: string | null;
  videoUrl?: string | null;
  videoThumbnailUrl?: string | null;
  videoDuration?: number | null;
}

export async function createPost(input: CreatePostInput): Promise<Post> {
  const { post: created } = await post<{ post: Post }>("/api/posts", input);
  return created;
}

export async function deletePost(id: string): Promise<void> {
  await del(`/api/posts/${id}`);
}

export const uploadPostImage = (file: File) => uploadFile("/api/posts/upload/image", file);
export const uploadPostVideo = (file: File) => uploadFile("/api/posts/upload/video", file);

// ---------- COMMENTS ----------
export async function getComments(postId: string): Promise<CommentItem[]> {
  const { comments } = await get<{ comments: CommentItem[] }>(`/api/comments/post/${postId}`);
  return comments;
}

export async function createComment(input: {
  postId: string;
  content?: string | null;
  voiceUrl?: string | null;
  duration?: number | null;
}): Promise<CommentItem> {
  const { comment } = await post<{ comment: CommentItem }>("/api/comments", input);
  return comment;
}

export async function deleteComment(id: string): Promise<void> {
  await del(`/api/comments/${id}`);
}

export const uploadVoice = (file: File) => uploadFile("/api/comments/upload/voice", file);

// ---------- LIKES ----------
export async function toggleLike(postId: string): Promise<{ liked: boolean; count: number }> {
  return post("/api/likes/toggle", { postId });
}

export async function getLikeStatus(postId: string): Promise<{ liked: boolean; count: number }> {
  return get(`/api/likes/post/${postId}`);
}

// ---------- FOLLOWS ----------
export async function toggleFollow(userId: string): Promise<{ following: boolean }> {
  return post("/api/follows/toggle", { userId });
}

export async function getFollowStatus(userId: string): Promise<{ following: boolean }> {
  return get(`/api/follows/status/${userId}`);
}

export async function getFollowCounts(userId: string): Promise<{ followers: number; following: number }> {
  return get(`/api/follows/counts/${userId}`);
}

// ---------- FRIENDS ----------
export async function getFriends(): Promise<User[]> {
  const { users } = await get<{ users: User[] }>("/api/friends");
  return users;
}

export async function getPendingFriendRequests(): Promise<FriendRequest[]> {
  const { requests } = await get<{ requests: FriendRequest[] }>("/api/friends/requests");
  return requests;
}

export async function getFriendStatus(userId: string): Promise<FriendStatus> {
  const { status } = await get<{ status: FriendStatus }>(`/api/friends/status/${userId}`);
  return status;
}

export async function sendFriendRequest(toUserId: string): Promise<void> {
  await post("/api/friends/request", { toUserId });
}

export async function acceptFriendRequest(id: string): Promise<void> {
  await put(`/api/friends/request/${id}/accept`);
}

export async function rejectFriendRequest(id: string): Promise<void> {
  await put(`/api/friends/request/${id}/reject`);
}

// ---------- MESSAGES ----------
export async function getChats(): Promise<User[]> {
  const { users } = await get<{ users: User[] }>("/api/messages/chats");
  return users;
}

export async function getVerifyBotUser(): Promise<User> {
  const { user } = await get<{ user: User }>("/api/messages/bot");
  return user;
}

export async function ensureBotWelcome(): Promise<void> {
  await post("/api/messages/bot/welcome");
}

export async function getMessages(otherUserId: string): Promise<Message[]> {
  const { messages } = await get<{ messages: Message[] }>(`/api/messages/${otherUserId}`);
  return messages;
}

export async function sendMessage(toUserId: string, text: string): Promise<Message> {
  const { message } = await post<{ message: Message }>("/api/messages", { toUserId, text });
  return message;
}

// ---------- CHANNELS ----------
export async function getChannels(): Promise<Channel[]> {
  const { channels } = await get<{ channels: Channel[] }>("/api/channels");
  return channels;
}

export async function createChannel(name: string, description: string): Promise<Channel> {
  const { channel } = await post<{ channel: Channel }>("/api/channels", { name, description });
  return channel;
}

export async function getChannel(id: string): Promise<{ channel: Channel; posts: ChannelPost[] }> {
  return get(`/api/channels/${id}`);
}

export async function createChannelPost(
  channelId: string,
  input: { content: string; imageUrl?: string | null; drawingUrl?: string | null },
): Promise<ChannelPost> {
  const { post: created } = await post<{ post: ChannelPost }>(`/api/channels/${channelId}/posts`, input);
  return created;
}

export async function deleteChannelPost(id: string): Promise<void> {
  await del(`/api/channels/posts/${id}`);
}

// ---------- VERIFICATION ----------
export async function submitVerificationRequest(): Promise<void> {
  await post("/api/verify/request");
}

export async function getVerificationRequests(): Promise<VerificationRequest[]> {
  const { requests } = await get<{ requests: VerificationRequest[] }>("/api/verify");
  return requests;
}

export async function processVerificationRequest(id: string, approve: boolean): Promise<void> {
  await put(`/api/verify/${id}`, { approve });
}

// ---------- REPORTS ----------
export async function submitReport(reportedUserId: string, reason: string): Promise<void> {
  await post("/api/reports", { reportedUserId, reason });
}

export async function getReports(): Promise<Report[]> {
  const { reports } = await get<{ reports: Report[] }>("/api/reports");
  return reports;
}

export async function resolveReport(id: string, action: "resolve" | "dismiss"): Promise<void> {
  await put(`/api/reports/${id}`, { action });
}

// ---------- BANS ----------
export async function getBans(): Promise<Ban[]> {
  const { bans } = await get<{ bans: Ban[] }>("/api/bans");
  return bans;
}

export async function getBanStatus(userId: string): Promise<{ banned: boolean; reason: string | null }> {
  return get(`/api/bans/status/${userId}`);
}

export async function banUser(userId: string, reason: string): Promise<void> {
  await post("/api/bans", { userId, reason });
}

export async function unbanUser(userId: string): Promise<void> {
  await del(`/api/bans/${userId}`);
}

// ---------- BLOCKS ----------
export async function getBlockedUsers(): Promise<User[]> {
  const { users } = await get<{ users: User[] }>("/api/blocks");
  return users;
}

export async function blockUser(userId: string): Promise<void> {
  await post(`/api/blocks/${userId}`);
}

export async function unblockUser(userId: string): Promise<void> {
  await del(`/api/blocks/${userId}`);
}

export async function getBlockStatus(
  userId: string,
): Promise<{ iBlockedThem: boolean; theyBlockedMe: boolean }> {
  return get(`/api/blocks/status/${userId}`);
}

// ---------- EVENTS ----------
export async function getEvents(): Promise<AppEvent[]> {
  const { events } = await get<{ events: AppEvent[] }>("/api/events");
  return events;
}

export async function getEvent(id: string): Promise<AppEvent> {
  const { event } = await get<{ event: AppEvent }>(`/api/events/${id}`);
  return event;
}

export async function createEvent(input: Omit<AppEvent, "id" | "active" | "finalized" | "winnerId" | "createdAt"> & { active?: boolean }): Promise<AppEvent> {
  const { event } = await post<{ event: AppEvent }>("/api/events", input);
  return event;
}

export async function setEventActive(id: string, active: boolean): Promise<void> {
  await put(`/api/events/${id}/active`, { active });
}

export async function deleteEvent(id: string): Promise<void> {
  await del(`/api/events/${id}`);
}

export async function getEventSubmissions(id: string): Promise<EventSubmission[]> {
  const { submissions } = await get<{ submissions: EventSubmission[] }>(`/api/events/${id}/submissions`);
  return submissions;
}

export async function getMySubmission(id: string): Promise<EventSubmission | null> {
  const { submission } = await get<{ submission: EventSubmission | null }>(
    `/api/events/${id}/submissions/mine`,
  );
  return submission;
}

export async function submitPixelWar(id: string, drawingUrl: string): Promise<void> {
  await post(`/api/events/${id}/submit/pixelwar`, { drawingUrl });
}

export async function submitWordWar(id: string, answers: number[]): Promise<{ score: number }> {
  return post(`/api/events/${id}/submit/wordwar`, { answers });
}

export async function setEventWinner(id: string, winnerId: string): Promise<void> {
  await put(`/api/events/${id}/winner`, { winnerId });
}

export async function finalizeEvent(id: string): Promise<AppEvent> {
  const { event } = await post<{ event: AppEvent }>(`/api/events/${id}/finalize`);
  return event;
}

export async function getLeaderboard(): Promise<{ userId: string; username: string; points: number }[]> {
  const { leaderboard } = await get<{ leaderboard: { userId: string; username: string; points: number }[] }>(
    "/api/events/leaderboard/points",
  );
  return leaderboard;
}

// ---------- NOTIFICATIONS ----------
export interface NotificationEvent {
  id: string;
  type: "like" | "comment" | "follow" | "friend_request";
  userId: string;
  targetUserId: string;
  postId?: string;
  commentId?: string;
  text?: string;
  createdAt: string;
}

export async function getNotifications(): Promise<NotificationEvent[]> {
  const { notifications } = await get<{ notifications: NotificationEvent[] }>("/api/notifications");
  return notifications;
}

// ---------- ADMIN ----------
export interface AdminStats {
  users: number;
  posts: number;
  comments: number;
  channels: number;
  events: number;
  aktiviki: number;
}

export async function getAdminStats(): Promise<AdminStats> {
  const { stats } = await get<{ stats: AdminStats }>("/api/admin/stats");
  return stats;
}

export async function isCensorEnabled(): Promise<boolean> {
  const { enabled } = await get<{ enabled: boolean }>("/api/admin/censor");
  return enabled;
}

export async function setCensorEnabled(enabled: boolean): Promise<void> {
  await put("/api/admin/censor", { enabled });
}
