import { useCallback, useEffect, useRef, useState } from "react";
import { Loader2, Monitor, RotateCcw, Square } from "lucide-react";

import { requestScreenPreview, stopScreenPreview } from "@/lib/screen-preview";
import { useT, type Translate } from "@/i18n";
import { useDesktopCapabilities } from "./DesktopCapabilities";

type PreviewPhase =
  | "idle"
  | "requesting"
  | "streaming"
  | "cancelled"
  | "ended"
  | "unavailable"
  | "error";

function phaseCopy(t: Translate): Record<Exclude<PreviewPhase, "requesting" | "streaming">, string> {
  return {
    idle: t("misc.localScreenPreview.idleHint"),
    cancelled: t("misc.localScreenPreview.cancelled"),
    ended: t("misc.localScreenPreview.ended"),
    unavailable: t("misc.localScreenPreview.unavailable"),
    error: t("misc.localScreenPreview.error"),
  };
}

export function LocalScreenPreview() {
  const { t } = useT();
  const copy = phaseCopy(t);
  const { capabilities, ready } = useDesktopCapabilities();
  const preview = capabilities.screenPreview;
  const isLinux = capabilities.host.platform === "linux";
  const [phase, setPhase] = useState<PreviewPhase>("idle");
  const [message, setMessage] = useState(copy.idle);
  const [sourceLabel, setSourceLabel] = useState(() => t("misc.localScreenPreview.selectedScreen"));
  const videoRef = useRef<HTMLVideoElement>(null);
  const streamRef = useRef<MediaStream | null>(null);
  const requestId = useRef(0);

  const releaseStream = useCallback((nextPhase: PreviewPhase, nextMessage: string) => {
    requestId.current += 1;
    const stream = streamRef.current;
    streamRef.current = null;
    if (videoRef.current) videoRef.current.srcObject = null;
    stopScreenPreview(stream);
    setPhase(nextPhase);
    setMessage(nextMessage);
  }, []);

  useEffect(
    () => () => {
      requestId.current += 1;
      const stream = streamRef.current;
      streamRef.current = null;
      stopScreenPreview(stream);
    },
    [],
  );

  const start = async () => {
    if (
      !preview.available ||
      !window.ogb?.beginScreenPreviewIntent ||
      !navigator.mediaDevices?.getDisplayMedia
    ) {
      setPhase("unavailable");
      setMessage(copy.unavailable);
      return;
    }

    releaseStream("requesting", t("misc.localScreenPreview.choosing"));
    const currentRequest = requestId.current;
    const result = await requestScreenPreview({
      beginIntent: () => window.ogb!.beginScreenPreviewIntent(),
      getDisplayMedia: (constraints) => navigator.mediaDevices.getDisplayMedia(constraints),
    });

    if (currentRequest !== requestId.current) {
      if (result.ok) stopScreenPreview(result.stream);
      return;
    }
    if (!result.ok) {
      setPhase(result.phase);
      setMessage(result.message);
      return;
    }

    const stream = result.stream;
    const videoTrack = stream.getVideoTracks()[0];
    streamRef.current = stream;
    setSourceLabel(videoTrack.label || t("misc.localScreenPreview.selectedScreen"));
    videoTrack.addEventListener(
      "ended",
      () => {
        if (streamRef.current !== stream) return;
        releaseStream("ended", copy.ended);
      },
      { once: true },
    );
    const video = videoRef.current;
    if (!video) {
      releaseStream("error", t("misc.localScreenPreview.displayFailed"));
      return;
    }
    video.srcObject = stream;
    try {
      await video.play();
    } catch {
      if (currentRequest === requestId.current && streamRef.current === stream) {
        releaseStream("error", t("misc.localScreenPreview.displayFailed"));
      }
      return;
    }
    if (currentRequest !== requestId.current || streamRef.current !== stream) return;
    setPhase("streaming");
    setMessage(t("misc.localScreenPreview.activeNote"));
  };

  if (!isLinux) return null;
  const retry =
    phase === "cancelled" || phase === "ended" || phase === "unavailable" || phase === "error";

  return (
    <section className="mt-4 rounded-xl bg-card p-4" aria-labelledby="local-preview-title">
      <div className="flex items-start justify-between gap-3">
        <div>
          <div id="local-preview-title" className="text-[15px] font-medium text-ink">
            {t("misc.localScreenPreview.panelTitle")}
          </div>
          <div className="mt-0.5 text-[12px] leading-relaxed text-ink-secondary">
            {t("misc.localScreenPreview.panelHint")}
          </div>
        </div>
        <span className="shrink-0 rounded-full bg-raised px-2 py-1 text-[10px] font-medium text-ink-secondary">
          {t("misc.localScreenPreview.badge")}
        </span>
      </div>

      <div className="relative mt-3 flex aspect-[16/10] items-center justify-center overflow-hidden rounded-lg bg-panel">
        <video
          ref={videoRef}
          autoPlay
          muted
          playsInline
          aria-label={t("misc.localScreenPreview.videoAria")}
          className={phase === "streaming" ? "h-full w-full object-contain" : "hidden"}
        />
        {phase !== "streaming" && (
          <div className="flex flex-col items-center gap-2 px-6 text-center text-ink-secondary">
            {phase === "requesting" ? (
              <Loader2 size={18} className="animate-spin" />
            ) : (
              <Monitor size={22} />
            )}
            <span className="text-[12px]" aria-live="polite">
              {!ready
                ? t("misc.localScreenPreview.checking")
                : preview.available
                  ? message
                  : copy.unavailable}
            </span>
          </div>
        )}
      </div>

      {phase === "streaming" && (
        <div className="mt-2 flex items-center justify-between gap-3 text-[11px] text-ink-secondary">
          <span className="truncate" title={sourceLabel}>
            {preview.interaction === "portal-picker" ? sourceLabel : t("misc.localScreenPreview.thisComputer")}
          </span>
          <span className="flex items-center gap-1.5 text-success">
            <span className="h-1.5 w-1.5 rounded-full bg-success" /> {t("misc.localScreenPreview.sharing")}
          </span>
        </div>
      )}

      <button
        type="button"
        disabled={phase === "requesting" || (!preview.available && phase !== "streaming")}
        onClick={
          phase === "streaming"
            ? () => releaseStream("idle", copy.idle)
            : () => void start()
        }
        className="mt-3 flex w-full items-center justify-center gap-2 rounded-lg bg-raised py-2 text-[13px] text-ink hover:bg-raised-hover disabled:cursor-not-allowed disabled:opacity-50"
      >
        {phase === "requesting" ? (
          <Loader2 size={14} className="animate-spin" />
        ) : phase === "streaming" ? (
          <Square size={13} />
        ) : retry ? (
          <RotateCcw size={14} />
        ) : (
          <Monitor size={14} />
        )}
        {phase === "requesting"
          ? t("misc.localScreenPreview.choosingShort")
          : phase === "streaming"
            ? t("misc.localScreenPreview.stop")
            : retry
              ? t("misc.localScreenPreview.tryAgain")
              : preview.interaction === "portal-picker"
                ? t("misc.localScreenPreview.choose")
                : t("misc.localScreenPreview.start")}
      </button>
    </section>
  );
}
