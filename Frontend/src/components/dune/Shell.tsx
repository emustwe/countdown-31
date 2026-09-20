"use client";

import { useState, type ReactNode } from "react";
import { useRouter, usePathname } from "next/navigation";
import {
  Bell,
  CheckCircle2,
  Handshake,
  History as HistoryIcon,
  Home as HomeIcon,
  Settings as SettingsIcon,
  ShoppingBag,
  Trophy,
  User,
  UserPlus,
} from "lucide-react";
import { useProfile } from "../../lib/hooks/useAuth";
import { useAuthStore } from "../../stores/auth-store";
import { useNotifications, useMarkNotificationsRead } from "../../lib/hooks/useNotifications";

// [key, EN label, KO label, Icon, path, disabled?]
// Tournaments (/events) lists the public tournaments. Sponsorship is a coming-soon hub for people
// who want to sponsor a tournament. History, Settings and Notifications live in the profile menu.
const NAV_ITEMS: [string, string, string, typeof HomeIcon, string, boolean?][] = [
  ["home", "Home", "홈", HomeIcon, "/home"],
  ["tournaments", "Tournaments", "토너먼트", Trophy, "/events"],
  ["sponsorship", "Sponsorship", "스폰서십", Handshake, "/sponsorship"],
  ["shop", "Shop", "상점", ShoppingBag, "/shop"],
];

export function Logo({ compact = false }: { compact?: boolean }) {
  const router = useRouter();
  return (
    <button className={`logo ${compact ? "compact" : ""}`} onClick={() => router.push("/home")} aria-label="WM Tournaments home">
      <span className="logo-sun">✦</span>
      <span>
        <b>WM</b>
        <b>TOURNAMENTS</b>
      </span>
    </button>
  );
}

export function Pill({ children, tone = "live" }: { children: ReactNode; tone?: string }) {
  return (
    <span className={`pill ${tone}`}>
      <i />
      {children}
    </span>
  );
}

export function OrbIcon({ children, tone = "cyan" }: { children: ReactNode; tone?: string }) {
  return <span className={`orb-icon ${tone}`}>{children}</span>;
}

export function Toast({ message }: { message?: string }) {
  if (!message) return null;
  return (
    <div className="toast-notification">
      <CheckCircle2 size={20} />
      <span>{message}</span>
    </div>
  );
}

export function Avatar({ url, initials, className = "avatar", onClick }: { url?: string | null; initials: string; className?: string; onClick?: () => void }) {
  return (
    <button className={className} onClick={onClick} aria-label="Profile" style={url ? { padding: 0, overflow: "hidden" } : undefined}>
      {url ? <img src={url} alt="" style={{ width: "100%", height: "100%", objectFit: "cover" }} /> : initials}
    </button>
  );
}

/** Profile menu: the avatar opens a dropdown with the player's Notifications (live, polled every
 * 20s — an unread count shows as a dot on the avatar), plus History and Settings. Opening the menu
 * marks notifications read, clearing the dot. Replaces the old play-now / wallet / bell buttons. */
function ProfileMenu({ initials, avatarUrl, name, email }: { initials: string; avatarUrl?: string | null; name: string; email: string }) {
  const router = useRouter();
  const [open, setOpen] = useState(false);
  const { data } = useNotifications();
  const markRead = useMarkNotificationsRead();
  const unread = data?.unread ?? 0;
  const items = data?.notifications ?? [];

  function toggle() {
    const next = !open;
    setOpen(next);
    if (next && unread > 0) markRead.mutate();
  }
  function go(path: string) {
    router.push(path);
    setOpen(false);
  }

  return (
    <div className="profile-wrap">
      <button
        className="avatar profile-trigger"
        onClick={toggle}
        aria-label="Profile menu"
        style={avatarUrl ? { padding: 0, overflow: "hidden" } : undefined}
      >
        {avatarUrl ? <img src={avatarUrl} alt="" style={{ width: "100%", height: "100%", objectFit: "cover" }} /> : initials}
        {unread > 0 && <i className="notif-dot" />}
      </button>
      {open && (
        <>
          <div className="notif-backdrop" onClick={() => setOpen(false)} />
          <div className="profile-panel">
            <div className="profile-head">
              <span className="avatar small" style={avatarUrl ? { padding: 0, overflow: "hidden" } : undefined}>
                {avatarUrl ? <img src={avatarUrl} alt="" style={{ width: "100%", height: "100%", objectFit: "cover" }} /> : initials}
              </span>
              <div className="profile-id">
                <b>{name}</b>
                {email && <small>{email}</small>}
              </div>
            </div>
            {/* Full navigation — the profile menu is the single, complete menu everywhere (matches the
                in-arena menu), so mobile shows every destination the desktop does, in one place. */}
            <div className="profile-menu">
              <button onClick={() => go("/home")}>
                <HomeIcon size={17} /> Home
              </button>
              <button onClick={() => go("/avatar")}>
                <User size={17} /> My Avatars
              </button>
              <button onClick={() => go("/events")}>
                <Trophy size={17} /> Tournaments
              </button>
              <button onClick={() => go("/shop")}>
                <ShoppingBag size={17} /> Shop
              </button>
              <button onClick={() => go("/sponsorship")}>
                <Handshake size={17} /> Sponsorship
              </button>
              <button onClick={() => go("/history")}>
                <HistoryIcon size={17} /> History
              </button>
              <button onClick={() => go("/settings")}>
                <SettingsIcon size={17} /> Settings
              </button>
            </div>
            <div className="profile-notifs">
              <div className="pn-head">
                <Bell size={15} />
                <b>Notifications</b>
                {unread > 0 && <span className="pn-count">{unread}</span>}
              </div>
              <div className="pn-list">
                {items.length === 0 && <p className="pn-empty">No notifications yet.</p>}
                {items.map((n) => (
                  <div key={n.id} className={`notif-item ${n.read ? "" : "unread"}`}>
                    <b>{n.title}</b>
                    <p>{n.body}</p>
                    <small>{new Date(n.createdAt).toLocaleString()}</small>
                  </div>
                ))}
              </div>
            </div>
          </div>
        </>
      )}
    </div>
  );
}

