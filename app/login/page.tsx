"use client";

import { useState } from "react";
import { createClient } from "@/lib/supabase/client";
import { Card, Field, inputClass, PrimaryButton } from "@/components/ui";
import { LogoMark } from "@/components/Logo";

type Provider = "google" | "facebook";

const PROVIDERS: { id: Provider; label: string; icon: string }[] = [
  { id: "google", label: "Continue with Google", icon: "G" },
  { id: "facebook", label: "Continue with Facebook", icon: "f" },
];

export default function LoginPage() {
  const [email, setEmail] = useState("");
  const [sent, setSent] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [loading, setLoading] = useState(false);
  const [oauthBusy, setOauthBusy] = useState<Provider | null>(null);

  async function handleOAuth(provider: Provider) {
    setError(null);
    setOauthBusy(provider);
    try {
      const supabase = createClient();
      const { error } = await supabase.auth.signInWithOAuth({
        provider,
        options: { redirectTo: `${window.location.origin}/auth/callback` },
      });
      if (error) throw error;
      // On success the browser navigates away to the provider.
    } catch {
      setOauthBusy(null);
      setError(
        `${
          provider === "google" ? "Google" : "Facebook"
        } sign-in isn't available yet — it appears here once enabled in Supabase (Auth → Providers). You can use email instead.`
      );
    }
  }

  async function handleEmail(e: React.FormEvent) {
    e.preventDefault();
    setError(null);
    setLoading(true);
    try {
      const supabase = createClient();
      const { error } = await supabase.auth.signInWithOtp({
        email: email.trim(),
        options: {
          emailRedirectTo: `${window.location.origin}/auth/confirm`,
        },
      });
      if (error) throw error;
      setSent(true);
    } catch (e) {
      setError(e instanceof Error ? e.message : "Could not send the sign-in link");
    } finally {
      setLoading(false);
    }
  }

  return (
    <div className="mx-auto flex min-h-[70vh] w-full max-w-md flex-col justify-center px-1">
      <div className="mb-8 text-center">
        <div className="mx-auto mb-5 flex justify-center">
          <LogoMark className="h-16 w-16" />
        </div>
        <h1 className="font-display text-4xl font-semibold tracking-tight">
          Nalapaka
        </h1>
        <p className="mt-2 text-bark-500">
          Your kitchen, always stocked. Sign in to get cooking.
        </p>
      </div>

      <Card className="p-6">
        <div className="space-y-2.5">
          {PROVIDERS.map((p) => (
            <button
              key={p.id}
              onClick={() => handleOAuth(p.id)}
              disabled={oauthBusy !== null || loading}
              className="inline-flex min-h-[48px] w-full items-center justify-center gap-3 rounded-xl bg-white px-4 py-2.5 text-sm font-semibold text-bark-800 ring-1 ring-bark-900/15 transition-all duration-150 hover:bg-cream-100 hover:ring-bark-900/25 active:scale-[0.98] disabled:opacity-60"
            >
              <span
                aria-hidden
                className={`flex h-6 w-6 items-center justify-center rounded-full text-sm font-bold text-white ${
                  p.id === "google" ? "bg-[#4285F4]" : "bg-[#1877F2]"
                }`}
              >
                {p.icon}
              </span>
              {oauthBusy === p.id ? "Connecting…" : p.label}
            </button>
          ))}
        </div>

        <div className="my-5 flex items-center gap-3" aria-hidden>
          <span className="h-px flex-1 bg-bark-900/10" />
          <span className="text-xs font-semibold uppercase tracking-wider text-bark-400">
            or
          </span>
          <span className="h-px flex-1 bg-bark-900/10" />
        </div>

        {sent ? (
          <div className="text-center">
            <div className="text-4xl" aria-hidden>📬</div>
            <p className="mt-3 font-medium">Check your inbox</p>
            <p className="mt-1 text-sm text-bark-500">
              We sent a sign-in link to{" "}
              <span className="font-medium text-bark-700">{email}</span>. Tap it
              on this device to continue.
            </p>
            <button
              onClick={() => setSent(false)}
              className="mt-4 text-sm font-medium text-sage-700 hover:underline"
            >
              Use a different email
            </button>
          </div>
        ) : (
          <form onSubmit={handleEmail} className="space-y-4">
            <Field label="Email address" htmlFor="login-email">
              <input
                id="login-email"
                type="email"
                required
                value={email}
                onChange={(e) => setEmail(e.target.value)}
                placeholder="you@example.com"
                className={inputClass}
                autoComplete="email"
              />
            </Field>
            <PrimaryButton type="submit" disabled={loading || oauthBusy !== null} className="w-full">
              {loading ? "Sending…" : "Send sign-in link"}
            </PrimaryButton>
            <p className="text-center text-xs leading-relaxed text-bark-500">
              No password needed — we email you a secure link.
            </p>
          </form>
        )}

        {error && (
          <p role="alert" className="mt-4 rounded-xl bg-ember-50 px-3.5 py-2.5 text-sm leading-relaxed text-ember-700 ring-1 ring-ember-500/20">
            {error}
          </p>
        )}
      </Card>

      <p className="mt-5 text-center text-xs leading-relaxed text-bark-400">
        Google and Facebook login appear once enabled in the Supabase dashboard
        under Auth → Providers.
      </p>
    </div>
  );
}
