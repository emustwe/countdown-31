"use client";

import { useState } from "react";
import { useRouter, useSearchParams } from "next/navigation";
import { ChevronRight, Eye, EyeOff, ShieldCheck } from "lucide-react";
import { Logo } from "./Shell";
import { useLogin, useRegister } from "../../lib/hooks/useAuth";
import { ApiError } from "../../lib/api-client";

export function DuneAuth({ register = false }: { register?: boolean }) {
  const router = useRouter();
  const params = useSearchParams();
  const next = params.get("next");
  const login = useLogin();
  const signup = useRegister();
  const [show, setShow] = useState(false);
  const [fullName, setFullName] = useState("");
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [error, setError] = useState<string | null>(null);
  const pending = login.isPending || signup.isPending;

  async function submit(e: React.FormEvent) {
    e.preventDefault();
    setError(null);
    try {
      if (register) await signup.mutateAsync({ fullName, email, password });
      else await login.mutateAsync({ email, password });
      router.push(next && next.startsWith("/") ? next : "/home");
    } catch (err) {
      setError(err instanceof ApiError ? String(err.message) : "We could not continue. Please try again.");
    }
  }

  const otherPath = `${register ? "/login" : "/register"}${next ? `?next=${encodeURIComponent(next)}` : ""}`;

  return (
    <div className="auth-page friendly-auth">
      <div className="auth-art">
        <div className="auth-bg" />
        <div className="auth-shade" />
        <Logo />
        <div className="auth-quote">
          <span className="friendly-auth-badge">🐮 COUNT DOWN 31</span>
          <h1>Ready to<br /><em>play?</em></h1>
          <p>Count, take turns, and avoid 31.</p>
          <div className="friendly-auth-points">
            <span>✓ Quick games</span><span>✓ Easy controls</span><span>✓ Safe sign-in</span>
          </div>
        </div>
        <small>18+ · Play responsibly</small>
      </div>

      <div className="auth-form-wrap">
        <div className="auth-mobile-logo"><Logo /></div>
        <form className="auth-form" onSubmit={submit}>
          <p className="eyebrow">{register ? "NEW PLAYER" : "WELCOME BACK"}</p>
          <h2>{register ? "Create your account" : "Sign in"}</h2>
          <p>{register ? "Three quick fields, then you can play." : "Enter your details to continue."}</p>

          {register && <label>What should we call you?<input autoComplete="name" placeholder="Your name" required value={fullName} onChange={(e) => setFullName(e.target.value)} /></label>}
          <label>Email<input type="email" autoComplete="email" placeholder="name@example.com" required value={email} onChange={(e) => setEmail(e.target.value)} /></label>
          <label>Password<div className="password"><input type={show ? "text" : "password"} autoComplete={register ? "new-password" : "current-password"} placeholder={register ? "At least 8 characters" : "Your password"} required minLength={register ? 8 : undefined} value={password} onChange={(e) => setPassword(e.target.value)} /><button type="button" onClick={() => setShow(!show)} aria-label={show ? "Hide password" : "Show password"}>{show ? <EyeOff /> : <Eye />}</button></div></label>

          {error && <p className="friendly-form-error" role="alert">{error}</p>}
          <button className="primary full xl" disabled={pending}>
            {pending ? "Please wait…" : register ? "Create account" : "Sign in"}<ChevronRight size={18} />
          </button>
          {register && <p className="legal"><ShieldCheck size={15} /> By continuing, you confirm you are 18+ and accept the Terms.</p>}
          <p className="auth-switch">{register ? "Already have an account?" : "New here?"} <button type="button" onClick={() => router.push(otherPath)}>{register ? "Sign in" : "Create an account"}</button></p>
          {!register && <button className="friendly-guest" type="button" onClick={() => router.push("/home")}>Play as a guest</button>}
        </form>
      </div>
    </div>
  );
}
