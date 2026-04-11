"use client";

import { createClient } from "@/lib/supabase/client";
import Link from "next/link";
import { useRouter } from "next/navigation";
import { useState } from "react";

export default function LoginPage() {
  const router = useRouter();
  const supabase = createClient();
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [error, setError] = useState<string | null>(null);
  const [hint, setHint] = useState<string | null>(null);
  const [loading, setLoading] = useState(false);

  async function handleSignIn(e: React.FormEvent) {
    e.preventDefault();
    setError(null);
    setHint(null);
    setLoading(true);
    const { error: err } = await supabase.auth.signInWithPassword({ email, password });
    setLoading(false);
    if (err) {
      setError(err.message);
      return;
    }
    router.push("/dashboard");
    router.refresh();
  }

  async function handleSignUp(e: React.FormEvent) {
    e.preventDefault();
    setError(null);
    setHint(null);
    setLoading(true);
    const { error: err } = await supabase.auth.signUp({ email, password });
    setLoading(false);
    if (err) {
      setError(err.message);
      return;
    }
    setHint(
      "Wenn E-Mail-Bestätigung aktiv ist: Postfach prüfen. Sonst kannst du dich direkt anmelden.",
    );
  }

  return (
    <div className="flex min-h-full flex-1 flex-col items-center justify-center px-4 py-16">
      <div className="w-full max-w-sm space-y-6 rounded-lg border border-zinc-200 bg-white p-6 shadow-sm dark:border-zinc-800 dark:bg-zinc-950">
        <div>
          <h1 className="text-xl font-semibold tracking-tight">Leif OS</h1>
          <p className="mt-1 text-sm text-zinc-600 dark:text-zinc-400">
            Mit deinem Supabase-Konto anmelden oder neu registrieren.
          </p>
        </div>

        <form className="space-y-4" onSubmit={handleSignIn}>
          <label className="block text-sm font-medium text-zinc-700 dark:text-zinc-300">
            E-Mail
            <input
              type="email"
              autoComplete="email"
              required
              value={email}
              onChange={(e) => setEmail(e.target.value)}
              className="mt-1 w-full rounded-md border border-zinc-300 bg-white px-3 py-2 dark:border-zinc-700 dark:bg-zinc-900"
            />
          </label>
          <label className="block text-sm font-medium text-zinc-700 dark:text-zinc-300">
            Passwort
            <input
              type="password"
              autoComplete="current-password"
              required
              minLength={6}
              value={password}
              onChange={(e) => setPassword(e.target.value)}
              className="mt-1 w-full rounded-md border border-zinc-300 bg-white px-3 py-2 dark:border-zinc-700 dark:bg-zinc-900"
            />
          </label>

          {error ? (
            <p className="text-sm text-red-700 dark:text-red-300">{error}</p>
          ) : null}
          {hint ? (
            <p className="text-sm text-emerald-800 dark:text-emerald-200">{hint}</p>
          ) : null}

          <div className="flex flex-col gap-2 sm:flex-row">
            <button
              type="submit"
              disabled={loading}
              className="flex-1 rounded-md bg-zinc-900 py-2 text-sm font-medium text-white hover:bg-zinc-800 disabled:opacity-50 dark:bg-zinc-100 dark:text-zinc-900 dark:hover:bg-white"
            >
              {loading ? "…" : "Anmelden"}
            </button>
            <button
              type="button"
              disabled={loading}
              onClick={handleSignUp}
              className="flex-1 rounded-md border border-zinc-300 py-2 text-sm font-medium hover:bg-zinc-50 disabled:opacity-50 dark:border-zinc-600 dark:hover:bg-zinc-900"
            >
              Registrieren
            </button>
          </div>
        </form>

        <p className="text-center text-sm text-zinc-500">
          <Link href="/dashboard" className="underline-offset-2 hover:underline">
            Zum Dashboard
          </Link>
        </p>
      </div>
    </div>
  );
}
