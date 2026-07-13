import { describe, expect, it } from "vitest";
import { placeholder } from "./main";

describe("scaffold", () => {
  it("compiles and runs", () => {
    expect(placeholder()).toBe("backend-scaffold-ok");
  });
});
