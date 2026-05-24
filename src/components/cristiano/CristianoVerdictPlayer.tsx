"use client";

/**
 * CristianoVerdictPlayer
 *
 * The presentation surface for a single Cristiano verdict. Mounts
 * `<OliviaVideoAvatar personaId="cristiano" hideOverlays={false} />`,
 * fetches its imperative ref, and calls `presentVerdict(script)` when
 * the verdict is ready to play.
 *
 * Two play modes — controlled by the `mode` prop:
 *
 *   "live"       Already-rendered verdict, narrate now via LiveAvatar
 *                LITE. Default. Use for the Verdict Library replay
 *                and the Ask Cristiano live-narration moment.
 *
 *   "video"      Pre-rendered MP4 (e.g. lifescore HeyGen Video Agent
 *                V2 output). Show the <video> element with controls.
 *                Skips the LiveAvatar pipeline entirely so the user
 *                isn't paying for narration credits when there's
 *                already a stored video.
 *
 * Held to Apple / Microsoft / Google 2026 leading coding practices per
 * `~/CLAUDE.md` and `docs/api-specs/_MASTER_REGISTER.md §10.4`.
 */

import { useCallback, useEffect, useRef, useState } from "react";

import {
  OliviaVideoAvatar,
  type OliviaVideoAvatarRef,
  type PresentVerdictOutcome,
} from "@/components/olivia/OliviaVideoAvatar";
import type { CristianoVerdictRecord } from "@/lib/cristiano/types";

// ─── Props ───────────────────────────────────────────────────────────────────

export interface CristianoVerdictPlayerProps {
  /** The verdict to present. Required. */
  verdict: CristianoVerdictRecord;

  /**
   * Whether to narrate via LiveAvatar ("live") or play the
   * pre-rendered MP4 ("video"). If `mode` is undefined, the player
   * picks "video" when `preRenderedVideoUrl` is set, else "live".
   */
  mode?: "live" | "video";

  /**
   * When true, the player calls `presentVerdict` immediately on
   * mount (live mode) OR auto-plays the video (video mode). Default
   * false — caller drives via a "Play" button.
   */
  autoPlay?: boolean;

  /**
   * When true (live mode only), the LiveAvatar session disconnects
   * after the script narrates. Default true — verdicts are one-way
   * pronouncements, the session should close after the verdict.
   */
  autoDisconnect?: boolean;

  /** Fired when the narration finishes (or fails). */
  onPlaybackComplete?: (outcome: PresentVerdictOutcome) => void;
}

// ─── Component ───────────────────────────────────────────────────────────────

