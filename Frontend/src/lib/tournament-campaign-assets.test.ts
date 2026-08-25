import { describe, expect, it } from "vitest";
import { resolveCampaignAssetUrl } from "./hooks/useTournamentCampaign";

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
