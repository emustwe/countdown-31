"use client";

import { useEffect, useRef, useState, useCallback } from "react";
import { ExternalLink } from "lucide-react";
import {
  campaignCauseProgress,
  resolveCampaignAssetUrl,
  sendCampaignEventsBatch,
  type CampaignEventItem,
  type TournamentCampaignManifest,
} from "../../lib/hooks/useTournamentCampaign";

function getDeviceClass(): "desktop" | "tablet" | "mobile" {
  if (typeof window === "undefined") return "desktop";
  const width = window.innerWidth;
  if (width < 640) return "mobile";
  if (width < 1024) return "tablet";
  return "desktop";
}

function SponsorLogo({
  manifest,
  onLoop,
}: {
  manifest: TournamentCampaignManifest;
  onLoop?: () => void;
}) {
  const [failed, setFailed] = useState(false);
  const mediaUrl = resolveCampaignAssetUrl(manifest.logoTile.mediaUrl);
  useEffect(() => setFailed(false), [mediaUrl]);

  if (mediaUrl && !failed) {
    return manifest.logoTile.mediaType === "video" ? (
      <video
        src={mediaUrl}
        muted
        loop
        autoPlay
        playsInline
        onError={() => setFailed(true)}
        onEnded={onLoop}
        className="tournament-sponsor-logo-media"
      />
    ) : (
      <img
        src={mediaUrl}
        alt={manifest.identity.sponsorName}
        onError={() => setFailed(true)}
        className="tournament-sponsor-logo-media"
      />
    );
  }
  return <span>{manifest.logoTile.logoText}</span>;
}

