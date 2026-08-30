import React, { useState } from 'react';
import { Link } from 'react-router-dom';
import { useTranslation } from 'react-i18next';
import {
  Ban,
  Calendar,
  Check,
  Flag,
  ShieldCheck,
  ShieldX,
  X,
} from 'lucide-react';
import { useAuth } from '../context/auth';
import * as db from '../lib/db';
import { Button } from '@/components/ui/button';
import { Switch } from '@/components/ui/switch';
import { Tabs, TabsList, TabsTrigger, TabsContent } from '@/components/ui/tabs';
import { UserAvatar } from '@/components/common/UserAvatar';

const AdminPanel: React.FC = () => {
  const { t } = useTranslation();
  const { user } = useAuth();
  const [version, setVersion] = useState(0);
  const bump = () => setVersion((v) => v + 1);

  if (!user?.isAdmin) {
    return (
      <div className="rounded-2xl border border-destructive/40 bg-destructive/10 p-5 text-center text-sm font-medium text-destructive">
        {t('admin.forbidden')}
      </div>
    );
  }

  const users = db.getUsers();
  const posts = db.getPosts();
  const comments = db.getCommentCount();
  const channels = db.getChannels();
  const events = db.getEvents();
  const totalAktiviki = users.reduce((acc, u) => acc + u.aktiviki, 0);
  const verificationRequests = db.getVerificationRequests().filter((r) => r.status === 'pending');
  const reports = db.getReports().filter((r) => r.status === 'pending');

  const handleBan = (userId: string) => {
    if (db.isUserBanned(userId)) {
      db.unbanUser(userId);
      bump();
      return;
    }
    const reason = window.prompt(t('admin.banReasonPrompt'));
    if (reason) {
      db.banUser(userId, reason, user.id);
      bump();
    }
  };

  const handleVerificationDecision = (requestId: string, approve: boolean) => {
    db.processVerificationRequest(requestId, approve);
    bump();
  };

  const handleReport = (reportId: string, action: 'resolve' | 'dismiss') => {
    db.resolveReport(reportId, action);
    bump();
  };

  return (
    <div className="space-y-4">
      <h1 className="flex items-center gap-2 px-1 text-xl font-bold">
        <ShieldCheck className="h-5 w-5" />
        {t('admin.title')}
      </h1>

      <Tabs defaultValue="stats">
        <TabsList className="w-full flex-wrap">
          <TabsTrigger value="stats">{t('admin.stats')}</TabsTrigger>
          <TabsTrigger value="verification">
            {t('admin.verification')}
            {verificationRequests.length > 0 && (
              <span className="ml-1 rounded-full bg-foreground px-1.5 text-[10px] text-background">
                {verificationRequests.length}
              </span>
            )}
          </TabsTrigger>
          <TabsTrigger value="reports">
            {t('admin.reports')}
            {reports.length > 0 && (
              <span className="ml-1 rounded-full bg-foreground px-1.5 text-[10px] text-background">
                {reports.length}
              </span>
            )}
          </TabsTrigger>
          <TabsTrigger value="events">{t('admin.events')}</TabsTrigger>
          <TabsTrigger value="censor">{t('admin.censor')}</TabsTrigger>
        </TabsList>

        <TabsContent value="stats" className="mt-4 grid grid-cols-2 gap-3">
          {[
            [users.length, t('admin.statUsers')],
            [posts.length, t('admin.statPosts')],
            [comments, t('admin.statComments')],
            [`#${channels.length}`, t('admin.statChannels')],
            [events.length, t('admin.statEvents')],
            [totalAktiviki, t('admin.statAktiviki')],
          ].map(([value, label]) => (
            <div key={String(label)} className="rounded-2xl border border-border bg-card p-4 text-center shadow-soft">
              <p className="text-2xl font-bold">{value}</p>
              <p className="text-xs text-muted-foreground">{label}</p>
            </div>
          ))}
        </TabsContent>

        <TabsContent value="verification" className="mt-4 space-y-3">
          <div>
            <h2 className="text-sm font-semibold text-muted-foreground">{t('admin.pendingRequests')}</h2>
            {verificationRequests.length === 0 ? (
              <p className="mt-2 text-sm text-muted-foreground">{t('admin.noPendingRequests')}</p>
            ) : (
              <div className="mt-2 space-y-2">
                {verificationRequests.map((req) => {
                  const u = db.getUserById(req.userId);
                  if (!u) return null;
                  return (
                    <div key={req.id} className="flex items-center justify-between gap-2 rounded-2xl border border-border bg-card p-3 shadow-soft">
                      <div className="flex min-w-0 items-center gap-2">
                        <UserAvatar user={u} size="sm" />
                        <div className="min-w-0">
                          <p className="truncate text-sm font-semibold">@{u.username}</p>
                          <p className="truncate text-xs text-muted-foreground">{u.fullName}</p>
                        </div>
                      </div>
                      <div className="flex shrink-0 gap-1.5">
                        <Button size="sm" variant="outline" onClick={() => handleVerificationDecision(req.id, true)}>
                          <Check className="h-4 w-4" />
                        </Button>
                        <Button size="sm" variant="outline" className="text-destructive hover:text-destructive" onClick={() => handleVerificationDecision(req.id, false)}>
                          <X className="h-4 w-4" />
                        </Button>
                      </div>
                    </div>
                  );
                })}
              </div>
            )}
          </div>

          <div>
            <h2 className="mt-4 text-sm font-semibold text-muted-foreground">{t('admin.allUsers')}</h2>
            <div className="mt-2 space-y-2">
              {users.map((u) => (
                <div key={u.id} className="flex items-center justify-between gap-2 rounded-2xl border border-border bg-card p-3 shadow-soft">
                  <div className="min-w-0">
                    <p className="truncate text-sm font-medium">@{u.username}</p>
                    <p className="truncate text-xs text-muted-foreground">{u.fullName}</p>
                  </div>
                  <div className="flex shrink-0 items-center gap-2">
                    <span className="text-xs text-muted-foreground">
                      {u.verified ? t('admin.verified') : t('admin.notVerified')}
                    </span>
                    <Button
                      size="sm"
                      variant="outline"
                      disabled={u.isAdmin}
                      onClick={() => {
                        db.setVerified(u.id, !u.verified);
                        bump();
                      }}
                    >
                      {u.verified ? t('admin.revoke') : t('admin.grant')}
                    </Button>
                    <Button
                      size="sm"
                      variant="outline"
                      disabled={u.isAdmin}
                      className={db.isUserBanned(u.id) ? undefined : 'text-destructive hover:text-destructive'}
                      onClick={() => handleBan(u.id)}
                    >
                      {db.isUserBanned(u.id) ? <ShieldCheck className="h-4 w-4" /> : <Ban className="h-4 w-4" />}
                      {db.isUserBanned(u.id) ? t('admin.unban') : t('admin.ban')}
                    </Button>
                  </div>
                </div>
              ))}
            </div>
          </div>
        </TabsContent>

        <TabsContent value="reports" className="mt-4 space-y-2">
          {reports.length === 0 ? (
            <p className="text-sm text-muted-foreground">{t('admin.noReports')}</p>
          ) : (
            reports.map((r) => {
              const reporter = db.getUserById(r.reporterUserId);
              const reported = db.getUserById(r.reportedUserId);
              return (
                <div key={r.id} className="rounded-2xl border border-border bg-card p-4 shadow-soft">
                  <div className="flex flex-wrap items-center gap-1 text-sm">
                    <Flag className="h-3.5 w-3.5 text-muted-foreground" />
                    <span className="font-medium">@{reporter?.username ?? '?'}</span>
                    <span className="text-muted-foreground">→</span>
                    <span className="font-medium">@{reported?.username ?? '?'}</span>
                  </div>
                  <p className="mt-1.5 text-sm text-muted-foreground">{r.reason}</p>
                  <div className="mt-3 flex gap-2">
                    <Button size="sm" variant="outline" onClick={() => handleReport(r.id, 'resolve')}>
                      <ShieldX className="h-4 w-4" />
                      {t('admin.resolve')}
                    </Button>
                    <Button size="sm" variant="ghost" onClick={() => handleReport(r.id, 'dismiss')}>
                      {t('admin.dismiss')}
                    </Button>
                  </div>
                </div>
              );
            })
          )}
        </TabsContent>

        <TabsContent value="events" className="mt-4 space-y-3 text-center">
          <Calendar className="mx-auto h-8 w-8 text-muted-foreground" />
          <p className="text-sm text-muted-foreground">{t('admin.eventsHint')}</p>
          <Button asChild>
            <Link to="/events">{t('events.title')}</Link>
          </Button>
        </TabsContent>

        <TabsContent value="censor" className="mt-4">
          <div className="flex items-center justify-between gap-4 rounded-2xl border border-border bg-card p-4 shadow-soft">
            <div>
              <h3 className="text-sm font-semibold">{t('admin.censor')}</h3>
              <p className="mt-1 text-xs text-muted-foreground">{t('admin.censorHint')}</p>
            </div>
            <Switch
              checked={db.isCensorEnabled()}
              onCheckedChange={(checked) => {
                db.setCensorEnabled(checked);
                bump();
              }}
            />
          </div>
        </TabsContent>
      </Tabs>
    </div>
  );
};

export default AdminPanel;
