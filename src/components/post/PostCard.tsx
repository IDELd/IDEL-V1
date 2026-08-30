import { useMemo, useState } from "react";
import { useTranslation } from "react-i18next";
import { Link } from "react-router-dom";
import { Heart, MessageCircle, Trash2 } from "lucide-react";
import { Button } from "@/components/ui/button";
import {
  AlertDialog,
  AlertDialogAction,
  AlertDialogCancel,
  AlertDialogContent,
  AlertDialogDescription,
  AlertDialogFooter,
  AlertDialogHeader,
  AlertDialogTitle,
} from "@/components/ui/alert-dialog";
import { useAuth } from "@/context/auth";
import * as db from "@/lib/db";
import type { Post } from "@/lib/types";
import { cn } from "@/lib/utils";
import { UserAvatar } from "@/components/common/UserAvatar";
import { VerificationBadge } from "@/components/common/VerificationBadge";
import { TimeAgo } from "@/components/common/TimeAgo";
import { CommentSection } from "./CommentSection";

export function PostCard({ post, onChange }: { post: Post; onChange: () => void }) {
  const { t } = useTranslation();
  const { user } = useAuth();
  const [version, setVersion] = useState(0);
  const [commentsOpen, setCommentsOpen] = useState(false);
  const [confirmDelete, setConfirmDelete] = useState(false);

  const author = useMemo(
    () => db.getUserById(post.userId),
    // eslint-disable-next-line react-hooks/exhaustive-deps
    [post.userId, version],
  );

  if (!author) return null;

  const liked = user ? db.hasLiked(post.id, user.id) : false;
  const likeCount = db.getLikeCount(post.id);
  const commentCount = db.getComments(post.id).length;
  const video = useMemo(
    () => db.getVideoForPost(post.id),
    // eslint-disable-next-line react-hooks/exhaustive-deps
    [post.id, version],
  );

  const toggleLike = () => {
    if (!user) return;
    db.toggleLike(post.id, user.id);
    setVersion((v) => v + 1);
    onChange();
  };

  const removePost = () => {
    db.deletePost(post.id);
    setConfirmDelete(false);
    onChange();
  };

  return (
    <article className="animate-fade-up rounded-2xl border border-border bg-card p-4 shadow-soft transition-colors hover:border-foreground/20">
      <div className="flex items-start gap-3">
        <Link to={`/u/${author.username}`} className="shrink-0">
          <UserAvatar user={author} size="md" />
        </Link>
        <div className="min-w-0 flex-1">
          <div className="flex items-center gap-1">
            <Link
              to={`/u/${author.username}`}
              className="truncate text-sm font-semibold hover:underline"
            >
              @{author.username}
            </Link>
            {author.verified && <VerificationBadge />}
          </div>
          <p className="truncate text-xs text-muted-foreground">{author.fullName}</p>
        </div>
        <div className="flex shrink-0 items-center gap-2">
          <TimeAgo iso={post.createdAt} className="text-xs text-muted-foreground" />
          {user?.id === author.id && (
            <Button
              size="icon"
              variant="ghost"
              className="h-7 w-7 text-muted-foreground hover:text-destructive"
              onClick={() => setConfirmDelete(true)}
              aria-label={t("post.deletePost")}
            >
              <Trash2 className="h-4 w-4" />
            </Button>
          )}
        </div>
      </div>

      {post.content && (
        <p className="mt-3 whitespace-pre-wrap break-words text-[15px] leading-relaxed">
          {post.content}
        </p>
      )}

      {post.imageUrl && (
        <img
          src={post.imageUrl}
          alt=""
          className="mt-3 w-full rounded-xl border border-border"
        />
      )}

      {post.drawingUrl && (
        <div className="mt-3 overflow-hidden rounded-xl border border-border">
          <img src={post.drawingUrl} alt="" className="w-full" />
        </div>
      )}

      {video && (
        <video
          src={video.videoUrl}
          controls
          preload="metadata"
          className="mt-3 w-full rounded-xl border border-border bg-black"
        />
      )}

      <div className="mt-3 flex items-center gap-1">
        <Button
          variant="ghost"
          size="sm"
          className={cn(
            "text-muted-foreground",
            liked && "text-foreground hover:text-foreground",
          )}
          onClick={toggleLike}
        >
          <Heart
            className={cn("h-4 w-4", liked && "animate-pop-in fill-foreground")}
          />
          <span className="tabular-nums">{likeCount}</span>
        </Button>
        <Button
          variant="ghost"
          size="sm"
          className="text-muted-foreground"
          onClick={() => setCommentsOpen((o) => !o)}
        >
          <MessageCircle className="h-4 w-4" />
          <span className="tabular-nums">{commentCount}</span>
        </Button>
      </div>

      {commentsOpen && <CommentSection postId={post.id} onChange={onChange} />}

      <AlertDialog open={confirmDelete} onOpenChange={setConfirmDelete}>
        <AlertDialogContent>
          <AlertDialogHeader>
            <AlertDialogTitle>{t("post.deletePost")}</AlertDialogTitle>
            <AlertDialogDescription>
              {t("post.deleteConfirm")}
            </AlertDialogDescription>
          </AlertDialogHeader>
          <AlertDialogFooter>
            <AlertDialogCancel>{t("common.cancel")}</AlertDialogCancel>
            <AlertDialogAction onClick={removePost}>
              {t("common.delete")}
            </AlertDialogAction>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>
    </article>
  );
}
