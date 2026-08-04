"use client";

import { useRouter, usePathname } from "next/navigation";
import { Building2, ChevronLeft, LayoutDashboard, LogOut, Settings as SettingsIcon, Trophy, Users } from "lucide-react";
import { useLogout, useProfile } from "../../lib/hooks/useAuth";

// Navbar for the NEW admin dashboard. Reuses the .admin-nav styling (already responsive) so it
// collapses to icons on tablets and scrolls on phones.
export function NewAdminNav() {
  const router = useRouter();
  const pathname = usePathname();
  const logout = useLogout();
  const { data: profile } = useProfile();
  const initials = (profile?.fullName || profile?.email || "AD").slice(0, 2).toUpperCase();

  const items: [string, typeof Trophy, string][] = [
    ["Dashboard", LayoutDashboard, "/admin/new"],
    ["Tournament", Trophy, "/admin/new/tournament"],
    ["Users", Users, "/admin/new/users"],
    ["Sponsor", Building2, "/admin/new/sponsor"],
    ["Settings", SettingsIcon, "/admin/new/settings"],
  ];

  return (
    <header className="admin-nav new-nav">
      <button className="admin-nav-back" onClick={() => router.push("/admin")} title="Dashboards" aria-label="Back to dashboards">
        <ChevronLeft size={18} />
      </button>
      <nav>
        {items.map(([label, Icon, path]) => (
          <button key={path} className={pathname === path ? "active" : ""} onClick={() => router.push(path)}>
            <Icon />
            {label}
          </button>
        ))}
      </nav>
      <div>
        <span className="avatar" style={profile?.avatarUrl ? { padding: 0, overflow: "hidden" } : undefined}>
          {profile?.avatarUrl ? (
            // eslint-disable-next-line @next/next/no-img-element
            <img src={profile.avatarUrl} alt="" style={{ width: "100%", height: "100%", objectFit: "cover" }} />
          ) : (
            initials
          )}
        </span>
        <button className="icon-button" onClick={() => logout.mutate()} aria-label="Log out">
          <LogOut size={18} />
        </button>
      </div>
    </header>
  );
}
