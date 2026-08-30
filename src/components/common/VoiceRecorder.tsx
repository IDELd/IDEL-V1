import { useEffect, useRef, useState } from "react";
import { useTranslation } from "react-i18next";
import { Loader2, Mic, Square } from "lucide-react";
import { toast } from "sonner";
import { Button } from "@/components/ui/button";
import { blobToDataUrl, formatDuration } from "@/lib/media";
import { cn } from "@/lib/utils";

export function VoiceRecorder({
  onRecorded,
  compact = false,
}: {
  onRecorded: (dataUrl: string, durationSeconds: number) => void;
  compact?: boolean;
}) {
  const { t } = useTranslation();
  const [recording, setRecording] = useState(false);
  const [saving, setSaving] = useState(false);
  const [seconds, setSeconds] = useState(0);
  const recorderRef = useRef<MediaRecorder | null>(null);
  const chunksRef = useRef<Blob[]>([]);
  const timerRef = useRef<number | null>(null);
  const startRef = useRef(0);

  useEffect(() => {
    return () => {
      if (timerRef.current) window.clearInterval(timerRef.current);
    };
  }, []);

  const start = async () => {
    if (!navigator.mediaDevices?.getUserMedia || typeof MediaRecorder === "undefined") {
      toast.error(t("common.micError"));
      return;
    }
    try {
      const stream = await navigator.mediaDevices.getUserMedia({ audio: true });
      const recorder = new MediaRecorder(stream);
      chunksRef.current = [];
      recorder.ondataavailable = (e) => {
        if (e.data.size > 0) chunksRef.current.push(e.data);
      };
      recorder.onstop = async () => {
        stream.getTracks().forEach((track) => track.stop());
        const mimeType = recorder.mimeType || "audio/webm";
        const blob = new Blob(chunksRef.current, { type: mimeType });
        const duration = (Date.now() - startRef.current) / 1000;
        setSaving(true);
        const dataUrl = await blobToDataUrl(blob);
        setSaving(false);
        onRecorded(dataUrl, duration);
      };
      recorderRef.current = recorder;
      startRef.current = Date.now();
      setSeconds(0);
      recorder.start();
      setRecording(true);
      timerRef.current = window.setInterval(
        () => setSeconds((s) => s + 1),
        1000,
      );
    } catch {
      toast.error(t("common.micError"));
    }
  };

  const stop = () => {
    if (recorderRef.current && recorderRef.current.state === "recording") {
      recorderRef.current.stop();
    }
    if (timerRef.current) window.clearInterval(timerRef.current);
    setRecording(false);
  };

  if (recording) {
    return (
      <Button
        size={compact ? "icon" : "sm"}
        variant="destructive"
        className={cn("animate-pulse", compact && "h-9 w-9")}
        onClick={stop}
      >
        <Square className="h-4 w-4" />
        {!compact && formatDuration(seconds)}
      </Button>
    );
  }

  return (
    <Button
      size={compact ? "icon" : "sm"}
      variant="ghost"
      className={compact && "h-9 w-9"}
      onClick={start}
      disabled={saving}
      title={t("post.recordVoice")}
    >
      {saving ? <Loader2 className="h-4 w-4 animate-spin" /> : <Mic className="h-4 w-4" />}
      {!compact && t("post.recordVoice")}
    </Button>
  );
}
