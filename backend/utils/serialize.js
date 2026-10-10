function serializeUser(row, { includePasswordHash = false } = {}) {
  if (!row) return null;
  const user = {
    id: row.id,
    username: row.username,
    fullName: row.full_name,
    bio: row.bio,
    avatarUrl: row.avatar_url,
    coverUrl: row.cover_url,
    isAdmin: !!row.is_admin,
    verified: !!row.verified,
    isBot: !!row.is_bot,
    aktiviki: row.aktiviki,
    createdAt: row.created_at,
  };
  if (includePasswordHash) user.passwordHash = row.password_hash;
  return user;
}

function serializePost(row) {
  if (!row) return null;
  return {
    id: row.id,
    userId: row.user_id,
    content: row.content,
    imageUrl: row.image_url,
    drawingUrl: row.drawing_url,
    censored: !!row.censored,
    createdAt: row.created_at,
  };
}

function serializeVideo(row) {
  if (!row) return null;
  return {
    id: row.id,
    postId: row.id, // populated by caller when needed
    videoUrl: row.video_url,
    thumbnailUrl: row.video_thumbnail_url,
    duration: row.video_duration,
  };
}

function serializeComment(row) {
  if (!row) return null;
  return {
    id: row.id,
    postId: row.post_id,
    userId: row.user_id,
    content: row.content,
    voiceUrl: row.voice_url,
    duration: row.duration,
    censored: !!row.censored,
    createdAt: row.created_at,
  };
}

function serializeChannel(row) {
  if (!row) return null;
  return {
    id: row.id,
    name: row.name,
    description: row.description,
    ownerId: row.owner_id,
    createdAt: row.created_at,
  };
}

function serializeChannelPost(row) {
  if (!row) return null;
  return {
    id: row.id,
    channelId: row.channel_id,
    userId: row.user_id,
    content: row.content,
    imageUrl: row.image_url,
    drawingUrl: row.drawing_url,
    censored: !!row.censored,
    createdAt: row.created_at,
  };
}

function serializeFriendRequest(row) {
  if (!row) return null;
  return {
    id: row.id,
    fromUserId: row.from_user_id,
    toUserId: row.to_user_id,
    status: row.status,
    createdAt: row.created_at,
  };
}

function serializeMessage(row) {
  if (!row) return null;
  return {
    id: row.id,
    chatId: row.chat_id,
    fromUserId: row.from_user_id,
    toUserId: row.to_user_id,
    text: row.text,
    read: !!row.read,
    createdAt: row.created_at,
  };
}

function serializeVerificationRequest(row) {
  if (!row) return null;
  return {
    id: row.id,
    userId: row.user_id,
    status: row.status,
    createdAt: row.created_at,
  };
}

function serializeReport(row) {
  if (!row) return null;
  return {
    id: row.id,
    reporterUserId: row.reporter_user_id,
    reportedUserId: row.reported_user_id,
    reason: row.reason,
    status: row.status,
    createdAt: row.created_at,
  };
}

function serializeBan(row) {
  if (!row) return null;
  return {
    id: row.id,
    userId: row.user_id,
    reason: row.reason,
    bannedBy: row.banned_by,
    createdAt: row.created_at,
  };
}

function serializeEvent(row) {
  if (!row) return null;
  return {
    id: row.id,
    type: row.type,
    title: row.title,
    description: row.description,
    theme: row.theme,
    questions: JSON.parse(row.questions || "[]"),
    reward: row.reward,
    participationReward: row.participation_reward,
    startAt: row.start_at,
    endAt: row.end_at,
    active: !!row.active,
    finalized: !!row.finalized,
    winnerId: row.winner_id,
    createdAt: row.created_at,
  };
}

function serializeSubmission(row) {
  if (!row) return null;
  return {
    id: row.id,
    eventId: row.event_id,
    userId: row.user_id,
    drawingUrl: row.drawing_url,
    answers: row.answers ? JSON.parse(row.answers) : null,
    score: row.score,
    createdAt: row.created_at,
  };
}

function serializeNotification(row) {
  if (!row) return null;
  return {
    id: row.id,
    userId: row.user_id,
    type: row.type,
    actorUserId: row.actor_user_id,
    text: row.text,
    createdAt: row.created_at,
  };
}

module.exports = {
  serializeUser,
  serializePost,
  serializeVideo,
  serializeComment,
  serializeChannel,
  serializeChannelPost,
  serializeFriendRequest,
  serializeMessage,
  serializeVerificationRequest,
  serializeReport,
  serializeBan,
  serializeEvent,
  serializeSubmission,
  serializeNotification,
};
