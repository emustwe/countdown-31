"use client";

import { useEffect, useState } from "react";
import { resolveCampaignAssetUrl, type TournamentCampaignManifest } from "../../lib/hooks/useTournamentCampaign";

function SponsorLogo({ manifest }: { manifest: TournamentCampaignManifest }) {
  const [failed, setFailed] = useState(false);
  const mediaUrl = resolveCampaignAssetUrl(manifest.logoTile.mediaUrl);
  useEffect(() => setFailed(false), [mediaUrl]);
  if (mediaUrl && !failed) {
    return manifest.logoTile.mediaType === "video"
      ? <video src={mediaUrl} muted loop autoPlay playsInline onError={() => setFailed(true)} className="tournament-sponsor-logo-media"/>
      : <img src={mediaUrl} alt={manifest.identity.sponsorName} onError={() => setFailed(true)} className="tournament-sponsor-logo-media"/>;
  }
  return <span>{manifest.logoTile.logoText}</span>;
}

export function TournamentSponsorLayer({ manifest }: { manifest: TournamentCampaignManifest }) {
  return <aside className="tournament-sponsor-layer" aria-label={`${manifest.identity.disclosureLabel} ${manifest.identity.sponsorName}`} style={{"--sponsor-primary": manifest.theme.primaryColor, "--sponsor-accent": manifest.theme.secondaryColor} as React.CSSProperties}>
    <div className="tournament-sponsor-disclosure">{manifest.identity.disclosureLabel} <strong>{manifest.identity.sponsorName}</strong></div>
    {manifest.logoTile.enabled && <div className={`tournament-sponsor-logo sponsor-motion-${manifest.logoTile.animationPreset} ${manifest.logoTile.desktopEnabled ? "show-desktop" : ""} ${manifest.logoTile.mobileEnabled ? "show-mobile" : ""}`}><SponsorLogo manifest={manifest}/><small>{manifest.identity.disclosureLabel} {manifest.identity.sponsorName}</small></div>}
    {manifest.featurePanel.enabled && <div className="tournament-sponsor-story"><small>{manifest.identity.campaignTitle}</small><strong>{manifest.featurePanel.headline}</strong><p>{manifest.featurePanel.body}</p></div>}
  </aside>;
}