export function TournamentSponsorLayer({
  manifest,
  causePaused = false,
  tournamentId,
  revision,
}: {
  manifest: TournamentCampaignManifest;
  causePaused?: boolean;
  tournamentId?: string | null;
  revision?: number;
}) {
  const cause = manifest.cause?.enabled && !causePaused ? manifest.cause : null;
  const deviceClass = getDeviceClass();
  const queueRef = useRef<CampaignEventItem[]>([]);
  const viewSecondsAccumulator = useRef<number>(0);

  const flushEvents = useCallback(() => {
    if (!tournamentId) return;
    const eventsToSend: CampaignEventItem[] = [...queueRef.current];
    queueRef.current = [];

    if (viewSecondsAccumulator.current > 0) {
      eventsToSend.push({
        placement: "arenaBackground",
        eventType: "viewable_seconds",
        seconds: viewSecondsAccumulator.current,
        count: 1,
      });
      if (manifest.logoTile.enabled) {
        eventsToSend.push({
          placement: "logoTile",
          eventType: "viewable_seconds",
          seconds: viewSecondsAccumulator.current,
          count: 1,
        });
      }
      viewSecondsAccumulator.current = 0;
    }

    if (eventsToSend.length > 0) {
      sendCampaignEventsBatch(tournamentId, {
        revision,
        deviceClass,
        events: eventsToSend,
      });
    }
  }, [tournamentId, revision, deviceClass, manifest.logoTile.enabled]);

  // Initial impression telemetry
  useEffect(() => {
    if (!tournamentId) return;

    const initialEvents: CampaignEventItem[] = [
      { placement: "arenaBackground", eventType: "eligible_load", count: 1 },
      { placement: "arenaBackground", eventType: "rendered_impression", count: 1 },
    ];

    if (manifest.logoTile.enabled) {
      initialEvents.push({ placement: "logoTile", eventType: "rendered_impression", count: 1 });
    }

    if (cause) {
      initialEvents.push({ placement: "causeCard", eventType: "rendered_impression", count: 1 });
    } else if (manifest.featurePanel.enabled) {
      initialEvents.push({ placement: "featurePanel", eventType: "rendered_impression", count: 1 });
    }

    queueRef.current.push(...initialEvents);
    flushEvents();
  }, [tournamentId, revision, manifest.logoTile.enabled, manifest.featurePanel.enabled, !!cause, flushEvents]);

  // Active viewable time telemetry loop
  useEffect(() => {
    if (!tournamentId) return;

    const interval = setInterval(() => {
      if (typeof document !== "undefined" && document.visibilityState === "visible") {
        viewSecondsAccumulator.current += 5;
        if (viewSecondsAccumulator.current >= 15) {
          flushEvents();
        }
      }
    }, 5000);

    const handleVisibilityChange = () => {
      if (document.visibilityState === "hidden") {
        flushEvents();
      }
    };

    const handleBeforeUnload = () => {
      flushEvents();
    };

    document.addEventListener("visibilitychange", handleVisibilityChange);
    window.addEventListener("beforeunload", handleBeforeUnload);

    return () => {
      clearInterval(interval);
      document.removeEventListener("visibilitychange", handleVisibilityChange);
      window.removeEventListener("beforeunload", handleBeforeUnload);
      flushEvents();
    };
  }, [tournamentId, flushEvents]);

  const handleCtaClick = () => {
    if (!tournamentId) return;
    queueRef.current.push({
      placement: "causeCard",
      eventType: "cta_click",
      count: 1,
    });
    flushEvents();
  };

  const handleCauseExpand = () => {
    if (!tournamentId) return;
    queueRef.current.push({
      placement: "causeCard",
      eventType: "cause_expand",
      count: 1,
    });
    flushEvents();
  };

  const handleLoop = () => {
    if (!tournamentId) return;
    queueRef.current.push({
      placement: "logoTile",
      eventType: "completed_loop",
      count: 1,
    });
  };

  return (
    <aside
      className="tournament-sponsor-layer"
      aria-label={`${manifest.identity.disclosureLabel} ${manifest.identity.sponsorName}`}
      style={
        {
          "--sponsor-primary": manifest.theme.primaryColor,
          "--sponsor-accent": manifest.theme.secondaryColor,
        } as React.CSSProperties
      }
    >
      <div className="tournament-sponsor-disclosure">
        {manifest.identity.disclosureLabel} <strong>{manifest.identity.sponsorName}</strong>
      </div>
      {manifest.logoTile.enabled && (
        <div
          className={`tournament-sponsor-logo sponsor-motion-${manifest.logoTile.animationPreset} ${
            manifest.logoTile.desktopEnabled ? "show-desktop" : ""
          } ${manifest.logoTile.mobileEnabled ? "show-mobile" : ""}`}
        >
          <SponsorLogo manifest={manifest} onLoop={handleLoop} />
          <small>
            {manifest.identity.disclosureLabel} {manifest.identity.sponsorName}
          </small>
        </div>
      )}
      {cause ? (
        <div
          className="tournament-cause-card"
          role="complementary"
          aria-label={cause.title}
          onClick={handleCauseExpand}
        >
          <small>{cause.label}</small>
          <strong>{cause.title}</strong>
          <span>For {cause.beneficiaryName}</span>
          <p>{cause.message}</p>
          {cause.showProgress && (
            <div className="tournament-cause-progress">
              <div>
                <i style={{ width: `${campaignCauseProgress(cause)}%` }} />
              </div>
              <b>
                {cause.raisedAmount.toLocaleString()} / {cause.targetAmount.toLocaleString()}{" "}
                {cause.currency}
              </b>
            </div>
          )}
          {cause.ctaUrl && (
            <a
              href={cause.ctaUrl}
              target="_blank"
              rel="noopener noreferrer nofollow"
              onClick={handleCtaClick}
            >
              {cause.ctaLabel}
              <ExternalLink size={11} />
            </a>
          )}
          <em>Information only · Opens an external site</em>
        </div>
      ) : (
        manifest.featurePanel.enabled && (
          <div className="tournament-sponsor-story">
            <small>{manifest.identity.campaignTitle}</small>
            <strong>{manifest.featurePanel.headline}</strong>
            <p>{manifest.featurePanel.body}</p>
          </div>
        )
      )}
    </aside>
  );
}

