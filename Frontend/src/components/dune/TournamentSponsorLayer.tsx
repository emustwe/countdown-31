"use client";

import type { TournamentCampaignManifest } from "../../lib/hooks/useTournamentCampaign";

export function TournamentSponsorLayer({ manifest }: { manifest: TournamentCampaignManifest }) {
  return <aside className="tournament-sponsor-layer" aria-label={`${manifest.identity.disclosureLabel} ${manifest.identity.sponsorName}`} style={{"--sponsor-primary": manifest.theme.primaryColor, "--sponsor-accent": manifest.theme.secondaryColor} as React.CSSProperties}>
    <div className="tournament-sponsor-disclosure">{manifest.identity.disclosureLabel} <strong>{manifest.identity.sponsorName}</strong></div>
    {manifest.logoTile.enabled && <div className={`tournament-sponsor-logo sponsor-motion-${manifest.logoTile.animationPreset} ${manifest.logoTile.desktopEnabled ? "show-desktop" : ""} ${manifest.logoTile.mobileEnabled ? "show-mobile" : ""}`}><span>{manifest.logoTile.logoText}</span><small>{manifest.identity.disclosureLabel} {manifest.identity.sponsorName}</small></div>}
    {manifest.featurePanel.enabled && <div className="tournament-sponsor-story"><small>{manifest.identity.campaignTitle}</small><strong>{manifest.featurePanel.headline}</strong><p>{manifest.featurePanel.body}</p></div>}
  </aside>;
}
