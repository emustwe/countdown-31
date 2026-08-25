import { describe, expect, it } from "vitest";
import { acceptsCampaignFile, detectCampaignFile } from "./campaign-assets";

describe("campaign asset signatures", () => {
  it("detects PNG content independently of the browser MIME label", () => {
    const bytes = Buffer.from([0x89, 0x50, 0x4e, 0x47, 0x0d, 0x0a, 0x1a, 0x0a, 0, 0, 0, 0]);
    expect(detectCampaignFile(bytes)?.mimeType).toBe("image/png");
  });

  it("rejects executable or unknown bytes", () => {
    expect(detectCampaignFile(Buffer.from("<script>alert(1)</script>"))).toBeNull();
  });

  it("allows video logos but only still backgrounds", () => {
    const mp4 = detectCampaignFile(Buffer.concat([Buffer.alloc(4), Buffer.from("ftyp"), Buffer.alloc(4)]));
    expect(mp4).not.toBeNull();
    expect(acceptsCampaignFile("LOGO", mp4!)).toBe(true);
    expect(acceptsCampaignFile("BACKGROUND_DESKTOP", mp4!)).toBe(false);
  });
});
