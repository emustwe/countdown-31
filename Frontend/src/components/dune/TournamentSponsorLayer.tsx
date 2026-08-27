"use client";

import { useEffect, useRef, useCallback } from "react";
import {
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

    if (!cause && manifest.featurePanel.enabled) {
      initialEvents.push({ placement: "featurePanel", eventType: "rendered_impression", count: 1 });
    }

    queueRef.current.push(...initialEvents);
    flushEvents();
  }, [
    tournamentId,
    revision,
    manifest.logoTile.enabled,
    manifest.featurePanel.enabled,
    !!cause,
    flushEvents,
  ]);

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
      {!cause && manifest.featurePanel.enabled && (
        <div className="tournament-sponsor-story">
          <small>{manifest.identity.campaignTitle}</small>
          <strong>{manifest.featurePanel.headline}</strong>
          <p>{manifest.featurePanel.body}</p>
        </div>
      )}
    </aside>
  );
}
