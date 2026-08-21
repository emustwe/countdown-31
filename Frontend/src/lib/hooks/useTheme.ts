"use client";

// The platform renders in a single fixed theme family ("monster"). The old admin-controlled
// desert/monster toggle (backed by the removed slot GameConfig) is gone; this returns a constant so
// providers keep working with no backend dependency.
export type ThemeFamily = "monster";

export function usePlatformTheme() {
  return { data: { themeFamily: "monster" as ThemeFamily } };
}
