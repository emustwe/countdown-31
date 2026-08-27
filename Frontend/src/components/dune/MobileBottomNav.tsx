"use client";

import { AnimatePresence, motion } from "framer-motion";
import { Home, MoreHorizontal, Settings, ShoppingBag, Trophy, User, Wallet, X } from "lucide-react";
import { usePathname, useRouter } from "next/navigation";
import { useEffect, useState } from "react";
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
  more?: boolean;
}

const MOBILE_LINKS: MobileLink[] = [
  { label: "Home", path: "/home", icon: Home, protected: false },
  { label: "Tournaments", path: "/events", icon: Trophy, protected: false },
  { label: "Avatars", path: "/avatar", icon: User, protected: false, profile: true },
  { label: "Shop", path: "/shop", icon: ShoppingBag, protected: false },
  { label: "More", path: "/more", icon: MoreHorizontal, protected: false, more: true },
];

const HIDDEN_ROUTES = ["/admin", "/login", "/register", "/landing", "/sponsor/login"];

export function MobileBottomNav() {
  const pathname = usePathname();
  const router = useRouter();
  const accessToken = useAuthStore((state) => state.accessToken);
  const avatar = useAvatarStore();
  const isAuthenticated = !!accessToken;
  const [showMore, setShowMore] = useState(false);

  useEffect(() => setShowMore(false), [pathname]);

  useEffect(() => {
    if (!showMore) return;
    const close = (event: KeyboardEvent) => {
      if (event.key === "Escape") setShowMore(false);
    };
    window.addEventListener("keydown", close);
    return () => window.removeEventListener("keydown", close);
  }, [showMore]);

  if (pathname === "/" || HIDDEN_ROUTES.some((route) => pathname.startsWith(route))) return null;

  function go(path: string, requiresAuth: boolean) {
    soundManager.playClick();
    router.push(
      requiresAuth && !isAuthenticated ? `/login?next=${encodeURIComponent(path)}` : path,
    );
  }

  return (
    <>
      <AnimatePresence>
        {showMore && (
          <>
            <motion.button
              type="button"
              aria-label="Close more menu"
              className="mobile-more-backdrop"
              initial={{ opacity: 0 }}
              animate={{ opacity: 1 }}
              exit={{ opacity: 0 }}
              onClick={() => setShowMore(false)}
            />
            <motion.section
              className="mobile-more-menu"
              initial={{ opacity: 0, y: 22, scale: 0.96 }}
              animate={{ opacity: 1, y: 0, scale: 1 }}
              exit={{ opacity: 0, y: 22, scale: 0.96 }}
              role="dialog"
              aria-label="More options"
            >
              <div className="mobile-more-heading">
                <div>
                  <small>PLAYER MENU</small>
                  <strong>More</strong>
                </div>
                <button
                  type="button"
                  onClick={() => setShowMore(false)}
                  aria-label="Close more menu"
                >
                  <X size={18} />
                </button>
              </div>
              <button type="button" onClick={() => go("/wallet", true)}>
                <span>
                  <Wallet size={21} />
                </span>
                <div>
                  <strong>Wallet</strong>
                  <small>Balance and transactions</small>
                </div>
              </button>
              <button type="button" onClick={() => go("/settings", true)}>
                <span>
                  <Settings size={21} />
                </span>
                <div>
                  <strong>Settings</strong>
                  <small>Sound, account and game preferences</small>
                </div>
              </button>
            </motion.section>
          </>
        )}
      </AnimatePresence>
      <nav className="mobile-bottom-nav" aria-label="Mobile navigation">
        {MOBILE_LINKS.map(({ label, path, icon: Icon, protected: requiresAuth, profile, more }) => {
          const active = profile
            ? ["/profile", "/avatar", "/avatar-styles", "/history"].some(
                (route) => pathname === route || pathname.startsWith(`${route}/`),
              )
            : more
              ? showMore ||
                ["/wallet", "/settings"].some(
                  (route) => pathname === route || pathname.startsWith(`${route}/`),
                )
              : pathname === path || pathname.startsWith(`${path}/`);

          return (
            <button
              type="button"
              key={path}
              onClick={() => {
                if (more) {
                  soundManager.playClick();
                  setShowMore((open) => !open);
                } else {
                  go(path, requiresAuth);
                }
              }}
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
    </>
  );
}
