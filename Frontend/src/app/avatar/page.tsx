"use client";

import React, { useState } from "react";
import { AvatarCatalogStudio } from "../../components/dune/AvatarCatalogStudio";
import { ArcadeHeader } from "../../components/dune/ArcadeHeader";
import { OfficialRulesModal } from "../../components/dune/OfficialRulesModal";

export default function AvatarPage() {
  const [showRules, setShowRules] = useState(false);

  return (
    <div className="relative w-full min-h-screen bg-[#070e0a] overflow-x-hidden flex flex-col justify-between p-3 sm:p-6 select-none">
      {/* Background Arena Pasture & Particle Overlay */}
      <div
        className="fixed inset-0 pointer-events-none bg-cover bg-center opacity-40 mix-blend-luminosity"
        style={{ backgroundImage: "url('/assets/barnaby/barnaby-field.jpg')" }}
      />
      <div className="fixed inset-0 pointer-events-none bg-[radial-gradient(ellipse_at_center,rgba(0,0,0,0.3)_0%,#040906_90%)]" />

      {/* Header */}
      <div className="relative z-20">
        <ArcadeHeader onOpenRules={() => setShowRules(true)} />
      </div>

      {/* Main Studio Area - WITH DEDICATED TOP CLEARANCE (Zero Overlap) */}
      <main className="relative z-10 w-full flex-1 mt-8 sm:mt-12 md:mt-14 mb-6">
        <AvatarCatalogStudio />
      </main>

      {/* Official 31 Rules Modal */}
      <OfficialRulesModal
        isOpen={showRules}
        onClose={() => setShowRules(false)}
      />
    </div>
  );
}
