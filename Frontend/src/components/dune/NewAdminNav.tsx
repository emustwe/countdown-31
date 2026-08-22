"use client";

import { useRouter, usePathname } from "next/navigation";
import {
  Building2,
  ChevronLeft,
  LayoutDashboard,
  LogOut,
  Settings as SettingsIcon,
  Trophy,
  Users,
} from "lucide-react";
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
    ["Dashboard", LayoutDashboard, "/admin"],
    ["Tournament", Trophy, "/admin/tournament"],
    ["Users", Users, "/admin/users"],
    ["Sponsor", Building2, "/admin/sponsor"],
    ["Settings", SettingsIcon, "/admin/settings"],
  ];

  return (
    <header className="admin-nav new-nav">
      <button
        className="admin-nav-back"
        onClick={() => router.push("/home")}
        title="Back to app"
        aria-label="Back to app"
      >
        <ChevronLeft size={18} />
      </button>
      <nav>
        {items.map(([label, Icon, path]) => (
          <button
            key={path}
            className={pathname === path ? "active" : ""}
            onClick={() => router.push(path)}
          >
            <Icon />
            {label}
          </button>
        ))}
      </nav>
      <div>
        <span
          className="avatar"
          style={profile?.avatarUrl ? { padding: 0, overflow: "hidden" } : undefined}
        >
          {profile?.avatarUrl ? (
            <img
              src={profile.avatarUrl}
              alt=""
              style={{ width: "100%", height: "100%", objectFit: "cover" }}
            />
          ) : (
            initials
          )}
        </span>
        <button
          className="icon-button"
          onClick={async () => {
            await logout.mutateAsync();
            router.replace("/login");
          }}
          aria-label="Log out"
        >
          <LogOut size={18} />
        </button>
      </div>
    </header>
  );
}
