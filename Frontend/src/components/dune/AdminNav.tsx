"use client";

import { useRouter, usePathname } from "next/navigation";
import { BarChart3, CreditCard, Cpu, LogOut, ScrollText, Settings as SettingsIcon, Users } from "lucide-react";
import { Logo } from "./Shell";
import { useLogout, useProfile } from "../../lib/hooks/useAuth";

export function AdminNav() {
  const router = useRouter();
  const pathname = usePathname();
  const logout = useLogout();
  const { data: profile } = useProfile();
  const initials = (profile?.fullName || profile?.email || "AD").slice(0, 2).toUpperCase();

  const items: [string, typeof BarChart3, string][] = [
    ["Dashboard", BarChart3, "/admin/classic"],
    ["Users", Users, "/admin/users"],
    ["Math Models", Cpu, "/admin/models"],
    ["Transactions", CreditCard, "/admin/transactions"],
    ["Audit Log", ScrollText, "/admin/audit-log"],
    ["Settings", SettingsIcon, "/admin/settings"],
  ];

  return (
    <header className="admin-nav">
      <Logo />
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
            <img src={profile.avatarUrl} alt="" style={{ width: "100%", height: "100%", objectFit: "cover" }} />
          ) : (
            initials
          )}
        </span>
        <button className="icon-button" onClick={() => logout.mutate()}>
          <LogOut size={18} />
        </button>
      </div>
    </header>
  );
}
