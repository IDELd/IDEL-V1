import { useRef, useState } from "react";
import { useTranslation } from "react-i18next";
import {
  Brain,
  Calendar,
  Check,
  Coins,
  Palette,
  Trophy,
} from "lucide-react";
import { toast } from "sonner";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { useAuth } from "@/context/auth";
import * as db from "@/lib/db";
import type { AppEvent, EventType } from "@/lib/types";
import { cn } from "@/lib/utils";
import { UserAvatar } from "@/components/common/UserAvatar";
import { DrawingTool, type DrawingToolHandle } from "@/components/post/DrawingTool";

const TYPE_ICON: Record<EventType, typeof Palette> = {
  pixelwar: Palette,
  wordwar: Brain,
  popuwar: Trophy,
};

export function Events() {
  const { t, i18n } = useTranslation();
  const [version, setVersion] = useState(0);

  const events = db.getEvents();
  const bump = () => setVersion((v) => v + 1);

  const locale = (i18n.resolvedLanguage ?? "ru").startsWith("ru") ? "ru-RU" : "en-US";
  const formatDate = (iso: string) =>
    new Date(iso).toLocaleString(locale, {
      day: "numeric",
      month: "short",
      hour: "2-digit",
      minute: "2-digit",
    });

  return (
    <div className="space-y-4">
      <div className="px-1">
        <h1 className="text-xl font-bold">{t("events.title")}</h1>
        <p className="mt-0.5 text-xs text-muted-foreground">{t("events.participateHint")}</p>
      </div>

      {events.length === 0 ? (
        <div className="flex flex-col items-center gap-2 rounded-2xl border border-dashed border-border px-6 py-14 text-center">
          <Trophy className="h-8 w-8 text-muted-foreground" />
          <p className="text-sm text-muted-foreground">{t("events.noEvents")}</p>
        </div>
      ) : (
        <div className="space-y-3">
          {events.map((event) => (
            <EventCard
              key={event.id}
              event={event}
              formatDate={formatDate}
              onChange={bump}
            />
          ))}
        </div>
      )}
    </div>
  );
}

function EventCard({
  event,
  formatDate,
  onChange,
}: {
  event: AppEvent;
  formatDate: (iso: string) => string;
  onChange: () => void;
}) {
  const { t } = useTranslation();
  const { user } = useAuth();
  const Icon = TYPE_ICON[event.type];
  const now = Date.now();
  const start = +new Date(event.startAt);
  const end = +new Date(event.endAt);
  const isOpen = event.active && !event.finalized && now >= start && now <= end;
  const isUpcoming = now < start;
  const isEnded = now > end;

  const statusLabel = event.finalized
    ? t("events.finalized")
    : isOpen
      ? t("events.open")
      : isUpcoming
        ? t("events.notStarted")
        : t("events.ended");

  return (
    <article className="rounded-2xl border border-border bg-card p-4 shadow-soft">
      <div className="flex items-start gap-3">
        <span className="flex h-11 w-11 shrink-0 items-center justify-center rounded-xl bg-foreground text-background">
          <Icon className="h-5 w-5" />
        </span>
        <div className="min-w-0 flex-1">
          <div className="flex items-center gap-2">
            <h2 className="truncate text-sm font-bold">{event.title}</h2>
            <Badge
              variant="outline"
              className={cn(
                "shrink-0 text-[10px]",
                isOpen && "bg-foreground text-background",
              )}
            >
              {statusLabel}
            </Badge>
          </div>
          <p className="mt-0.5 text-[11px] font-medium text-muted-foreground">
            {t(`events.${event.type}`)}
          </p>
          {event.description && (
            <p className="mt-1 whitespace-pre-wrap break-words text-sm">{event.description}</p>
          )}
          {event.type === "pixelwar" && event.theme && (
            <p className="mt-1 text-xs">
              <span className="text-muted-foreground">{t("events.theme")}:</span>{" "}
              <strong>{event.theme}</strong>
            </p>
          )}

          <div className="mt-2 flex flex-wrap items-center gap-x-3 gap-y-1 text-[11px] text-muted-foreground">
            <span className="flex items-center gap-1">
              <Calendar className="h-3.5 w-3.5" />
              {formatDate(event.startAt)} — {formatDate(event.endAt)}
            </span>
            <span className="flex items-center gap-1">
              <Coins className="h-3.5 w-3.5" />
              {t("events.reward")}: {event.reward}
              {event.participationReward > 0 && ` / ${event.participationReward}`}
            </span>
          </div>
        </div>
      </div>

      {user && (
        <div className="mt-3 border-t pt-3">
          <Participation event={event} isOpen={isOpen} onChange={onChange} />
        </div>
      )}
    </article>
  );
}

function Participation({
  event,
  isOpen,
  onChange,
}: {
  event: AppEvent;
  isOpen: boolean;
  onChange: () => void;
}) {
  const { t } = useTranslation();
  const { user } = useAuth();
  if (!user) return null;

  if (event.finalized) {
    const winner = event.winnerId ? db.getUserById(event.winnerId) : undefined;
    return (
      <p className="text-xs text-muted-foreground">
        {t("events.winner")}:{" "}
        {winner ? <strong className="text-foreground">@{winner.username}</strong> : "—"}
      </p>
    );
  }

  if (!isOpen) return null;

  if (event.type === "pixelwar") return <PixelWarForm event={event} onChange={onChange} />;
  if (event.type === "wordwar") return <WordWarForm event={event} onChange={onChange} />;
  return <PopuWarBoard event={event} />;
}

