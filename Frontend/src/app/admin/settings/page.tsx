"use client";

import { AdminGuard } from "../../../components/AdminGuard";
import { AdminNav } from "../../../components/dune/AdminNav";
import { AdminSettingsContent } from "../../../components/dune/AdminSettingsContent";

export default function AdminSettingsPage() {
  return (
    <AdminGuard>
      <div className="admin-shell">
        <AdminNav />
        <AdminSettingsContent />
      </div>
    </AdminGuard>
  );
}
