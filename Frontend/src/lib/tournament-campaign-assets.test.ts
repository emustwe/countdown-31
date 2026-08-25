import { describe, expect, it } from "vitest";
import { campaignCauseProgress, resolveCampaignAssetUrl } from "./hooks/useTournamentCampaign";

describe("tournament campaign asset URLs", () => {
  it("resolves managed uploads against the active API origin", () => {
    expect(resolveCampaignAssetUrl("/uploads/tournament-campaigns/demo/logo.png")).toBe(
      "http://localhost:4000/uploads/tournament-campaigns/demo/logo.png",
    );
  });

  it("keeps approved absolute and bundled paths unchanged", () => {
    expect(resolveCampaignAssetUrl("https://cdn.example.test/logo.png")).toBe("https://cdn.example.test/logo.png");
    expect(resolveCampaignAssetUrl("/assets/barnaby/demo.jpg")).toBe("/assets/barnaby/demo.jpg");
  });
});

describe("campaign cause progress", () => {
  const cause = {
    enabled: true,
    label: "Playing for good",
    title: "Demo cause",
    message: "",
    beneficiaryName: "Demo Fund",
    targetAmount: 100,
    raisedAmount: 40,
    currency: "USD" as const,
    showProgress: true,
    ctaLabel: "Learn more",
    ctaUrl: "https://example.org",
  };

  it("calculates and clamps visible progress", () => {
    expect(campaignCauseProgress(cause)).toBe(40);
    expect(campaignCauseProgress({ ...cause, raisedAmount: 140 })).toBe(100);
    expect(campaignCauseProgress({ ...cause, raisedAmount: -10 })).toBe(0);
  });
});
