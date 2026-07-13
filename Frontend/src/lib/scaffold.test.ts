import { describe, expect, it } from "vitest";
import { placeholder } from "./scaffold";

describe("scaffold", () => {
  it("compiles and runs", () => {
    expect(placeholder()).toBe("frontend-scaffold-ok");
  });
});
