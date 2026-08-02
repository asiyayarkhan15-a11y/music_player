"use client";

import { useState } from "react";
import { useAuth } from "@/store/auth";
import { isSupabaseConfigured } from "@/lib/supabase";
import { SpinnerIcon, GoogleIcon } from "@/components/icons";

/**
 * Sign in with Google (one click) or with an email and password.
 *
 * Google is placed first and given the visual weight, because it is the
 * path most people will take — no typing, no password to invent.
 */
export default function AuthDialog() {
  const open = useAuth((s) => s.dialogOpen);
  const close = useAuth((s) => s.closeDialog);
  const mode = useAuth((s) => s.mode);
  const setMode = useAuth((s) => s.setMode);
  const busy = useAuth((s) => s.busy);
  const error = useAuth((s) => s.error);
  const notice = useAuth((s) => s.notice);

  const signInWithGoogle = useAuth((s) => s.signInWithGoogle);
  const signInWithPassword = useAuth((s) => s.signInWithPassword);
  const signUpWithPassword = useAuth((s) => s.signUpWithPassword);

  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");

  if (!open) return null;

  const signingUp = mode === "signup";

  function submit(e: React.FormEvent) {
    e.preventDefault();
    if (!email.trim() || !password) return;
    if (signingUp) signUpWithPassword(email, password);
    else signInWithPassword(email, password);
  }

  return (
    <div
      className="fixed inset-0 z-50 grid place-items-center bg-black/60 p-4 backdrop-blur-sm"
      role="dialog"
      aria-modal="true"
      aria-label={signingUp ? "Create an account" : "Sign in"}
    >
      {/* Clicking the dark area closes the dialog. */}
      <button
        className="absolute inset-0 cursor-default"
        onClick={close}
        aria-label="Close"
        tabIndex={-1}
      />

      <div className="relative w-full max-w-sm rounded-2xl border border-line bg-surface p-6 shadow-2xl">
        {!isSupabaseConfigured ? (
          <>
            <h2 className="text-lg font-semibold">Sign-in is not set up yet</h2>
            <p className="mt-2 text-sm text-muted">
              Add <code>NEXT_PUBLIC_SUPABASE_URL</code> and{" "}
              <code>NEXT_PUBLIC_SUPABASE_ANON_KEY</code> to{" "}
              <code>.env.local</code>, then restart the server.
            </p>
            <button
              onClick={close}
              className="mt-5 w-full rounded-lg bg-surface-2 py-2.5 text-sm transition hover:text-fg"
            >
              Close
            </button>
          </>
        ) : (
          <>
            <h2 className="text-lg font-semibold">
              {signingUp ? "Create an account" : "Welcome back"}
            </h2>
            <p className="mt-1.5 text-sm text-muted">
              {signingUp
                ? "Save favourites and playlists to your account."
                : "Sign in to reach your saved music."}
            </p>

            {/* ---------- Google ---------- */}
            <button
              onClick={signInWithGoogle}
              disabled={busy}
              className="mt-5 flex w-full items-center justify-center gap-2.5 rounded-lg bg-white py-2.5 text-sm font-medium text-neutral-800 transition hover:bg-neutral-100 disabled:cursor-not-allowed disabled:opacity-60"
            >
              <GoogleIcon className="size-4" />
              Continue with Google
            </button>

            <div className="my-4 flex items-center gap-3">
              <span className="h-px flex-1 bg-line" />
              <span className="text-[11px] uppercase tracking-wide text-muted">
                or
              </span>
              <span className="h-px flex-1 bg-line" />
            </div>

            {/* ---------- email + password ---------- */}
            <form onSubmit={submit} className="space-y-2.5">
              <input
                type="email"
                required
                autoComplete="email"
                value={email}
                onChange={(e) => setEmail(e.target.value)}
                placeholder="you@example.com"
                className="w-full rounded-lg border border-line bg-bg px-3 py-2.5 text-sm outline-none transition placeholder:text-muted focus:border-accent focus:ring-2 focus:ring-accent/25"
              />

              <input
                type="password"
                required
                minLength={6}
                autoComplete={signingUp ? "new-password" : "current-password"}
                value={password}
                onChange={(e) => setPassword(e.target.value)}
                placeholder={
                  signingUp ? "Choose a password (6+ characters)" : "Password"
                }
                className="w-full rounded-lg border border-line bg-bg px-3 py-2.5 text-sm outline-none transition placeholder:text-muted focus:border-accent focus:ring-2 focus:ring-accent/25"
              />

              {error && <p className="text-xs text-red-300">{error}</p>}
              {notice && <p className="text-xs text-accent">{notice}</p>}

              <button
                type="submit"
                disabled={busy || !email.trim() || password.length < 6}
                className="flex w-full items-center justify-center gap-2 rounded-lg bg-accent-strong py-2.5 text-sm font-medium text-bg transition hover:brightness-110 disabled:cursor-not-allowed disabled:opacity-50"
              >
                {busy && <SpinnerIcon className="size-4" />}
                {signingUp ? "Create account" : "Sign in"}
              </button>
            </form>

            <p className="mt-4 text-center text-xs text-muted">
              {signingUp ? "Already have an account?" : "New here?"}{" "}
              <button
                onClick={() => setMode(signingUp ? "signin" : "signup")}
                className="text-accent underline-offset-2 hover:underline"
              >
                {signingUp ? "Sign in" : "Create one"}
              </button>
            </p>

            <button
              onClick={close}
              className="mt-1 w-full rounded-lg py-2 text-xs text-muted transition hover:text-fg"
            >
              Not now
            </button>
          </>
        )}
      </div>
    </div>
  );
}
