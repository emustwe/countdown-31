"use client";

import { AuthGuard } from "../../components/AuthGuard";
import { AppShell } from "../../components/AppShell";
import { useProfile } from "../../lib/hooks/useAuth";
import { formatMinorUnits } from "../../lib/money";

export default function ProfilePage() {
  return (
    <AuthGuard>
      <AppShell>
        <ProfileContent />
      </AppShell>
    </AuthGuard>
  );
}

function ProfileContent() {
  const { data: profile, isLoading } = useProfile();

  if (isLoading || !profile) {
    return <p className="text-[var(--color-text-dim)]">Loading…</p>;
  }

  const rows: Array<[string, string]> = [
    ["Email", profile.email],
    ["Role", profile.role],
    ["Status", profile.status],
    ["Balance", formatMinorUnits(profile.balance)],
    ["Member since", new Date(profile.createdAt).toLocaleDateString()],
  ];

  return (
    <div>
      <h1 className="mb-8 text-2xl font-semibold">Profile</h1>
      <div className="surface divide-y divide-[var(--color-border)] rounded-lg">
        {rows.map(([label, value]) => (
          <div key={label} className="flex items-center justify-between px-6 py-4">
            <span className="text-sm text-[var(--color-text-dim)]">{label}</span>
            <span className="text-sm font-medium">{value}</span>
          </div>
        ))}
      </div>
    </div>
  );
}
