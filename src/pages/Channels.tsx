import { useState } from "react";
import { useTranslation } from "react-i18next";
import { Link } from "react-router-dom";
import { Hash, Plus } from "lucide-react";
import { toast } from "sonner";
import { Button } from "@/components/ui/button";
import {
  Dialog,
  DialogContent,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import { useAuth } from "@/context/auth";
import * as db from "@/lib/db";
import { UserAvatar } from "@/components/common/UserAvatar";

export function Channels() {
  const { t } = useTranslation();
  const { user } = useAuth();
  const [version, setVersion] = useState(0);
  const [open, setOpen] = useState(false);
  const [name, setName] = useState("");
  const [description, setDescription] = useState("");

  const channels = db.getChannels();
  const owners = new Map(
    channels.map((c) => [c.ownerId, db.getUserById(c.ownerId)]),
  );

  const create = () => {
    if (!user || !name.trim()) {
      toast.error(t("channels.needName"));
      return;
    }
    db.createChannel({ name, description, ownerId: user.id });
    setName("");
    setDescription("");
    setOpen(false);
    setVersion((v) => v + 1);
  };

  return (
    <div className="space-y-4">
      <div className="flex items-center justify-between px-1">
        <h1 className="text-xl font-bold">{t("channels.title")}</h1>
        <Button size="sm" onClick={() => setOpen(true)}>
          <Plus className="h-4 w-4" />
          {t("channels.create")}
        </Button>
      </div>

      {channels.length === 0 ? (
        <div className="flex flex-col items-center gap-2 rounded-2xl border border-dashed border-border px-6 py-14 text-center">
          <Hash className="h-8 w-8 text-muted-foreground" />
          <p className="text-sm text-muted-foreground">{t("channels.empty")}</p>
        </div>
      ) : (
        <div className="space-y-2">
          {channels.map((channel) => {
            const owner = owners.get(channel.ownerId);
            const postCount = db.getChannelPosts(channel.id).length;
            return (
              <Link
                key={channel.id}
                to={`/channels/${channel.id}`}
                className="block rounded-2xl border border-border bg-card p-4 shadow-soft transition-all hover:border-foreground/30"
              >
                <div className="flex items-center gap-3">
                  <span className="flex h-11 w-11 shrink-0 items-center justify-center rounded-xl bg-foreground text-lg text-background">
                    <Hash className="h-5 w-5" />
                  </span>
                  <div className="min-w-0 flex-1">
                    <p className="truncate text-sm font-semibold">{channel.name}</p>
                    <p className="truncate text-xs text-muted-foreground">
                      {channel.description || "—"}
                    </p>
                  </div>
                </div>
                <div className="mt-3 flex items-center gap-2 border-t pt-2.5 text-xs text-muted-foreground">
                  <span>{postCount} {t("profile.posts")}</span>
                  {owner && (
                    <span className="flex min-w-0 items-center gap-1.5">
                      <UserAvatar user={owner} size="sm" className="h-5 w-5 text-[9px]" />
                      <span className="truncate">@{owner.username}</span>
                    </span>
                  )}
                </div>
              </Link>
            );
          })}
        </div>
      )}

      <Dialog open={open} onOpenChange={setOpen}>
        <DialogContent className="max-w-sm">
          <DialogHeader>
            <DialogTitle>{t("channels.create")}</DialogTitle>
          </DialogHeader>
          <div className="space-y-3">
            <div className="space-y-1.5">
              <Label htmlFor="channel-name">{t("channels.name")}</Label>
              <Input
                id="channel-name"
                value={name}
                onChange={(e) => setName(e.target.value)}
                placeholder={t("channels.namePlaceholder")}
                maxLength={40}
              />
            </div>
            <div className="space-y-1.5">
              <Label htmlFor="channel-desc">{t("channels.description")}</Label>
              <Textarea
                id="channel-desc"
                value={description}
                onChange={(e) => setDescription(e.target.value)}
                placeholder={t("channels.descPlaceholder")}
                rows={3}
                className="resize-none"
              />
            </div>
          </div>
          <DialogFooter>
            <Button variant="ghost" onClick={() => setOpen(false)}>
              {t("common.cancel")}
            </Button>
            <Button onClick={create}>{t("channels.createButton")}</Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </div>
  );
}
export default Channels;