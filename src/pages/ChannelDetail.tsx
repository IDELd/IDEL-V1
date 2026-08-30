import { useMemo, useRef, useState } from "react";
import { useTranslation } from "react-i18next";
import { Link, useParams } from "react-router-dom";
import { Hash, ImagePlus, Paintbrush, Send, Trash2, X } from "lucide-react";
import { toast } from "sonner";
import { Button } from "@/components/ui/button";
import { Textarea } from "@/components/ui/textarea";
import { useAuth } from "@/context/auth";
import * as db from "@/lib/db";
import { downscaleImage, fileToDataUrl } from "@/lib/media";
import { UserAvatar } from "@/components/common/UserAvatar";
import { VerificationBadge } from "@/components/common/VerificationBadge";
import { TimeAgo } from "@/components/common/TimeAgo";
import { DrawingTool, type DrawingToolHandle } from "@/components/post/DrawingTool";

export function ChannelDetail() {
  const { t } = useTranslation();
  const { id } = useParams<{ id: string }>();
  const { user } = useAuth();
  const [version, setVersion] = useState(0);
  const [content, setContent] = useState("");
  const [image, setImage] = useState<string | null>(null);
  const [drawingMode, setDrawingMode] = useState(false);
  const drawingRef = useRef<DrawingToolHandle | null>(null);
  const fileRef = useRef<HTMLInputElement | null>(null);

  const channel = useMemo(
    () => (id ? db.getChannel(id) : undefined),
    // eslint-disable-next-line react-hooks/exhaustive-deps
    [id, version],
  );
  const posts = useMemo(
    () => (id ? db.getChannelPosts(id) : []),
    // eslint-disable-next-line react-hooks/exhaustive-deps
    [id, version],
  );
  const usersById = useMemo(
    () => new Map(db.getUsers().map((u) => [u.id, u])),
    // eslint-disable-next-line react-hooks/exhaustive-deps
    [version],
  );

  if (!channel) {
    return (
      <div className="rounded-2xl border border-dashed border-border px-6 py-16 text-center">
        <p className="text-sm text-muted-foreground">{t("channels.notFound")}</p>
        <Button variant="outline" className="mt-4" asChild>
          <Link to="/channels">{t("channels.title")}</Link>
        </Button>
      </div>
    );
  }

  const handleFile = async (file?: File) => {
    if (!file || !file.type.startsWith("image/")) return;
    const raw = await fileToDataUrl(file);
    setImage(await downscaleImage(raw));
    if (fileRef.current) fileRef.current.value = "";
  };

  const publish = () => {
    if (!user) return;
    const drawing = drawingMode ? drawingRef.current?.getDrawing() ?? null : null;
    if (!content.trim() && !image && !drawing) {
      toast.error(t("post.needContent"));
      return;
    }
    const created = db.createChannelPost({
      channelId: channel.id,
      userId: user.id,
      content,
      imageUrl: image,
      drawingUrl: drawing,
    });
    if (created.censored) toast(t("common.editedByCensor"));
    setContent("");
    setImage(null);
    setDrawingMode(false);
    setVersion((v) => v + 1);
  };

  const removePost = (postId: string) => {
    db.deleteChannelPost(postId);
    setVersion((v) => v + 1);
  };

  return (
    <div className="space-y-4">
      <div className="rounded-2xl border border-border bg-card p-4 shadow-soft">
        <div className="flex items-center gap-3">
          <span className="flex h-11 w-11 shrink-0 items-center justify-center rounded-xl bg-foreground text-background">
            <Hash className="h-5 w-5" />
          </span>
          <div className="min-w-0">
            <h1 className="truncate text-lg font-bold">{channel.name}</h1>
            <p className="truncate text-xs text-muted-foreground">
              {channel.description || "—"}
            </p>
          </div>
        </div>
      </div>

      <div className="rounded-2xl border border-border bg-card p-4 shadow-soft">
        <Textarea
          value={content}
          onChange={(e) => setContent(e.target.value)}
          placeholder={t("channels.postPlaceholder")}
          rows={2}
          className="resize-none"
        />
        <div className="mt-2 flex items-center gap-2">
          <Button
            variant="outline"
            size="sm"
            type="button"
            onClick={() => fileRef.current?.click()}
          >
            <ImagePlus className="h-4 w-4" />
            {t("post.attachImage")}
          </Button>
          <Button
            variant={drawingMode ? "default" : "outline"}
            size="sm"
            type="button"
            onClick={() => setDrawingMode((d) => !d)}
          >
            <Paintbrush className="h-4 w-4" />
            {t("post.attachDrawing")}
          </Button>
          <input
            ref={fileRef}
            type="file"
            accept="image/*"
            className="hidden"
            onChange={(e) => void handleFile(e.target.files?.[0])}
          />
          <Button size="sm" className="ml-auto" onClick={publish}>
            <Send className="h-4 w-4" />
            {t("common.publish")}
          </Button>
        </div>

        {image && (
          <div className="relative mt-3 overflow-hidden rounded-xl border">
            <img src={image} alt="" className="w-full" />
            <Button
              type="button"
              size="icon"
              variant="secondary"
              className="absolute right-2 top-2 h-7 w-7 rounded-full"
              onClick={() => setImage(null)}
            >
              <X className="h-4 w-4" />
            </Button>
          </div>
        )}
        {drawingMode && <div className="mt-3"><DrawingTool ref={drawingRef} /></div>}
      </div>

      {posts.length === 0 ? (
        <p className="rounded-2xl border border-dashed border-border px-6 py-10 text-center text-sm text-muted-foreground">
          {t("channels.noPosts")}
        </p>
      ) : (
        <div className="space-y-3">
          {posts.map((post) => {
            const author = usersById.get(post.userId);
            if (!author) return null;
            return (
              <article key={post.id} className="rounded-2xl border border-border bg-card p-4 shadow-soft">
                <div className="flex items-start gap-2.5">
                  <Link to={`/u/${author.username}`} className="shrink-0">
                    <UserAvatar user={author} size="sm" />
                  </Link>
                  <div className="min-w-0 flex-1">
                    <div className="flex items-center gap-1">
                      <Link
                        to={`/u/${author.username}`}
                        className="truncate text-xs font-semibold hover:underline"
                      >
                        @{author.username}
                      </Link>
                      {author.verified && <VerificationBadge />}
                      <TimeAgo
                        iso={post.createdAt}
                        className="ml-auto shrink-0 text-[10px] text-muted-foreground"
                      />
                    </div>
                    {post.content && (
                      <p className="mt-1 whitespace-pre-wrap break-words text-sm">
                        {post.content}
                      </p>
                    )}
                    {post.imageUrl && (
                      <img src={post.imageUrl} alt="" className="mt-2 w-full rounded-xl border" />
                    )}
                    {post.drawingUrl && (
                      <div className="mt-2 overflow-hidden rounded-xl border">
                        <img src={post.drawingUrl} alt="" className="w-full" />
                      </div>
                    )}
                    {user?.id === post.userId && (
                      <Button
                        size="icon"
                        variant="ghost"
                        className="mt-1.5 h-6 w-6 text-muted-foreground hover:text-destructive"
                        onClick={() => removePost(post.id)}
                        aria-label={t("common.delete")}
                      >
                        <Trash2 className="h-3.5 w-3.5" />
                      </Button>
                    )}
                  </div>
                </div>
              </article>
            );
          })}
        </div>
      )}
    </div>
  );
}
export default ChannelDetail;