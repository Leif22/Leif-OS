"use client";

import { createClient } from "@/lib/supabase/client";
import { LeifOsLogo } from "@/components/brand/leif-os-logo";
import { AlertBanner } from "@/components/ui/alert-banner";
import { Button } from "@/components/ui/button";
import { controlClass } from "@/components/ui/control-styles";
import Link from "next/link";
import { useRouter, useSearchParams } from "next/navigation";
import { useState, type FormEvent } from "react";

function safeInternalPath(raw: string | null): string | undefined {
  if (!raw || !raw.startsWith("/") || raw.startsWith("//")) return undefined;
  if (raw.includes("\n") || raw.includes("\r")) return undefined;
  return raw;
}

export function LoginForm() {
  const router = useRouter();
  const searchParams = useSearchParams();
  const supabase = createClient();
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [error, setError] = useState<string | null>(null);
  const [hint, setHint] = useState<string | null>(null);
  const [loading, setLoading] = useState(false);

  const nextPath = safeInternalPath(searchParams.get("next"));
  const parqetOauth = searchParams.get("parqet_oauth");

  async function handleSignIn(e: FormEvent) {
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
    router.push(nextPath ?? "/dashboard");
    router.refresh();
  }

  async function handleSignUp(e: FormEvent) {
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
    <div className="flex min-h-full flex-1 flex-col items-center justify-center bg-leif-canvas px-4 py-16">
      <div className="w-full max-w-sm space-y-6 rounded-[12px] border border-leif-border bg-leif-surface p-8 shadow-leif">
        <div>
          <div className="flex items-center gap-4">
            <LeifOsLogo className="h-20 w-20" decorative size={80} />
            <h1 className="text-3xl font-bold tracking-tight text-leif-text">Leif OS</h1>
          </div>
          <p className="mt-2 text-sm text-leif-secondary">
            Mit deinem Supabase-Konto anmelden oder neu registrieren.
          </p>
          {parqetOauth === "session" ? (
            <AlertBanner variant="warning" className="mt-4">
              Für Parqet musst du in Leif OS angemeldet sein. Nach der Anmeldung bitte erneut „Mit
              Parqet verbinden“ im Dashboard starten.
            </AlertBanner>
          ) : null}
        </div>

        <form className="space-y-4" onSubmit={handleSignIn}>
          <label className="block text-sm font-medium text-leif-secondary">
            E-Mail
            <input
              type="email"
              autoComplete="email"
              required
              value={email}
              onChange={(e) => setEmail(e.target.value)}
              className={`${controlClass} mt-2`}
            />
          </label>
          <label className="block text-sm font-medium text-leif-secondary">
            Passwort
            <input
              type="password"
              autoComplete="current-password"
              required
              minLength={6}
              value={password}
              onChange={(e) => setPassword(e.target.value)}
              className={`${controlClass} mt-2`}
            />
          </label>

          {error ? (
            <AlertBanner variant="error">{error}</AlertBanner>
          ) : null}
          {hint ? <AlertBanner variant="success">{hint}</AlertBanner> : null}

          <div className="flex flex-col gap-2 sm:flex-row">
            <Button type="submit" disabled={loading} className="flex-1">
              {loading ? "…" : "Anmelden"}
            </Button>
            <Button type="button" variant="secondary" disabled={loading} onClick={handleSignUp} className="flex-1">
              Registrieren
            </Button>
          </div>
        </form>

        <p className="text-center text-sm text-leif-muted">
          <Link href="/dashboard" className="font-medium text-leif-secondary underline-offset-4 hover:text-leif-text hover:underline">
            Zum Dashboard
          </Link>
        </p>
      </div>
    </div>
  );
}