function PixelWarForm({ event, onChange }: { event: AppEvent; onChange: () => void }) {
  const { t } = useTranslation();
  const { user } = useAuth();
  const drawingRef = useRef<DrawingToolHandle | null>(null);
  const submission = user ? db.getSubmission(event.id, user.id) : undefined;

  const submit = () => {
    if (!user) return;
    const drawing = drawingRef.current?.getDrawing();
    if (!drawing) {
      toast.error(t("drawing.hint"));
      return;
    }
    db.submitPixelWar(event.id, user.id, drawing);
    toast(t("events.submitted"));
    onChange();
  };

  if (submission?.drawingUrl) {
    return (
      <div className="space-y-2">
        <img src={submission.drawingUrl} alt="" className="w-full rounded-xl border" />
        <p className="flex items-center gap-1.5 text-xs font-medium text-muted-foreground">
          <Check className="h-4 w-4 text-foreground" />
          {t("events.submitted")}
        </p>
      </div>
    );
  }

  return (
    <div className="space-y-2">
      <DrawingTool ref={drawingRef} />
      <Button size="sm" onClick={submit}>
        {t("events.submitDrawing")}
      </Button>
    </div>
  );
}

function WordWarForm({ event, onChange }: { event: AppEvent; onChange: () => void }) {
  const { t } = useTranslation();
  const { user } = useAuth();
  const [answers, setAnswers] = useState<number[]>([]);
  const submission = user ? db.getSubmission(event.id, user.id) : undefined;

  if (!user) return null;

  const pick = (qIndex: number, optionIndex: number) => {
    setAnswers((prev) => {
      const next = [...prev];
      next[qIndex] = optionIndex;
      return next;
    });
  };

  const submit = () => {
    if (answers.length < event.questions.length) {
      toast.error(t("events.answerAll"));
      return;
    }
    const created = db.submitWordWar(event.id, user.id, answers);
    toast(t("events.submitted"));
    if (created.score !== null) {
      setTimeout(() => {
        toast(`${t("events.yourScore")}: ${created.score}/${event.questions.length}`);
      }, 300);
    }
    onChange();
  };

  if (submission) {
    return (
      <div className="space-y-2">
        <p className="text-xs font-medium">
          {t("events.yourScore")}: {submission.score}/{event.questions.length}
        </p>
        {event.questions.map((q, qi) => (
          <p key={qi} className="text-xs text-muted-foreground">
            {qi + 1}. {q.word} —{" "}
            <span className={cn(submission.answers?.[qi] === q.correctIndex ? "text-foreground" : "text-destructive")}>
              {q.options[submission.answers?.[qi] ?? 0]}
            </span>
            {submission.answers?.[qi] !== q.correctIndex && (
              <span className="text-muted-foreground">
                {" "}
                ({t("events.correct")}: {q.options[q.correctIndex]})
              </span>
            )}
          </p>
        ))}
      </div>
    );
  }

  return (
    <div className="space-y-3">
      {event.questions.map((q, qi) => (
        <div key={qi} className="rounded-xl bg-secondary/60 p-3">
          <p className="text-sm font-semibold">
            {qi + 1}. {q.word}
          </p>
          <div className="mt-2 grid grid-cols-2 gap-2">
            {q.options.map((option, oi) => (
              <button
                key={oi}
                type="button"
                onClick={() => pick(qi, oi)}
                className={cn(
                  "rounded-lg border px-2 py-1.5 text-xs transition-colors",
                  answers[qi] === oi
                    ? "border-foreground bg-foreground text-background"
                    : "border-border bg-card hover:border-foreground/40",
                )}
              >
                {option}
              </button>
            ))}
          </div>
        </div>
      ))}
      <Button size="sm" onClick={submit}>
        {t("events.submitAnswers")}
      </Button>
    </div>
  );
}

function PopuWarBoard({ event }: { event: AppEvent }) {
  const { t } = useTranslation();
  const ranked = db
    .getUsers()
    .map((u) => ({ user: u, points: db.getUserPoints(u.id) }))
    .sort((a, b) => b.points - a.points)
    .slice(0, 5);

  return (
    <div className="space-y-1.5">
      <p className="text-xs font-medium">{t("events.leaderboard")}</p>
      {ranked.filter((r) => r.points > 0).length === 0 ? (
        <p className="text-xs text-muted-foreground">{t("events.noSubmissions")}</p>
      ) : (
        ranked
          .filter((r) => r.points > 0)
          .map(({ user: u, points }, i) => (
            <div key={u.id} className="flex items-center gap-2 text-xs">
              <span className="w-4 tabular-nums text-muted-foreground">{i + 1}</span>
              <UserAvatar user={u} size="sm" className="h-6 w-6 text-[10px]" />
              <span className="min-w-0 flex-1 truncate font-medium">@{u.username}</span>
              <span className="tabular-nums text-muted-foreground">{points} {t("events.points")}</span>
            </div>
          ))
      )}
    </div>
  );
}
export default Events;