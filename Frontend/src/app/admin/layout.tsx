"use client";

import { AdminGuard } from "../../components/AdminGuard";
import { NewAdminNav } from "../../components/dune/NewAdminNav";

// Guards + frames every page under /admin/new. AdminGuard requires an authenticated ADMIN (redirects
// everyone else), so all new-dashboard sections are protected in one place.
export default function NewAdminLayout({ children }: { children: React.ReactNode }) {
  return (
    <AdminGuard>
      <div className="admin-shell">
        <NewAdminNav />
        {children}
      </div>
    </AdminGuard>
  );
}
