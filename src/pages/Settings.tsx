import React, { useState } from 'react';
import { useNavigate, Link } from 'react-router-dom';
import { useTranslation } from 'react-i18next';
import { AtSign, MessageCircle, ShieldCheck, Users } from 'lucide-react';
import { useAuth } from '../context/auth';
import * as db from '../lib/db';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
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

const Settings: React.FC = () => {
  const { t } = useTranslation();
  const { user, refresh, logout } = useAuth();
  const navigate = useNavigate();
  const [newUsername, setNewUsername] = useState('');
  const [usernameError, setUsernameError] = useState<string | null>(null);
  const [usernameSuccess, setUsernameSuccess] = useState(false);
  const [confirmDelete, setConfirmDelete] = useState(false);

  if (!user) {
    navigate('/login');
    return null;
  }

  const handleChangeUsername = () => {
    const username = newUsername.trim().toLowerCase();
    if (!username) return;
    setUsernameSuccess(false);
    try {
      db.changeUsername(user.id, username);
      refresh();
      setNewUsername('');
      setUsernameError(null);
      setUsernameSuccess(true);
      navigate(`/u/${username}`, { replace: true });
    } catch (err: unknown) {
      setUsernameError(err instanceof Error ? err.message : String(err));
    }
  };

  const handleDeleteAccount = () => {
    db.deleteAccount(user.id);
    logout();
    navigate('/login');
  };

  return (
    <div className="space-y-4">
      <h1 className="px-1 text-xl font-bold">{t('settings.title')}</h1>

      <div className="rounded-2xl border border-border bg-card p-5 shadow-soft">
        <h2 className="flex items-center gap-2 text-sm font-semibold">
          <AtSign className="h-4 w-4" />
          {t('settings.changeUsername')}
        </h2>
        <p className="mt-1 text-xs text-muted-foreground">{t('settings.changeUsernameHint')}</p>
        <div className="mt-3 space-y-2">
          <Input
            value={newUsername}
            onChange={(e) => setNewUsername(e.target.value)}
            placeholder={t('settings.newUsernamePlaceholder')}
          />
          {usernameError && <p className="text-xs font-medium text-destructive">{usernameError}</p>}
          {usernameSuccess && (
            <p className="text-xs font-medium text-emerald-600 dark:text-emerald-400">
              {t('settings.usernameChanged')}
            </p>
          )}
          <Button size="sm" onClick={handleChangeUsername} disabled={!newUsername.trim()}>
            {t('settings.changeUsernameButton')}
          </Button>
        </div>
      </div>

      <div className="rounded-2xl border border-border bg-card p-5 shadow-soft">
        <h2 className="text-sm font-semibold">{t('settings.more')}</h2>
        <div className="mt-3 grid gap-2">
          <Button variant="outline" className="justify-start" asChild>
            <Link to="/friends">
              <Users className="h-4 w-4" />
              {t('nav.friends')}
            </Link>
          </Button>
          <Button variant="outline" className="justify-start" asChild>
            <Link to="/chat">
              <MessageCircle className="h-4 w-4" />
              {t('nav.messages')}
            </Link>
          </Button>
          <Button variant="outline" className="justify-start" asChild>
            <Link to={`/chat/${db.getVerifyBotUser().id}`}>
              <ShieldCheck className="h-4 w-4" />
              @verifybot — {t('verifyBot.getVerified')}
            </Link>
          </Button>
        </div>
      </div>

      <div className="rounded-2xl border border-destructive/40 bg-destructive/5 p-5">
        <h2 className="text-sm font-semibold text-destructive">{t('settings.dangerZone')}</h2>
        <p className="mt-1 text-xs text-muted-foreground">{t('settings.deleteAccountHint')}</p>
        <Button
          size="sm"
          variant="destructive"
          className="mt-3"
          onClick={() => setConfirmDelete(true)}
        >
          {t('settings.deleteAccount')}
        </Button>
      </div>

      <AlertDialog open={confirmDelete} onOpenChange={setConfirmDelete}>
        <AlertDialogContent>
          <AlertDialogHeader>
            <AlertDialogTitle>{t('settings.deleteAccount')}</AlertDialogTitle>
            <AlertDialogDescription>{t('settings.deleteAccountConfirm')}</AlertDialogDescription>
          </AlertDialogHeader>
          <AlertDialogFooter>
            <AlertDialogCancel>{t('common.cancel')}</AlertDialogCancel>
            <AlertDialogAction onClick={handleDeleteAccount}>
              {t('settings.deleteAccount')}
            </AlertDialogAction>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>
    </div>
  );
};

export default Settings;
