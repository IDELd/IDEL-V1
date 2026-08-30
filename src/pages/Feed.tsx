import React, { useEffect, useState } from 'react';
import { useTranslation } from 'react-i18next';
import { Link } from 'react-router-dom';
import { Feather } from 'lucide-react';
import { useAuth } from '../context/auth';
import * as db from '../lib/db';
import * as events from '../lib/events';
import type { Post } from '../lib/types';
import { PostCard } from '@/components/post/PostCard';
import { Button } from '@/components/ui/button';

const Feed: React.FC = () => {
  const { t } = useTranslation();
  const { user } = useAuth();
  const [posts, setPosts] = useState<Post[]>([]);

  const loadPosts = () => setPosts(db.getPosts());

  useEffect(() => {
    loadPosts();
    const off = events.on('posts-changed', loadPosts);
    const interval = setInterval(loadPosts, 5000);
    return () => {
      off();
      clearInterval(interval);
    };
  }, []);

  if (!user) {
    return (
      <div className="flex flex-col items-center justify-center gap-3 py-24 text-center">
        <h1 className="bg-brand-gradient bg-clip-text text-3xl font-extrabold tracking-tight text-transparent">
          {t('common.appName')}
        </h1>
        <p className="max-w-xs text-sm text-muted-foreground">{t('auth.loginSubtitle')}</p>
        <Button asChild className="mt-2">
          <Link to="/login">{t('auth.loginButton')}</Link>
        </Button>
      </div>
    );
  }

  const isBanned = db.isUserBanned(user.id);
  if (isBanned) {
    return (
      <div className="rounded-2xl border border-destructive/40 bg-destructive/10 p-5 text-center">
        <p className="font-bold text-destructive">{t('ban.title')}</p>
        <p className="mt-1 text-sm text-destructive/80">
          {t('ban.reason')}: {db.getBanReason(user.id) || t('ban.noReason')}
        </p>
      </div>
    );
  }

  const visiblePosts = posts.filter((p) => !db.isBlockedEitherWay(user.id, p.userId));

  return (
    <div className="space-y-4">
      <div>
        <h1 className="text-xl font-bold">{t('nav.feed')}</h1>
        <p className="mt-1 text-sm text-muted-foreground">{t('feed.subtitle')}</p>
      </div>

      {visiblePosts.length === 0 ? (
        <div className="flex flex-col items-center gap-2 rounded-2xl border border-dashed border-border py-16 text-center">
          <Feather className="h-6 w-6 text-muted-foreground" />
          <p className="text-sm font-medium">{t('feed.empty')}</p>
        </div>
      ) : (
        <div className="space-y-4">
          {visiblePosts.map((post) => (
            <PostCard key={post.id} post={post} onChange={loadPosts} />
          ))}
        </div>
      )}
    </div>
  );
};

export default Feed;
