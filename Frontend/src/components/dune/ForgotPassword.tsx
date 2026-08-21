"use client";

import { useState } from "react";
import { CheckCircle2, Eye, EyeOff, KeyRound, Mail, X } from "lucide-react";
import { useForgotPassword, useResetPassword } from "../../lib/hooks/useAuth";
import { ApiError } from "../../lib/api-client";

// Two-step password recovery: (1) enter email → we email a 6-digit code; (2) enter the code + a new
// password. When email delivery is disabled (dev), the server returns the code so it can be
// prefilled and the flow tested without an inbox.
export function ForgotPassword({ open, initialEmail, onClose }: { open: boolean; initialEmail?: string; onClose: () => void }) {
  const forgot = useForgotPassword();
  const reset = useResetPassword();
  const [step, setStep] = useState<"email" | "reset" | "done">("email");
  const [email, setEmail] = useState(initialEmail ?? "");
  const [otp, setOtp] = useState("");
  const [password, setPassword] = useState("");
  const [show, setShow] = useState(false);
  const [devNote, setDevNote] = useState(false);
  const [error, setError] = useState("");

  if (!open) return null;

  async function requestCode(e: React.FormEvent) {
    e.preventDefault();
    setError("");
    try {
      const res = await forgot.mutateAsync(email.trim());
      if (res.devOtp) {
        setOtp(res.devOtp); // dev mode: prefill so the flow is testable without an inbox
        setDevNote(true);
      }
      setStep("reset");
    } catch (err) {
      setError(err instanceof ApiError ? String(err.message) : "Could not send the code");
    }
  }

  async function submitReset(e: React.FormEvent) {
    e.preventDefault();
    setError("");
    try {
      await reset.mutateAsync({ email: email.trim(), otp: otp.trim(), newPassword: password });
      setStep("done");
    } catch (err) {
      setError(err instanceof ApiError ? String(err.message) : "Could not reset your password");
    }
  }

  return (
    <div className="modal-overlay" onClick={onClose}>
      <div className="modal-card fp-card" style={{ maxWidth: 440 }} onClick={(e) => e.stopPropagation()}>
        <button type="button" className="modal-close" onClick={onClose} aria-label="Close"><X size={18} /></button>

        {step === "email" && (
          <form onSubmit={requestCode}>
            <span className="fp-ico"><Mail size={22} /></span>
            <h2 style={{ marginTop: 0 }}>Reset your password</h2>
            <p className="muted">Enter your account email and we&apos;ll send you a 6-digit recovery code.</p>
            <label className="fp-label">
              <span>Email address</span>
              <input type="email" autoFocus required value={email} onChange={(e) => setEmail(e.target.value)} placeholder="name@example.com" />
            </label>
            {error && <div className="sponsor-auth-err" style={{ marginTop: 8 }}>{error}</div>}
            <button className="primary full" style={{ marginTop: 14 }} disabled={forgot.isPending || !email.trim()}>
              {forgot.isPending ? "Sending…" : "Send code"}
            </button>
          </form>
        )}

        {step === "reset" && (
          <form onSubmit={submitReset}>
            <span className="fp-ico"><KeyRound size={22} /></span>
            <h2 style={{ marginTop: 0 }}>Enter your code</h2>
            <p className="muted">We sent a 6-digit code to <b>{email}</b>. It expires in 10 minutes.</p>
            {devNote && <p className="fp-devnote">Email delivery is off in this environment — the code has been filled in for you.</p>}
            <label className="fp-label">
              <span>Recovery code</span>
              <input inputMode="numeric" maxLength={6} required value={otp} onChange={(e) => setOtp(e.target.value.replace(/\D/g, ""))} placeholder="6-digit code" style={{ letterSpacing: "0.3em", fontWeight: 700 }} />
            </label>
            <label className="fp-label">
              <span>New password</span>
              <div className="password">
                <input type={show ? "text" : "password"} required minLength={8} value={password} onChange={(e) => setPassword(e.target.value)} placeholder="At least 8 characters" />
                <button type="button" onClick={() => setShow(!show)} aria-label={show ? "Hide" : "Show"}>{show ? <EyeOff /> : <Eye />}</button>
              </div>
            </label>
            {error && <div className="sponsor-auth-err" style={{ marginTop: 8 }}>{error}</div>}
            <button className="primary full" style={{ marginTop: 14 }} disabled={reset.isPending || otp.length !== 6 || password.length < 8}>
              {reset.isPending ? "Updating…" : "Reset password"}
            </button>
            <button type="button" className="fp-resend" onClick={() => setStep("email")}>Use a different email / resend code</button>
          </form>
        )}

        {step === "done" && (
          <div style={{ textAlign: "center" }}>
            <span className="fp-ico ok"><CheckCircle2 size={24} /></span>
            <h2 style={{ marginTop: 0 }}>Password updated</h2>
            <p className="muted">You can now sign in with your new password.</p>
            <button className="primary full" style={{ marginTop: 14 }} onClick={onClose}>Back to sign in</button>
          </div>
        )}
      </div>
    </div>
  );
}
