import { describe, expect, it } from "vitest";
import { passwordPolicyError } from "../password-policy";
import { normalizeAvatarUrl } from "../safe-url";
import { generateTotpSecret, verifyTotp, totpAuthUri, totpCode } from "../totp";

describe("password policy", () => {
  it("rejects short, common, or low-variety passwords", () => {
    expect(passwordPolicyError("short")).toBeTruthy();
    expect(passwordPolicyError("password123")).toBeTruthy(); // common + only 2 classes
    expect(passwordPolicyError("aaaaaaaaaaaa")).toBeTruthy(); // single repeated char
    expect(passwordPolicyError("lowercaseonly")).toBeTruthy(); // 1 class
  });
  it("accepts a strong password", () => {
    expect(passwordPolicyError("Str0ng!Pw9")).toBeNull();
    expect(passwordPolicyError("Tr0ubador&3xtra")).toBeNull();
  });
});

describe("avatar url safety", () => {
  it("rejects javascript: and non-image data urls", () => {
    expect(() => normalizeAvatarUrl("javascript:alert(1)")).toThrow();
    expect(() => normalizeAvatarUrl("data:text/html;base64,PHNjcmlwdD4=")).toThrow();
    expect(() => normalizeAvatarUrl("http://evil.example/x.png")).toThrow(); // not https
  });
  it("accepts https urls and image data urls, and clears on empty", () => {
    expect(normalizeAvatarUrl("https://cdn.example/a.png")).toBe("https://cdn.example/a.png");
    expect(normalizeAvatarUrl("data:image/png;base64,iVBORw0KGgo=")).toContain("data:image/png");
    expect(normalizeAvatarUrl("")).toBeNull();
    expect(normalizeAvatarUrl(null)).toBeNull();
  });
});

describe("TOTP", () => {
  it("verifies a code generated for the current window and tolerates drift", () => {
    const secret = generateTotpSecret();
    const now = 1_700_000_000_000;
    const code = totpCode(secret, now);
    expect(verifyTotp(secret, code, now)).toBe(true);
    // ±1 step of drift is accepted; a far-away window is not.
    expect(verifyTotp(secret, code, now + 30_000)).toBe(true);
    expect(verifyTotp(secret, code, now + 5 * 60_000)).toBe(false);
    // A different secret rejects the same code.
    expect(verifyTotp(generateTotpSecret(), code, now)).toBe(false);
    expect(totpAuthUri(secret, "user@example.com")).toContain("otpauth://totp/");
  });
});
