"use client";

import { useEffect, useState } from "react";
import { useRouter } from "next/navigation";
import { Building2, LogIn } from "lucide-react";
import { useSponsorLogin } from "../../../lib/hooks/useSponsorPortal";
import { useSponsorAuthStore } from "../../../stores/sponsor-auth-store";

// Sponsor sign-in — sponsors use the username/password an admin issued them.
export default function SponsorLoginPage() {
  const router = useRouter();
  const login = useSponsorLogin();
  const token = useSponsorAuthStore((s) => s.token);
  const [username, setUsername] = useState("");
  const [password, setPassword] = useState("");
  const [error, setError] = useState("");

  useEffect(() => {
    if (token) router.replace("/sponsor");
  }, [token, router]);

  async function submit(e: React.FormEvent) {
    e.preventDefault();
    setError("");
    try {
      await login.mutateAsync({ username: username.trim(), password });
      router.replace("/sponsor");
    } catch {
      setError("Invalid username or password.");
    }
  }

  return (
    <div className="sponsor-auth">
      <form className="sponsor-auth-card glass" onSubmit={submit}>
        <span className="sponsor-auth-ico"><Building2 size={30} /></span>
        <h1>Sponsor sign in</h1>
        <p className="muted">Use the credentials your admin gave you.</p>
        <label>
          Username
          <input value={username} onChange={(e) => setUsername(e.target.value)} autoFocus placeholder="e.g. victoryark-0020" />
        </label>
        <label>
          Password
          <input type="password" value={password} onChange={(e) => setPassword(e.target.value)} placeholder="••••••••" />
        </label>
        {error && <small className="sponsor-auth-err">{error}</small>}
        <button className="primary full xl" type="submit" disabled={login.isPending || !username.trim() || !password}>
          <LogIn size={18} /> {login.isPending ? "Signing in…" : "Sign in"}
        </button>
      </form>
    </div>
  );
}
