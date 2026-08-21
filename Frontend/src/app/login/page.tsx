"use client";

import { Suspense } from "react";
import { DuneAuth } from "../../components/dune/Auth";

export default function LoginPage() {
  return (
    <Suspense fallback={null}>
      <DuneAuth />
    </Suspense>
  );
}
