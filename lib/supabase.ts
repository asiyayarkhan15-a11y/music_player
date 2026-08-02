"use client";

import { createClient, type SupabaseClient } from "@supabase/supabase-js";

/**
 * One Supabase client for the whole browser session.
 *
 * Both of these values are PUBLIC on purpose — they are compiled into the
 * JavaScript every visitor downloads. That is safe only because Row Level
 * Security is switched on for every table (see supabase/schema.sql).
 * The anon key by itself can read and write nothing.
 *
 * The dangerous one is the `service_role` key. It ignores RLS entirely.
 * Never put it in a NEXT_PUBLIC_ variable, and never import it here.
 */
const url = process.env.NEXT_PUBLIC_SUPABASE_URL;

/**
 * Supabase renamed this key. Older projects call it the "anon" key
 * (starts with `eyJ...`); newer ones call it the "publishable" key
 * (starts with `sb_publishable_...`). They do the same job, so accept
 * either variable name and use whichever is filled in.
 */
const anonKey =
  process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY ||
  process.env.NEXT_PUBLIC_SUPABASE_PUBLISHABLE_KEY;

/** False until the two env vars exist — the app then runs without saving. */
export const isSupabaseConfigured = Boolean(url && anonKey);

let client: SupabaseClient | null = null;

export function getSupabase(): SupabaseClient | null {
  if (!url || !anonKey) return null;

  if (!client) {
    client = createClient(url, anonKey, {
      auth: {
        persistSession: true,
        autoRefreshToken: true,
        /**
         * The magic link sends the user back with `?code=...` in the URL.
         * This tells the client to notice that, swap the code for a real
         * session, and store it — no callback route needed.
         */
        detectSessionInUrl: true,
        flowType: "pkce",
      },
    });
  }

  return client;
}
