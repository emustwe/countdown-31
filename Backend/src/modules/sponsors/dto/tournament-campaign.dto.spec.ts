import { describe, expect, it } from "vitest";
import { TournamentCampaignManifestSchema } from "./write.dto";

const validManifest = {
  identity: { campaignTitle: "Future Champions Cup", sponsorName: "Nike Demo", disclosureLabel: "Sponsored by" },
  theme: { primaryColor: "#f4f4f4", secondaryColor: "#c7ff2f", backgroundImage: "/assets/arena.jpg", overlayOpacity: 0.66 },
  logoTile: { enabled: true, logoText: "NIKE DEMO", animationPreset: "turntable", desktopEnabled: true, mobileEnabled: true },
  featurePanel: { enabled: true, headline: "FUTURE CHAMPIONS", body: "Every move builds the future." },
};

describe("TournamentCampaignManifestSchema", () => {
  it("accepts a bounded preset manifest", () => {
    expect(TournamentCampaignManifestSchema.safeParse(validManifest).success).toBe(true);
  });

  it("rejects script URLs and arbitrary CSS fields", () => {
    expect(TournamentCampaignManifestSchema.safeParse({
      ...validManifest,
      theme: { ...validManifest.theme, backgroundImage: "javascript:alert(1)", customCss: "body{display:none}" },
    }).success).toBe(false);
  });

  it("rejects unreadable background overlays", () => {
    expect(TournamentCampaignManifestSchema.safeParse({
      ...validManifest,
      theme: { ...validManifest.theme, overlayOpacity: 0.1 },
    }).success).toBe(false);
  });
});
