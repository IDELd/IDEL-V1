import React, { useEffect, useState } from 'react';
import { useTranslation } from 'react-i18next';
import { Link } from 'react-router-dom';
import { formatDistanceToNow } from 'date-fns';
import { ru, enUS } from 'date-fns/locale';
import { Bell, Clock, Heart, MessageCircle, UserCheck, UserPlus } from 'lucide-react';
import { useAuth } from '../context/auth';
import { getNotifications, getUserById } from '../lib/db';
import type { NotificationEvent } from '../lib/db';
import { UserAvatar } from '@/components/common/UserAvatar';

const ICONS: Record<NotificationEvent['type'], React.ElementType> = {
  like: Heart,
  comment: MessageCircle,
  follow: UserPlus,
  friend_request: UserCheck,
};

const Notifications: React.FC = () => {
  const { t, i18n } = useTranslation();
  const { user } = useAuth();
  const [notifications, setNotifications] = useState<NotificationEvent[]>([]);

  useEffect(() => {
    if (!user) return;
    setNotifications(getNotifications(user.id));
  }, [user]);

  if (!user) {
    return (
      <div className="rounded-2xl border border-dashed border-border py-16 text-center text-sm text-muted-foreground">
        {t('notifications.loginHint')}
      </div>
    );
  }

  const locale = i18n.resolvedLanguage?.startsWith('ru') ? ru : enUS;

  const getMessage = (event: NotificationEvent) => {
    const actor = getUserById(event.userId);
    const actorName = actor ? `@${actor.username}` : t('notifications.unknownUser');
    const suffix =
      event.type === 'comment' ? (
        <>
          {t('notifications.comment')} <span className="italic text-muted-foreground">"{event.text}"</span>
        </>
      ) : (
        t(
          event.type === 'like'
            ? 'notifications.like'
            : event.type === 'follow'
              ? 'notifications.follow'
              : 'notifications.friendRequest',
        )
      );
    return (
      <span>
        <Link to={`/u/${actor?.username || ''}`} className="font-semibold hover:underline">
          {actorName}
        </Link>{' '}
        {suffix}
      </span>
    );
  };

  return (
    <div className="space-y-4">
      <h1 className="px-1 text-xl font-bold">{t('notifications.title')}</h1>
      {notifications.length === 0 ? (
        <div className="flex flex-col items-center gap-2 rounded-2xl border border-dashed border-border py-14 text-center">
          <Bell className="h-6 w-6 text-muted-foreground" />
          <p className="text-sm text-muted-foreground">{t('notifications.empty')}</p>
        </div>
      ) : (
        <div className="space-y-2">
          {notifications.map((event) => {
            const actor = getUserById(event.userId);
            const Icon = ICONS[event.type];
            return (
              <div
                key={event.id}
                className="flex items-start gap-3 rounded-2xl border border-border bg-card p-3 shadow-soft"
              >
                {actor ? (
                  <UserAvatar user={actor} size="sm" />
                ) : (
                  <span className="flex h-8 w-8 shrink-0 items-center justify-center rounded-full bg-secondary">
                    <Icon className="h-4 w-4 text-muted-foreground" />
                  </span>
                )}
                <div className="min-w-0 flex-1">
                  <div className="text-sm">{getMessage(event)}</div>
                  <div className="mt-1 flex items-center gap-1 text-xs text-muted-foreground">
                    <Clock className="h-3 w-3" />
                    <span>{formatDistanceToNow(new Date(event.createdAt), { addSuffix: true, locale })}</span>
                  </div>
                </div>
              </div>
            );
          })}
        </div>
      )}
    </div>
  );
};

export default Notifications;
