export type User = {
    id: string;
    username: string;
    fullName: string;
    bio: string;
    passwordHash: string;
    avatarUrl: string | null;
    coverUrl: string | null;
    isAdmin: boolean;
    verified: boolean;
    isBot?: boolean;
    aktiviki: number;
    createdAt: string;
  };
  
  export type PublicUser = Omit<User, "passwordHash">;
  
  export type NewUserInput = {
    username: string;
    fullName: string;
    bio: string;
    avatarUrl: string | null;
    coverUrl: string | null;
    password: string;
  };
  
  export type Post = {
    id: string;
    userId: string;
    content: string;
    imageUrl: string | null;
    drawingUrl: string | null;
    censored: boolean;
    createdAt: string;
  };
  
  export type CommentItem = {
    id: string;
    postId: string;
    userId: string;
    content: string | null;
    voiceUrl: string | null;
    duration: number | null;
    censored: boolean;
    createdAt: string;
  };
  
  export type Like = {
    postId: string;
    userId: string;
  };
  
  export type Follow = {
    followerId: string;
    followingId: string;
  };
  
  export type Channel = {
    id: string;
    name: string;
    description: string;
    ownerId: string;
    createdAt: string;
  };
  
  export type ChannelPost = {
    id: string;
    channelId: string;
    userId: string;
    content: string;
    imageUrl: string | null;
    drawingUrl: string | null;
    censored: boolean;
    createdAt: string;
  };
  
  export type EventType = "pixelwar" | "wordwar" | "popuwar";
  
  export type WordWarQuestion = {
    word: string;
    options: string[];
    correctIndex: number;
  };
  
  export type AppEvent = {
    id: string;
    type: EventType;
    title: string;
    description: string;
    theme: string | null;
    questions: WordWarQuestion[];
    reward: number;
    participationReward: number;
    startAt: string;
    endAt: string;
    active: boolean;
    finalized: boolean;
    winnerId: string | null;
    createdAt: string;
  };
  
  export type EventSubmission = {
    id: string;
    eventId: string;
    userId: string;
    drawingUrl: string | null;
    answers: number[] | null;
    score: number | null;
    createdAt: string;
  };
  
  export type AdminSettings = {
    censorEnabled: boolean;
  };
  
  export type Session = {
    userId: string;
  };
  // ===== НОВЫЕ ТИПЫ ДЛЯ ДРУЗЕЙ, ЧАТОВ, ВЕРИФИКАЦИИ, РЕПОРТОВ, БАНОВ =====

export type FriendStatus = 'none' | 'pending' | 'accepted' | 'rejected';

export interface FriendRequest {
  id: string;
  fromUserId: string;
  toUserId: string;
  status: 'pending' | 'accepted' | 'rejected';
  createdAt: string;
}

export interface Message {
  id: string;
  chatId: string;
  fromUserId: string;
  toUserId: string;
  text: string;
  read: boolean;
  createdAt: string;
}

export interface VerificationRequest {
  id: string;
  userId: string;
  status: 'pending' | 'approved' | 'rejected';
  createdAt: string;
}

export interface Report {
  id: string;
  reporterUserId: string;
  reportedUserId: string;
  reason: string;
  status: 'pending' | 'resolved' | 'dismissed';
  createdAt: string;
}

export interface Ban {
  userId: string;
  reason: string;
  bannedBy: string;
  createdAt: string;
}

export interface VideoPost {
  id: string;
  postId: string;
  videoUrl: string;
  thumbnailUrl?: string;
  duration?: number;
}

export interface UserBlock {
  id: string;
  blockerId: string;
  blockedId: string;
  createdAt: string;
}