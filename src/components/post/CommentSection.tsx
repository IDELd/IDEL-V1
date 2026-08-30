import { useState } from "react";
import { useTranslation } from "react-i18next";
import { Link } from "react-router-dom";
import { Send, Trash2 } from "lucide-react";
import { toast } from "sonner";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { useAuth } from "@/context/auth";
import * as db from "@/lib/db";
import { UserAvatar } from "@/components/common/UserAvatar";
import { VerificationBadge } from "@/components/common/VerificationBadge";
import { TimeAgo } from "@/components/common/TimeAgo";
import { AudioPlayer } from "@/components/common/AudioPlayer";
import { VoiceRecorder } from "@/components/common/VoiceRecorder";

export function CommentSection({
  postId,
  onChange,
}: {
  postId: string;
  onChange: () => void;
}) {
  const { t } = useTranslation();
  const { user } = useAuth();
  const [text, setText] = useState("");
  const [version, setVersion] = useState(0);

  // Read fresh from the data layer on every render; re-renders are driven by
  // the local `version` bump after any mutation.
  const comments = db.getComments(postId);
  const usersById = new Map(
    comments.map((comment) => [comment.userId, db.getUserById(comment.userId)]),
  );

  const bump = () => {
    setVersion((v) => v + 1);
    onChange();
  };

  const submit = () => {
    if (!user || !text.trim()) return;
    const created = db.createComment({
      postId,
      userId: user.id,
      content: text.trim(),
      voiceUrl: null,
      duration: null,
    });
    if (created.censored) toast(t("common.editedByCensor"));
    setText("");
    bump();
  };

  const onVoice = (dataUrl: string, duration: number) => {
    if (!user) return;
    db.createComment({
      postId,
      userId: user.id,
      content: null,
      voiceUrl: dataUrl,
      duration,
    });
    bump();
  };

  const remove = (id: string) => {
    db.deleteComment(id);
    bump();
  };

  return (
    <div className="space-y-3 border-t pt-3">
      <div className="space-y-3">
        {comments.length === 0 && (
          <p className="text-xs text-muted-foreground">{t("post.noComments")}</p>
        )}
        {comments.map((comment) => {
          const author = usersById.get(comment.userId);
          if (!author) return null;
          return (
            <div key={comment.id} className="flex items-start gap-2.5">
              <Link to={`/u/${author.username}`} className="shrink-0">
                <UserAvatar user={author} size="sm" />
              </Link>
              <div className="min-w-0 flex-1 rounded-xl bg-secondary/60 px-3 py-2">
                <div className="flex items-baseline gap-1.5">
                  <Link
                    to={`/u/${author.username}`}
                    className="flex items-center gap-1 text-xs font-semibold hover:underline"
                  >
                    @{author.username}
                    {author.verified && <VerificationBadge />}
                  </Link>
                  <TimeAgo
                    iso={comment.createdAt}
                    className="text-[10px] text-muted-foreground"
                  />
                  {user?.id === comment.userId && (
                    <Button
                      size="icon"
                      variant="ghost"
                      className="ml-auto h-5 w-5 text-muted-foreground hover:text-destructive"
                      onClick={() => remove(comment.id)}
                      aria-label={t("post.deleteComment")}
                    >
                      <Trash2 className="h-3 w-3" />
                    </Button>
                  )}
                </div>
                {comment.content && (
                  <p className="mt-0.5 whitespace-pre-wrap break-words text-sm">
                    {comment.content}
                  </p>
                )}
                {comment.voiceUrl && (
                  <AudioPlayer
                    src={comment.voiceUrl}
                    duration={comment.duration ?? 0}
                    className="mt-1.5"
                  />
                )}
              </div>
            </div>
          );
        })}
      </div>

      <div className="flex items-center gap-2">
        <Input
          value={text}
          onChange={(e) => setText(e.target.value)}
          onKeyDown={(e) => {
            if (e.key === "Enter") submit();
          }}
          placeholder={t("post.commentPlaceholder")}
          className="h-9"
        />
        <Button size="icon" className="h-9 w-9 shrink-0" onClick={submit} disabled={!text.trim()}>
          <Send className="h-4 w-4" />
        </Button>
        <VoiceRecorder onRecorded={onVoice} compact />
      </div>
    </div>
  );
}
