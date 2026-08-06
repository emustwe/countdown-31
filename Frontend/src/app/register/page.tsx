"use client";

import { Suspense } from "react";
import { DuneAuth } from "../../components/dune/Auth";

export default function RegisterPage() {
  return (
    <Suspense fallback={null}>
      <DuneAuth register />
    </Suspense>
  );
}
