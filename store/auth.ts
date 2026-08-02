"use client";

import { create } from "zustand";
import type { User } from "@supabase/supabase-js";
import { getSupabase, isSupabaseConfigured } from "@/lib/supabase";

export type AuthMode = "signin" | "signup";

type AuthState = {
  user: User | null;
  /** False until we have checked for an existing session. */
  ready: boolean;

  dialogOpen: boolean;
  mode: AuthMode;
  busy: boolean;
  error: string | null;
  /** Set when signup needs an email confirmation before signing in. */
  notice: string | null;

  init: () => (() => void) | void;
  openDialog: () => void;
  closeDialog: () => void;
  setMode: (mode: AuthMode) => void;

  signInWithGoogle: () => Promise<void>;
  signInWithPassword: (email: string, password: string) => Promise<void>;
  signUpWithPassword: (email: string, password: string) => Promise<void>;
  signOut: () => Promise<void>;
};

/**
 * Supabase's error strings are written for developers. Turn the common
 * ones into something a visitor can act on.
 */
function friendly(message: string): string {
  const m = message.toLowerCase();
  if (m.includes("invalid login credentials"))
    return "Wrong email or password.";
  if (m.includes("email not confirmed"))
    return "Please confirm your email first — check your inbox.";
  if (m.includes("already registered") || m.includes("already been registered"))
    return "That email already has an account. Try signing in instead.";
  if (m.includes("password should be at least"))
    return "Password must be at least 6 characters.";
  if (m.includes("unable to validate email") || m.includes("invalid email"))
    return "That email address does not look right.";
  if (m.includes("rate limit") || m.includes("too many"))
    return "Too many attempts. Please wait a minute and try again.";
  return message;
}

export const useAuth = create<AuthState>((set, get) => ({
  user: null,
  ready: !isSupabaseConfigured, // nothing to wait for when it is switched off
  dialogOpen: false,
  mode: "signin",
  busy: false,
  error: null,
  notice: null,

  /**
   * Called once when the app mounts.
   *
   * Two things happen: we ask for any session already stored in this
   * browser, and we subscribe to changes. The subscription is what signs
   * the user in after Google sends them back — the client swaps the
   * `?code=...` in the URL for a session and fires SIGNED_IN.
   */
  init: () => {
    const supabase = getSupabase();
    if (!supabase) return;

    supabase.auth.getSession().then(({ data }) => {
      set({ user: data.session?.user ?? null, ready: true });
    });

    const { data: sub } = supabase.auth.onAuthStateChange((event, session) => {
      set({ user: session?.user ?? null, ready: true });

      if (event === "SIGNED_IN") {
        set({ dialogOpen: false, error: null, notice: null, busy: false });

        // The sign-in code is single-use and already spent. Take it out of
        // the address bar so a refresh does not try to reuse it.
        if (typeof window !== "undefined" && window.location.search) {
          window.history.replaceState({}, "", window.location.pathname);
        }
      }
    });

    return () => sub.subscription.unsubscribe();
  },

  openDialog: () =>
    set({ dialogOpen: true, error: null, notice: null, mode: "signin" }),
  closeDialog: () => set({ dialogOpen: false, error: null, notice: null }),
  setMode: (mode) => set({ mode, error: null, notice: null }),

  /**
   * Sends the browser to Google, which sends it back to our site with a
   * code. There is no "await the user" here — the page navigates away.
   */
  signInWithGoogle: async () => {
    const supabase = getSupabase();
    if (!supabase) return;

    set({ busy: true, error: null });

    const { error } = await supabase.auth.signInWithOAuth({
      provider: "google",
      options: { redirectTo: window.location.origin },
    });

    if (error) set({ busy: false, error: friendly(error.message) });
  },

  signInWithPassword: async (email, password) => {
    const supabase = getSupabase();
    if (!supabase) return;

    set({ busy: true, error: null, notice: null });

    const { error } = await supabase.auth.signInWithPassword({
      email: email.trim(),
      password,
    });

    // On success onAuthStateChange closes the dialog for us.
    if (error) set({ busy: false, error: friendly(error.message) });
  },

  signUpWithPassword: async (email, password) => {
    const supabase = getSupabase();
    if (!supabase) return;

    set({ busy: true, error: null, notice: null });

    const { data, error } = await supabase.auth.signUp({
      email: email.trim(),
      password,
      options: { emailRedirectTo: window.location.origin },
    });

    if (error) {
      set({ busy: false, error: friendly(error.message) });
      return;
    }

    /**
     * If "Confirm email" is ON in Supabase, signUp returns a user but NO
     * session — they must click a link first. If it is OFF, the session
     * arrives immediately and onAuthStateChange takes over.
     */
    if (!data.session) {
      set({
        busy: false,
        notice: `Account created. Check ${email.trim()} to confirm it, then sign in.`,
      });
    }
  },

  signOut: async () => {
    await getSupabase()?.auth.signOut();
    set({ user: null });
  },
}));

/** Convenience for save actions: true when there is nobody to save for. */
export function requireSignIn(): boolean {
  const { user } = useAuth.getState();
  if (user) return false;
  useAuth.getState().openDialog();
  return true;
}
