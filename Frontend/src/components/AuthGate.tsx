"use client";

import { useRouter, usePathname } from "next/navigation";
import { CircleUserRound, UserPlus, X } from "lucide-react";

// A small "log in or sign up" popup. Instead of hard-redirecting a guest to the auth page, we show
// this first; the buttons then take them to /login or /register, carrying a `next` param so they
// return to where they were after signing in.
export function AuthGate({
  open,
  onClose,
  title = "Sign in to continue",
  message = "Log in or create an account to continue.",
  next,
}: {
  open: boolean;
  onClose?: () => void;
  title?: string;
  message?: string;
  next?: string;
}) {
  const router = useRouter();
  const pathname = usePathname();
  if (!open) return null;
  const dest = encodeURIComponent(next ?? pathname ?? "/home");
  return (
    <div className="name-overlay" onClick={onClose}>
      <div className="name-card" onClick={(e) => e.stopPropagation()}>
        {onClose && (
          <button type="button" className="modal-close" onClick={onClose} aria-label="Close">
            <X size={18} />
          </button>
        )}
        <h2>{title}</h2>
        <p className="muted">{message}</p>
        <div className="gate-actions">
          <button className="gate-login" onClick={() => router.push(`/login?next=${dest}`)}>
            <CircleUserRound size={20} /> Log in
          </button>
          <button className="gate-signup" onClick={() => router.push(`/register?next=${dest}`)}>
            <UserPlus size={20} /> Sign up
          </button>
        </div>
      </div>
    </div>
  );
}
