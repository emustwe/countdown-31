"use client";

import { useState } from "react";
import Link from "next/link";
import { useRouter } from "next/navigation";
import { useRegister } from "../../lib/hooks/useAuth";
import { ApiError } from "../../lib/api-client";

export default function RegisterPage() {
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [error, setError] = useState<string | null>(null);
  const register = useRegister();
  const router = useRouter();

  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault();
    setError(null);
    try {
      await register.mutateAsync({ email, password });
      router.push("/lobby");
    } catch (err) {
      setError(err instanceof ApiError ? String(err.message) : "Something went wrong");
    }
  }

  return (
    <div className="flex min-h-screen items-center justify-center px-4">
      <div className="surface w-full max-w-sm rounded-lg p-8">
        <h1 className="mb-1 text-xl font-semibold text-[var(--color-accent)]">Aurora Ways</h1>
        <p className="mb-6 text-sm text-[var(--color-text-dim)]">
          Create a demo account — funded with play credits, no real money involved.
        </p>

        <form onSubmit={handleSubmit} className="space-y-4">
          <div>
            <label htmlFor="email" className="mb-1 block text-sm text-[var(--color-text-dim)]">
              Email
            </label>
            <input
              id="email"
              type="email"
              required
              value={email}
              onChange={(e) => setEmail(e.target.value)}
              className="w-full rounded-md border border-[var(--color-border)] bg-[var(--color-surface-2)] px-3 py-2 text-sm outline-none focus:border-[var(--color-accent)]"
            />
          </div>
          <div>
            <label htmlFor="password" className="mb-1 block text-sm text-[var(--color-text-dim)]">
              Password
            </label>
            <input
              id="password"
              type="password"
              required
              minLength={8}
              value={password}
              onChange={(e) => setPassword(e.target.value)}
              className="w-full rounded-md border border-[var(--color-border)] bg-[var(--color-surface-2)] px-3 py-2 text-sm outline-none focus:border-[var(--color-accent)]"
            />
            <p className="mt-1 text-xs text-[var(--color-text-dim)]">At least 8 characters.</p>
          </div>

          {error && <p className="text-sm text-[var(--color-danger)]">{error}</p>}

          <button
            type="submit"
            disabled={register.isPending}
            className="w-full rounded-md bg-[var(--color-accent)] px-3 py-2 text-sm font-semibold text-black disabled:opacity-60"
          >
            {register.isPending ? "Creating account…" : "Create account"}
          </button>
        </form>

        <p className="mt-6 text-center text-sm text-[var(--color-text-dim)]">
          Already have an account?{" "}
          <Link href="/login" className="text-[var(--color-accent)]">
            Sign in
          </Link>
        </p>
      </div>
    </div>
  );
}
