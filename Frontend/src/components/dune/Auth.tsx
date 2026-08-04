"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";
import { ChevronRight, Clock3, Eye, EyeOff, ShieldCheck, Trophy } from "lucide-react";
import { Logo, Pill } from "./Shell";
import { FlipText, useFlipIndex } from "./FlipText";
import { useLogin, useRegister } from "../../lib/hooks/useAuth";
import { ApiError } from "../../lib/api-client";

export function DuneAuth({ register = false }: { register?: boolean }) {
  const router = useRouter();
  const login = useLogin();
  const signup = useRegister();
  const [show, setShow] = useState(false);
  const [fullName, setFullName] = useState("");
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [error, setError] = useState<string | null>(null);
  const pending = login.isPending || signup.isPending;
  const ko = useFlipIndex(5000) === 1; // drives labels/placeholders (attributes) + buttons

  async function submit(e: React.FormEvent) {
    e.preventDefault();
    setError(null);
    try {
      if (register) {
        await signup.mutateAsync({ fullName, email, password });
      } else {
        await login.mutateAsync({ email, password });
      }
      router.push("/home");
    } catch (err) {
      setError(err instanceof ApiError ? String(err.message) : "Something went wrong");
    }
  }

  return (
    <div className="auth-page">
      <div className="auth-art">
        <div className="auth-bg" />
        <div className="auth-shade" />
        <Logo />
        <div className="auth-quote">
          <Pill>
            <FlipText intervalMs={5000} items={[<>THE OASIS AWAITS</>, <>오아시스가 기다립니다</>]} />
          </Pill>
          <h1>
            <FlipText
              intervalMs={5400}
              items={[
                <>
                  Fortune favors
                  <br />
                  <em>the fearless.</em>
                </>,
                <>
                  행운은
                  <br />
                  <em>용감한 자의 편.</em>
                </>,
              ]}
            />
          </h1>
          <p>
            <FlipText
              intervalMs={5700}
              items={[
                <>Enter timed tournaments, climb live leaderboards, and claim your share of the prize.</>,
                <>시간제 토너먼트에 참가해 라이브 리더보드를 오르고, 상금을 차지하세요.</>,
              ]}
            />
          </p>
          <div className="auth-trust">
            <span>
              <ShieldCheck />
              <FlipText intervalMs={5100} items={[<>Secure payments</>, <>안전한 결제</>]} />
            </span>
            <span>
              <Trophy />
              <FlipText intervalMs={5300} items={[<>Fair tournaments</>, <>공정한 토너먼트</>]} />
            </span>
            <span>
              <Clock3 />
              <FlipText intervalMs={5500} items={[<>Live action</>, <>라이브 액션</>]} />
            </span>
          </div>
        </div>
        <small>{ko ? "18+ · 책임감 있는 플레이 · 약관 · 개인정보" : "18+ · Play responsibly · Terms · Privacy"}</small>
      </div>
      <div className="auth-form-wrap">
        <div className="auth-mobile-logo">
          <Logo />
        </div>
        <form className="auth-form" onSubmit={submit}>
          <p className="eyebrow">
            <FlipText
              intervalMs={5000}
              items={
                register
                  ? [<>CREATE YOUR PLAYER PROFILE</>, <>플레이어 프로필 만들기</>]
                  : [<>WELCOME BACK</>, <>다시 오신 것을 환영합니다</>]
              }
            />
          </p>
          <h2>
            <FlipText
              intervalMs={5300}
              items={
                register
                  ? [<>Join the adventure</>, <>모험에 참여하세요</>]
                  : [<>Ready for another spin?</>, <>다시 한 번 스핀할 준비가 되셨나요?</>]
              }
            />
          </h2>
          <p>
            <FlipText
              intervalMs={5600}
              items={
                register
                  ? [<>Your next tournament is only moments away.</>, <>다음 토너먼트가 곧 시작됩니다.</>]
                  : [<>Sign in to continue your journey across the dunes.</>, <>로그인하고 사막 여정을 이어가세요.</>]
              }
            />
          </p>
          {register && (
            <label>
              {ko ? "이름" : "Full name"}
              <input
                autoComplete="name"
                placeholder={ko ? "이름을 입력하세요" : "Your full name"}
                required
                value={fullName}
                onChange={(e) => setFullName(e.target.value)}
              />
            </label>
          )}
          <label>
            {ko ? "이메일 주소" : "Email address"}
            <input
              type="email"
              autoComplete="email"
              placeholder="name@example.com"
              required
              value={email}
              onChange={(e) => setEmail(e.target.value)}
            />
          </label>
          <label>
            {ko ? "비밀번호" : "Password"}
            <div className="password">
              <input
                type={show ? "text" : "password"}
                autoComplete={register ? "new-password" : "current-password"}
                placeholder={register ? (ko ? "강력한 비밀번호를 만드세요" : "Create a strong password") : ko ? "비밀번호를 입력하세요" : "Enter your password"}
                required
                minLength={register ? 8 : undefined}
                value={password}
                onChange={(e) => setPassword(e.target.value)}
              />
              <button type="button" onClick={() => setShow(!show)} aria-label={show ? "Hide password" : "Show password"}>
                {show ? <EyeOff /> : <Eye />}
              </button>
            </div>
          </label>
          {!register && (
            <div className="form-meta">
              <label>
                <input type="checkbox" />
                {ko ? "로그인 상태 유지" : "Remember me"}
              </label>
              <button type="button">{ko ? "비밀번호를 잊으셨나요?" : "Forgot password?"}</button>
            </div>
          )}
          {error && <p style={{ color: "var(--danger)", fontSize: "13px", margin: "2px 0" }}>{error}</p>}
          <button className="primary full xl" disabled={pending}>
            {pending
              ? ko
                ? "잠시만 기다려 주세요…"
                : "Please wait…"
              : register
                ? ko
                  ? "계정 만들기"
                  : "Create account"
                : ko
                  ? "WM 토너먼트 입장"
                  : "Enter WM Tournaments"}
            <ChevronRight size={18} />
          </button>
          {register && (
            <p className="legal">
              <ShieldCheck size={15} />
              {ko
                ? "계정을 만들면 만 18세 이상이며 약관 및 책임 플레이 정책에 동의하는 것으로 간주됩니다."
                : "By creating an account, you confirm you are 18+ and agree to the Terms and Responsible Play Policy."}
            </p>
          )}
          <div className="divider">
            <span>{ko ? "또는 다음으로 계속" : "or continue with"}</span>
          </div>
          <div className="socials">
            <button type="button" title="Coming soon" onClick={(e) => e.preventDefault()}>
              <span className="pay-logo google">G</span>Google
            </button>
            <button type="button" title="Coming soon" onClick={(e) => e.preventDefault()}>
              <span className="pay-logo apple">●</span>Apple
            </button>
          </div>
          <p className="auth-switch">
            {register
              ? ko
                ? "이미 사막을 탐험 중이신가요?"
                : "Already exploring the dunes?"
              : ko
                ? "WM 토너먼트가 처음이신가요?"
                : "New to WM Tournaments?"}{" "}
            <button type="button" onClick={() => router.push(register ? "/login" : "/register")}>
              {register ? (ko ? "로그인" : "Sign in") : ko ? "계정 만들기" : "Create an account"}
            </button>
          </p>
        </form>
      </div>
    </div>
  );
}
