import React, { useState, useEffect, useRef } from 'react';
import { useTranslation } from 'react-i18next';
import { Link, useNavigate, useParams } from 'react-router-dom';
import { ArrowLeft, MessageCircle, Send } from 'lucide-react';
import { useAuth } from '../context/auth';
import { getChats, getMessages, sendMessage, getUserById, ensureBotWelcome } from '../lib/db';
import type { Message, User } from '../lib/types';
import { UserAvatar } from '@/components/common/UserAvatar';
import { VerificationBadge } from '@/components/common/VerificationBadge';
import { BotBadge } from '@/components/common/BotBadge';
import { cn } from '@/lib/utils';

const Chat: React.FC = () => {
  const { t } = useTranslation();
  const { user } = useAuth();
  const navigate = useNavigate();
  const { userId: otherUserId } = useParams<{ userId: string }>();
  const [chats, setChats] = useState<User[]>([]);
  const [messages, setMessages] = useState<Message[]>([]);
  const [input, setInput] = useState('');
  const [selectedUser, setSelectedUser] = useState<User | null>(null);
  const messagesEndRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    if (!user) return;
    setChats(getChats(user.id));
  }, [user]);

  useEffect(() => {
    if (!user || !otherUserId) {
      setSelectedUser(null);
      return;
    }
    const target = getUserById(otherUserId);
    if (target) {
      setSelectedUser(target);
      if (target.isBot) ensureBotWelcome(user.id);
      setMessages(getMessages(user.id, otherUserId));
    }
  }, [otherUserId, user]);

  useEffect(() => {
    const interval = setInterval(() => {
      if (user && selectedUser) {
        setMessages(getMessages(user.id, selectedUser.id));
        setChats(getChats(user.id));
      }
    }, 4000);
    return () => clearInterval(interval);
  }, [user, selectedUser]);

  useEffect(() => {
    messagesEndRef.current?.scrollIntoView({ behavior: 'smooth' });
  }, [messages]);

  const handleSend = () => {
    if (!user || !selectedUser || !input.trim()) return;
    sendMessage(user.id, selectedUser.id, input.trim());
    setMessages(getMessages(user.id, selectedUser.id));
    setChats(getChats(user.id));
    setInput('');
  };

  if (!user) return null;

  // --- Conversation view ---
  if (selectedUser) {
    return (
      <div className="flex h-[calc(100dvh-9.5rem)] flex-col">
        <div className="flex items-center gap-2 border-b border-border pb-3">
          <button
            onClick={() => navigate('/chat')}
            className="rounded-full p-1.5 text-muted-foreground hover:bg-secondary hover:text-foreground"
            aria-label={t('common.back')}
          >
            <ArrowLeft className="h-4 w-4" />
          </button>
          <Link to={`/u/${selectedUser.username}`} className="flex min-w-0 items-center gap-2">
            <UserAvatar user={selectedUser} size="sm" />
            <div className="min-w-0">
              <div className="flex items-center gap-1">
                <p className="truncate text-sm font-semibold">@{selectedUser.username}</p>
                {selectedUser.isBot ? <BotBadge /> : selectedUser.verified && <VerificationBadge />}
              </div>
            </div>
          </Link>
        </div>

        <div className="flex-1 space-y-2 overflow-y-auto py-3">
          {messages.length === 0 ? (
            <p className="pt-10 text-center text-sm text-muted-foreground">{t('chat.noMessages')}</p>
          ) : (
            messages.map((msg) => (
              <div
                key={msg.id}
                className={cn('flex', msg.fromUserId === user.id ? 'justify-end' : 'justify-start')}
              >
                <div
                  className={cn(
                    'max-w-[75%] rounded-2xl px-3 py-2 text-sm shadow-soft',
                    msg.fromUserId === user.id
                      ? 'bg-foreground text-background'
                      : 'bg-secondary text-foreground',
                  )}
                >
                  <p className="whitespace-pre-wrap break-words">{msg.text}</p>
                  <p className="mt-1 text-[10px] opacity-60">
                    {new Date(msg.createdAt).toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })}
                  </p>
                </div>
              </div>
            ))
          )}
          <div ref={messagesEndRef} />
        </div>

        <div className="flex items-center gap-2 border-t border-border pt-3">
          <input
            type="text"
            value={input}
            onChange={(e) => setInput(e.target.value)}
            placeholder={t('chat.placeholder')}
            className="flex-1 rounded-full border border-input bg-background px-4 py-2 text-sm outline-none focus:border-foreground"
            onKeyDown={(e) => e.key === 'Enter' && handleSend()}
          />
          <button
            onClick={handleSend}
            disabled={!input.trim()}
            className="flex h-9 w-9 shrink-0 items-center justify-center rounded-full bg-foreground text-background disabled:opacity-40"
            aria-label={t('chat.send')}
          >
            <Send className="h-4 w-4" />
          </button>
        </div>
      </div>
    );
  }

  // --- Conversation list ---
  return (
    <div className="space-y-4">
      <h1 className="px-1 text-xl font-bold">{t('nav.messages')}</h1>
      {chats.length === 0 ? (
        <div className="flex flex-col items-center gap-2 rounded-2xl border border-dashed border-border py-14 text-center">
          <MessageCircle className="h-6 w-6 text-muted-foreground" />
          <p className="text-sm text-muted-foreground">{t('chat.noChats')}</p>
        </div>
      ) : (
        <div className="space-y-2">
          {chats.map((u) => (
            <button
              key={u.id}
              onClick={() => navigate(`/chat/${u.id}`)}
              className="flex w-full items-center gap-3 rounded-2xl border border-border bg-card p-3 text-left shadow-soft transition-colors hover:border-foreground/30"
            >
              <UserAvatar user={u} size="sm" />
              <div className="min-w-0 flex-1">
                <div className="flex items-center gap-1">
                  <p className="truncate text-sm font-semibold">@{u.username}</p>
                  {u.isBot ? <BotBadge /> : u.verified && <VerificationBadge />}
                </div>
                <p className="truncate text-xs text-muted-foreground">{u.fullName}</p>
              </div>
            </button>
          ))}
        </div>
      )}
    </div>
  );
};

export default Chat;
