import { describe, expect, it } from "vitest";
import { CampaignPublishSchema, CampaignReviewSchema, TournamentCampaignManifestSchema } from "./write.dto";

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

  it("accepts bounded cause progress with an HTTPS destination", () => {
    expect(TournamentCampaignManifestSchema.safeParse({
      ...validManifest,
      cause: {
        enabled: true,
        label: "Playing for good",
        title: "Help build safe classrooms",
        message: "This tournament supports a hypothetical education campaign.",
        beneficiaryName: "Demo Education Fund",
        targetAmount: 25000,
        raisedAmount: 9400,
        currency: "USD",
        showProgress: true,
        ctaLabel: "Learn more",
        ctaUrl: "https://example.org/cause",
      },
    }).success).toBe(true);
  });

  it("rejects unsafe fundraising links and negative progress", () => {
    expect(TournamentCampaignManifestSchema.safeParse({
      ...validManifest,
      cause: {
        enabled: true,
        label: "Cause",
        title: "Unsafe cause",
        message: "",
        beneficiaryName: "Unknown",
        targetAmount: 100,
        raisedAmount: -1,
        currency: "USD",
        showProgress: true,
        ctaLabel: "Donate",
        ctaUrl: "http://example.org/not-secure",
      },
    }).success).toBe(false);
  });
});

describe("campaign release governance schemas", () => {
  it("accepts bounded reviewer decisions and rejects unknown lanes", () => {
    expect(CampaignReviewSchema.safeParse({ lane: "BRAND", decision: "APPROVED", comment: "Identity matches the brief." }).success).toBe(true);
    expect(CampaignReviewSchema.safeParse({ lane: "LEGAL", decision: "APPROVED", comment: "" }).success).toBe(false);
  });

  it("accepts an empty immediate publish window and ISO schedules", () => {
    expect(CampaignPublishSchema.safeParse({}).success).toBe(true);
    expect(CampaignPublishSchema.safeParse({ activateAt: "2026-08-26T12:00:00.000Z", expireAt: null }).success).toBe(true);
    expect(CampaignPublishSchema.safeParse({ activateAt: "tomorrow" }).success).toBe(false);
  });
});