/** Guests (no account) see a single symbol-only Sign-up button in place of the profile icon (no
 * text, so it reads the same in every language). Logging in to an existing account is offered on
 * the sign-up page itself, so the nav stays to one clear call to action. */
function AuthButtons() {
  const router = useRouter();
  return (
    <div className="nav-auth">
      <button className="nav-signup" onClick={() => router.push("/register")} aria-label="Sign up" title="Sign up">
        <UserPlus size={22} strokeWidth={2.2} />
      </button>
    </div>
  );
}

function TopNav({ activeKey, authed, initials, avatarUrl, name, email, brandVa = false }: { activeKey: string; authed: boolean; initials: string; avatarUrl?: string | null; name: string; email: string; brandVa?: boolean }) {
  const router = useRouter();
  return (
    <header className={`topnav ${brandVa ? "va-nav" : ""}`}>
      <div className="nav-inner">
        <Logo />
        <nav className="nav-icons">
          {NAV_ITEMS.map(([key, label, , Icon, path, disabled]) => (
            <button
              key={key}
              className={`${activeKey === key ? "active" : ""} ${disabled ? "disabled" : ""}`}
              disabled={disabled}
              aria-disabled={disabled}
              aria-label={label}
              title={label}
              onClick={() => !disabled && router.push(path)}
            >
              <Icon size={23} strokeWidth={2} />
              <span>{label}</span>
            </button>
          ))}
        </nav>
        <div className="nav-actions">
          {authed ? <ProfileMenu initials={initials} avatarUrl={avatarUrl} name={name} email={email} /> : <AuthButtons />}
        </div>
      </div>
    </header>
  );
}

/** Ported page shell — top nav + footer, wired to the real profile. */
export function PageShell({ children, className = "", brandVa = false }: { children: ReactNode; className?: string; brandVa?: boolean }) {
  const pathname = usePathname();
  const accessToken = useAuthStore((s) => s.accessToken);
  const authed = !!accessToken;
  const { data: profile } = useProfile();

  // No fallback to "home": on pages not in the nav (e.g. /settings, /history) NO tab is highlighted.
  const activeKey =
    NAV_ITEMS.find(([, , , , path]) => pathname === path || pathname.startsWith(path + "/"))?.[0] ?? "";
  const name = profile?.fullName || profile?.email?.split("@")[0] || "Player";
  const email = profile?.email || "";
  const initials = (profile?.fullName || profile?.email || "DD").slice(0, 2).toUpperCase();

  return (
    <div className={`app-shell ${className} ${brandVa ? "va-shell" : ""}`}>
      <TopNav activeKey={activeKey} authed={authed} initials={initials} avatarUrl={profile?.avatarUrl} name={name} email={email} brandVa={brandVa} />
      {children}
      <footer><span>18+</span> Play responsibly. <b>Set your limits.</b></footer>
    </div>
  );
}

export function ToggleRow({
  icon: Icon,
  title,
  copy,
  active = true,
  onChange,
}: {
  icon: typeof HomeIcon;
  title: ReactNode;
  copy: ReactNode;
  active?: boolean;
  onChange?: (v: boolean) => void;
}) {
  const [on, setOn] = useState(active);
  return (
    <div className="toggle-row">
      <OrbIcon>
        <Icon size={20} />
      </OrbIcon>
      <span>
        <b>{title}</b>
        <small>{copy}</small>
      </span>
      <button
        className={`toggle ${on ? "on" : ""}`}
        onClick={() => {
          setOn(!on);
          onChange?.(!on);
        }}
      >
        <i />
      </button>
    </div>
  );
}

