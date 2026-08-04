"use client";

import type { LucideIcon } from "lucide-react";

// Empty section placeholder for the new admin dashboard — real content is added later.
export function NewAdminPlaceholder({ title, icon: Icon }: { title: string; icon: LucideIcon }) {
  return (
    <main className="admin-main admin-new-main">
      <div className="placeholder-card">
        <span className="placeholder-icon">
          <Icon size={34} />
        </span>
        <h1>{title}</h1>
        <p>Coming soon — we&apos;ll build this out later.</p>
      </div>
    </main>
  );
}
