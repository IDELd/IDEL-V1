import React, { useState } from 'react';
import { useParams, Link, useNavigate } from 'react-router-dom';
import { useTranslation } from 'react-i18next';
import {
  MessageCircle,
  Pencil,
  Settings as SettingsIcon,
  ShieldCheck,
  UserPlus,
  UserCheck,
  Ban,
  ShieldOff,
  Flag,
} from 'lucide-react';
import { useAuth } from '../context/auth';
import * as db from '../lib/db';
import type { Post } from '../lib/types';
import { UserAvatar } from '@/components/common/UserAvatar';
import { VerificationBadge } from '@/components/common/VerificationBadge';
import { BotBadge } from '@/components/common/BotBadge';
import { PostCard } from '@/components/post/PostCard';
import { Button } from '@/components/ui/button';
import {
  AlertDialog,
  AlertDialogAction,
  AlertDialogCancel,
  AlertDialogContent,
  AlertDialogDescription,
  AlertDialogFooter,
  AlertDialogHeader,
  AlertDialogTitle,
} from '@/components/ui/alert-dialog';

const Profile: React.FC = () => {
  const { t } = useTranslation();
  const { username } = useParams<{ username: string }>();
  const { user } = useAuth();
  const navigate = useNavigate();
  const [version, setVersion] = useState(0);
  const [confirmBlock, setConfirmBlock] = useState(false);
  const [reportOpen, setReportOpen] = useState(false);
  const [reportReason, setReportReason] = useState('');

  const profile = db.getUserByUsername(username || '');

  if (!profile) {
    return (
      <div className="rounded-2xl border border-dashed border-border py-16 text-center text-sm text-muted-foreground">
        {t('profile.notFound')}
      </div>
    );
  }

  const isOwn = user?.id === profile.id;
  const isBanned = db.isUserBanned(profile.id);
  const banReason = db.getBanReason(profile.id);
  const posts: Post[] = db.getPostsByUser(profile.id);
  const followers = db.getFollowerCount(profile.id);
  const following = db.getFollowingCount(profile.id);
  const isFollowing = user ? db.isFollowing(user.id, profile.id) : false;
  const friendStatus = user ? db.getFriendStatus(user.id, profile.id) : 'none';
  const iBlockedThem = user ? db.isBlocked(user.id, profile.id) : false;
  const theyBlockedMe = user ? db.isBlocked(profile.id, user.id) : false;

  const bump = () => setVersion((v) => v + 1);

  const handleFollow = () => {
    if (!user) return;
    db.toggleFollow(user.id, profile.id);
    bump();
  };

  const handleFriendAction = () => {
    if (!user) return;
    if (friendStatus === 'none' || friendStatus === 'rejected') {
      db.sendFriendRequest(user.id, profile.id);
    }
    bump();
  };

  const handleMessage = () => {
    navigate(`/chat/${profile.id}`);
  };

  const handleBlockToggle = () => {
    if (!user) return;
    if (iBlockedThem) {
      db.unblockUser(user.id, profile.id);
      bump();
    } else {
      setConfirmBlock(true);
    }
  };

  const confirmBlockUser = () => {
    if (!user) return;
    db.blockUser(user.id, profile.id);
    setConfirmBlock(false);
    bump();
  };

  const submitReport = () => {
    if (!user || !reportReason.trim()) return;
    db.submitReport(user.id, profile.id, reportReason.trim());
    setReportReason('');
    setReportOpen(false);
  };

  return (
    <div className="space-y-4">
      <div className="overflow-hidden rounded-2xl border border-border bg-card shadow-soft">
        <div
          className="h-24 w-full bg-secondary bg-cover bg-center"
          style={profile.coverUrl ? { backgroundImage: `url(${profile.coverUrl})` } : undefined}
        />
        <div className="px-5 pb-5">
          <div className="-mt-10 flex items-end justify-between">
            <UserAvatar user={profile} size="xl" className="ring-4 ring-card" />
          </div>

          <div className="mt-3 flex items-center gap-1">
            <h1 className="truncate text-lg font-bold">@{profile.username}</h1>
            {profile.isBot ? <BotBadge /> : profile.verified && <VerificationBadge />}
          </div>
          {profile.fullName && (
            <p className="text-sm text-muted-foreground">{profile.fullName}</p>
          )}
          {profile.bio && <p className="mt-2 text-sm">{profile.bio}</p>}

          {isBanned && (
            <div className="mt-3 rounded-xl border border-destructive/40 bg-destructive/10 px-3 py-2 text-sm text-destructive">
              <p className="font-semibold">{t('ban.title')}</p>
              <p className="text-xs opacity-80">
                {t('ban.reason')}: {banReason || t('ban.noReason')}
              </p>
            </div>
          )}

          <div className="mt-3 flex items-center gap-1.5 text-xs text-muted-foreground">
            <ShieldCheck className="h-3.5 w-3.5" />
            <span>{t('profile.aktiviki')}: {profile.aktiviki}</span>
          </div>
          <p className="text-xs text-muted-foreground">
            {t('profile.joined')}{' '}
            {new Date(profile.createdAt).toLocaleDateString(undefined, {
              day: 'numeric',
              month: 'long',
              year: 'numeric',
            })}
          </p>

          <div className="mt-3 flex gap-4 text-sm">
            <span><strong>{posts.length}</strong> <span className="text-muted-foreground">{t('profile.posts')}</span></span>
            <span><strong>{followers}</strong> <span className="text-muted-foreground">{t('profile.followers')}</span></span>
            <span><strong>{following}</strong> <span className="text-muted-foreground">{t('profile.following')}</span></span>
          </div>

          <div className="mt-4 flex flex-wrap gap-2">
            {profile.isBot ? (
              <Button size="sm" onClick={() => navigate(`/chat/${profile.id}`)}>
                <MessageCircle className="h-4 w-4" />
                {t('nav.messages')}
              </Button>
            ) : isOwn ? (
              <>
                <Button size="sm" variant="outline" asChild>
                  <Link to={`/u/${profile.username}/edit`}>
                    <Pencil className="h-4 w-4" />
                    {t('profile.edit')}
                  </Link>
                </Button>
                <Button size="sm" variant="outline" asChild>
                  <Link to="/settings">
                    <SettingsIcon className="h-4 w-4" />
                    {t('settings.title')}
                  </Link>
                </Button>
                {!profile.verified && (
                  <Button size="sm" variant="outline" onClick={() => navigate(`/chat/${db.getVerifyBotUser().id}`)}>
                    <ShieldCheck className="h-4 w-4" />
                    {t('verifyBot.getVerified')}
                  </Button>
                )}
                {profile.isAdmin && (
                  <Button size="sm" asChild>
                    <Link to="/admin">
                      <ShieldCheck className="h-4 w-4" />
                      {t('profile.adminPanel')}
                    </Link>
                  </Button>
                )}
              </>
            ) : theyBlockedMe ? (
              <p className="text-sm text-muted-foreground">{t('block.unavailable')}</p>
            ) : (
              <>
                <Button size="sm" variant={isFollowing ? 'outline' : 'default'} onClick={handleFollow}>
                  {isFollowing ? t('profile.unfollow') : t('profile.follow')}
                </Button>
                {friendStatus === 'accepted' ? (
                  <Button size="sm" variant="outline" disabled>
                    <UserCheck className="h-4 w-4" />
                    {t('friends.areFriends')}
                  </Button>
                ) : friendStatus === 'pending' ? (
                  <Button size="sm" variant="outline" disabled>
                    <UserPlus className="h-4 w-4" />
                    {t('friends.requestSent')}
                  </Button>
                ) : (
                  <Button size="sm" variant="outline" onClick={handleFriendAction}>
                    <UserPlus className="h-4 w-4" />
                    {t('friends.add')}
                  </Button>
                )}
                <Button size="sm" variant="outline" onClick={handleMessage}>
                  <MessageCircle className="h-4 w-4" />
                  {t('nav.messages')}
                </Button>
                <Button
                  size="sm"
                  variant="outline"
                  className={iBlockedThem ? undefined : 'text-destructive hover:text-destructive'}
                  onClick={handleBlockToggle}
                >
                  {iBlockedThem ? <ShieldOff className="h-4 w-4" /> : <Ban className="h-4 w-4" />}
                  {iBlockedThem ? t('block.unblock') : t('block.block')}
                </Button>
                <Button size="sm" variant="ghost" className="text-muted-foreground" onClick={() => setReportOpen(true)}>
                  <Flag className="h-4 w-4" />
                  {t('report.action')}
                </Button>
              </>
            )}
          </div>
        </div>
      </div>

      <div className="space-y-4">
        {posts.length === 0 ? (
          <p className="py-8 text-center text-sm text-muted-foreground">{t('profile.noPosts')}</p>
        ) : (
          posts.map((post) => <PostCard key={post.id} post={post} onChange={bump} />)
        )}
      </div>

      <AlertDialog open={confirmBlock} onOpenChange={setConfirmBlock}>
        <AlertDialogContent>
          <AlertDialogHeader>
            <AlertDialogTitle>{t('block.confirmTitle')}</AlertDialogTitle>
            <AlertDialogDescription>{t('block.confirmDescription')}</AlertDialogDescription>
          </AlertDialogHeader>
          <AlertDialogFooter>
            <AlertDialogCancel>{t('common.cancel')}</AlertDialogCancel>
            <AlertDialogAction onClick={confirmBlockUser}>{t('block.block')}</AlertDialogAction>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>

      <AlertDialog open={reportOpen} onOpenChange={setReportOpen}>
        <AlertDialogContent>
          <AlertDialogHeader>
            <AlertDialogTitle>{t('report.title')}</AlertDialogTitle>
            <AlertDialogDescription>{t('report.description')}</AlertDialogDescription>
          </AlertDialogHeader>
          <textarea
            value={reportReason}
            onChange={(e) => setReportReason(e.target.value)}
            placeholder={t('report.placeholder')}
            rows={3}
            className="w-full resize-none rounded-lg border border-input bg-background p-2 text-sm text-foreground"
          />
          <AlertDialogFooter>
            <AlertDialogCancel>{t('common.cancel')}</AlertDialogCancel>
            <AlertDialogAction onClick={submitReport} disabled={!reportReason.trim()}>
              {t('report.submit')}
            </AlertDialogAction>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>
    </div>
  );
};

export default Profile;
