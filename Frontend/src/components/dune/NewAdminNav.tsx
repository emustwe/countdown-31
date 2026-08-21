"use client";

import { useRouter, usePathname } from "next/navigation";
import { Building2, ChevronLeft, LayoutDashboard, LogOut, Trophy } from "lucide-react";
import { useLogout } from "../../lib/hooks/useAuth";

// Navbar for the NEW admin dashboard. Reuses the .admin-nav styling (already responsive) so it
// collapses to icons on tablets and scrolls on phones.
export function NewAdminNav() {
  const router = useRouter();
  const pathname = usePathname();
  const logout = useLogout();

  const items: [string, typeof Trophy, string][] = [
    ["Dashboard", LayoutDashboard, "/admin"],
    ["Tournament", Trophy, "/admin/tournament"],
    ["Sponsor", Building2, "/admin/sponsor"],
  ];

  return (
    <header className="admin-nav new-nav">
      <button className="admin-nav-back" onClick={() => router.push("/home")} title="Back to app" aria-label="Back to app">
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
        <button className="icon-button" onClick={() => logout.mutate()} aria-label="Log out">
          <LogOut size={18} />
        </button>
      </div>
    </header>
  );
}
