"use client";

import { Home, ShoppingBag, Trophy, User, Wallet } from "lucide-react";
import { usePathname, useRouter } from "next/navigation";
import { useAuthStore } from "../../stores/auth-store";
import { useAvatarStore } from "../../stores/avatar-customization-store";
import { soundManager } from "../../lib/soundManager";
import { MasterAvatar } from "./MasterAvatar";

interface MobileLink {
  label: string;
  path: string;
  icon: typeof Home;
  protected: boolean;
  profile?: boolean;
}

const MOBILE_LINKS: MobileLink[] = [
  { label: "Home", path: "/home", icon: Home, protected: false },
  { label: "Events", path: "/events", icon: Trophy, protected: false },
  { label: "Profile", path: "/profile", icon: User, protected: true, profile: true },
  { label: "Shop", path: "/shop", icon: ShoppingBag, protected: true },
  { label: "Wallet", path: "/wallet", icon: Wallet, protected: true },
];

const HIDDEN_ROUTES = ["/admin", "/login", "/register", "/landing", "/sponsor/login"];

export function MobileBottomNav() {
  const pathname = usePathname();
  const router = useRouter();
  const accessToken = useAuthStore((state) => state.accessToken);
  const avatar = useAvatarStore();
  const isAuthenticated = !!accessToken;

  if (pathname === "/" || HIDDEN_ROUTES.some((route) => pathname.startsWith(route))) return null;

  function go(path: string, requiresAuth: boolean) {
    soundManager.playClick();
    router.push(
      requiresAuth && !isAuthenticated ? `/login?next=${encodeURIComponent(path)}` : path,
    );
  }

  return (
    <nav className="mobile-bottom-nav" aria-label="Mobile navigation">
      {MOBILE_LINKS.map(({ label, path, icon: Icon, protected: requiresAuth, profile }) => {
        const active = profile
          ? ["/profile", "/avatar", "/avatar-styles", "/settings", "/history"].some(
              (route) => pathname === route || pathname.startsWith(`${route}/`),
            )
          : pathname === path || pathname.startsWith(`${path}/`);

        return (
          <button
            type="button"
            key={path}
            onClick={() => go(path, requiresAuth)}
            className={`mobile-nav-item ${profile ? "mobile-nav-profile" : ""} ${active ? "active" : ""}`}
            aria-label={label}
            aria-current={active ? "page" : undefined}
          >
            <span className="mobile-nav-icon">
              {profile && isAuthenticated ? (
                <MasterAvatar
                  config={{ ...avatar, backgroundId: "none", frameId: "none" }}
                  className="h-full w-full rounded-full"
                />
              ) : (
                <Icon size={profile ? 25 : 21} strokeWidth={2.4} />
              )}
            </span>
            <span>{profile && !isAuthenticated ? "Sign in" : label}</span>
          </button>
        );
      })}
    </nav>
  );
}