export function CristianoVerdictPlayer({
  verdict,
  mode,
  autoPlay = false,
  autoDisconnect = true,
  onPlaybackComplete,
}: CristianoVerdictPlayerProps) {
  const avatarRef = useRef<OliviaVideoAvatarRef | null>(null);
  const videoRef = useRef<HTMLVideoElement | null>(null);

  // Resolve effective mode if unspecified.
  const effectiveMode: "live" | "video" =
    mode ?? (verdict.preRenderedVideoUrl ? "video" : "live");

  const [playbackState, setPlaybackState] = useState<
    "idle" | "playing" | "finished" | "failed"
  >("idle");
  const [errorReason, setErrorReason] = useState<PresentVerdictOutcome | null>(
    null,
  );

  // ── Live narration (LiveAvatar LITE) ──
  const playLive = useCallback(async () => {
    const ref = avatarRef.current;
    if (!ref) return;
    setPlaybackState("playing");
    setErrorReason(null);
    const outcome = await ref.presentVerdict(verdict.spokenScript, {
      autoDisconnect,
    });
    if (outcome === "done") {
      setPlaybackState("finished");
    } else {
      setPlaybackState("failed");
      setErrorReason(outcome);
    }
    onPlaybackComplete?.(outcome);
  }, [verdict.spokenScript, autoDisconnect, onPlaybackComplete]);

  // ── Pre-rendered video ──
  const playVideo = useCallback(() => {
    const el = videoRef.current;
    if (!el) return;
    setPlaybackState("playing");
    setErrorReason(null);
    el.play().catch((err: Error) => {
      console.warn(
        "[CristianoVerdictPlayer] video play failed:",
        err.message,
      );
      setPlaybackState("failed");
      setErrorReason("voice_unavailable");
    });
  }, []);

  // ── Auto-play on mount ──
  useEffect(() => {
    if (!autoPlay) return;
    if (effectiveMode === "live") {
      void playLive();
    } else {
      playVideo();
    }
    // Run once on mount — autoPlay state changes shouldn't retrigger.
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  // ── Render ──
  // L4 audit fix: the player is a meaningful landmark — role="region"
  // + aria-labelledby pointing to the h3 lets SR users navigate to it
  // via landmark rotor (iOS) or D-key (Windows). titleId scopes the
  // h3 id to the verdict so multiple players on the same page
  // (Verdict Library expanded rows) don't collide on duplicate ids.
  const titleId = `verdict-title-${verdict.id}`;
  return (
    <div
      className="cristiano-verdict-player rounded-xl border border-aurum/20 bg-onyx/90 p-4 space-y-3"
      role="region"
      aria-labelledby={titleId}
      data-testid="cristiano-verdict-player"
      data-mode={effectiveMode}
      data-state={playbackState}
    >
      {/* Verdict header */}
      <header className="space-y-1">
        <h3
          id={titleId}
          className="text-base font-semibold text-fog"
          data-testid="verdict-title"
        >
          {verdict.verdictTitle}
        </h3>
        <p
          className="font-mono text-[10px] uppercase tracking-[0.18em] text-fog/80"
          data-testid="verdict-kind-tag"
        >
          {verdict.kind.replace(/_/g, " ")} · {verdict.sourceApp}
        </p>
      </header>

      {/* Player surface */}
      {effectiveMode === "live" ? (
        <OliviaVideoAvatar
          ref={avatarRef}
          personaId="cristiano"
          hideOverlays={false}
        />
      ) : (
        <video
          ref={videoRef}
          src={verdict.preRenderedVideoUrl ?? undefined}
          poster={verdict.thumbnailUrl ?? undefined}
          controls
          preload="metadata"
          crossOrigin={verdict.captionsUrl ? "anonymous" : undefined}
          className="w-full rounded-lg bg-black"
          aria-label={`Pre-rendered verdict video: ${verdict.verdictTitle}`}
          onPlay={() => setPlaybackState("playing")}
          onEnded={() => {
            setPlaybackState("finished");
            onPlaybackComplete?.("done");
          }}
          onError={() => {
            setPlaybackState("failed");
            setErrorReason("voice_unavailable");
            onPlaybackComplete?.("voice_unavailable");
          }}
        >
          {/* WebVTT captions track — WCAG 1.2.2 Level A.
              When the source app ships captions, they render alongside
              video playback. Independent of the transcript <details>
              below (which covers WCAG 1.2.3 media-alternative). */}
          {verdict.captionsUrl ? (
            <track
              kind="captions"
              srcLang="en"
              label="English captions"
              src={verdict.captionsUrl}
              default
              data-testid="verdict-captions-track"
            />
          ) : null}
        </video>
      )}

      {/* Play button — visible when idle */}
      {playbackState === "idle" && !autoPlay && (
        <button
          type="button"
          onClick={effectiveMode === "live" ? playLive : playVideo}
          className="inline-flex min-h-[44px] items-center gap-2 rounded-md border border-aurum/40 bg-aurum/10 px-4 py-2 text-sm font-medium text-aurum hover:bg-aurum/20 focus:outline-none focus-visible:ring-2 focus-visible:ring-aurum/60"
          aria-label={`Play verdict: ${verdict.verdictTitle}`}
          data-testid="verdict-play-button"
        >
          <svg
            width="14"
            height="14"
            viewBox="0 0 24 24"
            fill="currentColor"
            aria-hidden="true"
          >
            <polygon points="5 3 19 12 5 21" />
          </svg>
          Play verdict
        </button>
      )}

      {/* Failure surface */}
      {playbackState === "failed" && (
        <p
          role="alert"
          className="text-xs text-red-300"
          data-testid="verdict-error"
        >
          Verdict playback unavailable
          {errorReason ? ` (${errorReason})` : ""}. The transcript below is
          the canonical record.
        </p>
      )}

      {/* Accessibility fallback — verdict text always rendered. The
          script is what Cristiano would say; users with audio muted
          or voice unavailable still get the verdict. Aligns with
          HEYGEN_LTM_CONFIG.md §11 fallback policy. */}
      <details
        className="rounded-md border border-fog/10 bg-onyx/60 p-3 text-sm text-fog/80"
        data-testid="verdict-transcript"
      >
        {/* L5 audit fix: explicit focus-visible ring on the summary so
            keyboard users get a visible focus indicator consistent with
            the rest of the surface (browser-default summary focus
            outline varies). rounded-sm gives the ring a clean shape. */}
        <summary className="cursor-pointer rounded-sm font-mono text-[11px] uppercase tracking-[0.18em] text-fog/80 focus:outline-none focus-visible:ring-2 focus-visible:ring-aurum/50">
          Verdict transcript
        </summary>
        <p className="mt-2 whitespace-pre-wrap leading-relaxed">
          {verdict.spokenScript}
        </p>
      </details>
    </div>
  );
}
