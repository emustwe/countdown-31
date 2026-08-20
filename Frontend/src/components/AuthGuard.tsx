"use client";

import React from "react";

/** Client-side route guard: Allows all routes in frontend testing mode with default dummy user session. */
export function AuthGuard({ children }: { children: React.ReactNode }) {
  return <>{children}</>;
}
