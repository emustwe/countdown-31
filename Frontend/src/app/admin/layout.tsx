"use client";

import React from "react";
import { AdminGuard } from "../../components/AdminGuard";
import { NewAdminNav } from "../../components/dune/NewAdminNav";

export default function NewAdminLayout({ children }: { children: React.ReactNode }) {
  return (
    <AdminGuard>
      <div className="relative w-full min-h-screen bg-[#070e0a] overflow-x-hidden flex flex-col justify-between p-3 sm:p-6 select-none text-white font-sans">
        {/* Background Pasture Atmosphere */}
        <div
          className="fixed inset-0 pointer-events-none bg-cover bg-center opacity-35 mix-blend-luminosity"
          style={{ backgroundImage: "url('/assets/barnaby/barnaby-field.jpg')" }}
        />
        <div className="fixed inset-0 pointer-events-none bg-[radial-gradient(ellipse_at_center,rgba(0,0,0,0.3)_0%,#040906_90%)]" />

        {/* Top Navbar */}
        <div className="relative z-30 mb-6">
          <NewAdminNav />
        </div>

        {/* Main Content Viewport */}
        <div className="relative z-10 w-full max-w-7xl mx-auto flex-1 flex flex-col">
          {children}
        </div>

        {/* Admin Footer */}
        <footer className="relative z-20 text-center text-[11px] text-slate-500 font-medium py-4 mt-8 border-t border-slate-900">
          <span>© 2026 Count Down 31 Platform · Master Administration Console</span>
        </footer>
      </div>
    </AdminGuard>
  );
}
