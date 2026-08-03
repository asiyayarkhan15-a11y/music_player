"use client";

import { getSupabase } from "@/lib/supabase";

export type Profile = {
  id: string;
  displayName: string;
  avatarUrl: string | null;
};

/** Pictures bigger than this are rejected before we waste an upload. */
export const MAX_AVATAR_BYTES = 2 * 1024 * 1024; // 2 MB

export async function getProfile(): Promise<Profile | null> {
  const supabase = getSupabase();
  if (!supabase) return null;

  const { data, error } = await supabase
    .from("profiles")
    .select("id, display_name, avatar_url")
    .single();

  if (error || !data) {
    // PGRST116 = "no rows", which just means the trigger has not run for
    // this account yet. Not worth shouting about.
    if (error && error.code !== "PGRST116") {
      console.error("[profile] getProfile", error.message);
    }
    return null;
  }

  return {
    id: data.id as string,
    displayName: (data.display_name as string) ?? "",
    avatarUrl: (data.avatar_url as string) ?? null,
  };
}

export async function saveDisplayName(name: string): Promise<void> {
  const supabase = getSupabase();
  if (!supabase) return;

  const { error } = await supabase
    .from("profiles")
    .update({ display_name: name.trim(), updated_at: new Date().toISOString() })
    .eq("id", (await supabase.auth.getUser()).data.user?.id ?? "");

  if (error) throw new Error(error.message);
}

/**
 * Upload a picture and return its public address.
 *
 * The file is stored at  <user-id>/avatar  — one fixed path per person,
 * overwritten each time. That means no orphaned old pictures piling up
 * in storage, and the RLS policy can check the folder name to be sure
 * you are only writing your own.
 */
export async function uploadAvatar(file: File): Promise<string> {
  const supabase = getSupabase();
  if (!supabase) throw new Error("Not signed in.");

  if (!file.type.startsWith("image/")) {
    throw new Error("That file is not an image.");
  }
  if (file.size > MAX_AVATAR_BYTES) {
    throw new Error("Picture must be smaller than 2 MB.");
  }

  const { data: userData } = await supabase.auth.getUser();
  const userId = userData.user?.id;
  if (!userId) throw new Error("Not signed in.");

  const path = `${userId}/avatar`;

  const { error: uploadError } = await supabase.storage
    .from("avatars")
    .upload(path, file, { upsert: true, contentType: file.type });

  if (uploadError) throw new Error(uploadError.message);

  const { data } = supabase.storage.from("avatars").getPublicUrl(path);

  /**
   * Because the path never changes, browsers would keep showing the old
   * picture from cache. The timestamp makes each new upload a different
   * address, so the new one appears immediately.
   */
  const url = `${data.publicUrl}?v=${Date.now()}`;

  const { error: saveError } = await supabase
    .from("profiles")
    .update({ avatar_url: url, updated_at: new Date().toISOString() })
    .eq("id", userId);

  if (saveError) throw new Error(saveError.message);

  return url;
}

export async function removeAvatar(): Promise<void> {
  const supabase = getSupabase();
  if (!supabase) return;

  const { data: userData } = await supabase.auth.getUser();
  const userId = userData.user?.id;
  if (!userId) return;

  await supabase.storage.from("avatars").remove([`${userId}/avatar`]);

  const { error } = await supabase
    .from("profiles")
    .update({ avatar_url: null, updated_at: new Date().toISOString() })
    .eq("id", userId);

  if (error) throw new Error(error.message);
}

/**
 * Changing the email is NOT instant. Supabase sends a confirmation link
 * to the new address (and to the old one too, unless "Secure email
 * change" is switched off). The account keeps the old email until the
 * link is clicked.
 */
export async function updateEmail(email: string): Promise<void> {
  const supabase = getSupabase();
  if (!supabase) return;

  const { error } = await supabase.auth.updateUser({ email: email.trim() });
  if (error) throw new Error(error.message);
}

/**
 * Change the password.
 *
 * ⚠️ `currentPassword` must be supplied by anyone who already has one.
 *
 * Without that check, being signed in would be enough to take over an
 * account — someone who found an unattended browser could set a new
 * password, and the real owner would be locked out. Supabase's
 * `updateUser` does not verify the old password by itself, so we prove
 * it by signing in with it first. If those credentials are wrong the
 * sign-in fails and we never reach the update.
 *
 * People who signed up with Google have no password yet, so there is
 * nothing to verify — they pass `undefined` and simply gain one.
 */
export async function updatePassword(
  password: string,
  currentPassword?: string,
): Promise<void> {
  const supabase = getSupabase();
  if (!supabase) return;

  /**
   * The decision is made here, not in the form, so a mistake in the UI
   * cannot let someone through.
   */
  const { data } = await supabase.auth.getUser();
  const user = data.user;
  if (!user?.email) throw new Error("Not signed in.");

  // Read from the database, not from `identities` — see the note on
  // accountHasPassword() for why that field cannot answer this.
  const hasPassword = await accountHasPassword();

  if (hasPassword) {
    if (!currentPassword) {
      throw new Error("Enter your current password to change it.");
    }

    // Supabase's updateUser does not check the old password, so prove it
    // by signing in with it. Wrong password -> this fails -> we stop here.
    const { error: verifyError } = await supabase.auth.signInWithPassword({
      email: user.email,
      password: currentPassword,
    });

    if (verifyError) throw new Error("Your current password is not correct.");
  }

  const { error } = await supabase.auth.updateUser({ password });
  if (error) throw new Error(error.message);
}

/**
 * Does this account already have a password?
 *
 * Supabase records one "identity" per sign-in method. A Google-only
 * account has just `google`; adding a password adds an `email` identity.
 */
/**
 * Does this account already have a password?
 *
 * ⚠️ You cannot answer this from the user object. Setting a password on a
 * Google account does NOT add an "email" identity — Supabase writes it
 * onto the user record and `identities` still shows Google alone. An
 * earlier version checked exactly that and was wrong every time.
 *
 * The truth is auth.users.encrypted_password, which the browser must
 * never see, so a database trigger mirrors a plain yes/no into
 * public.profiles. See supabase/password-flag.sql.
 */
export async function accountHasPassword(): Promise<boolean> {
  const supabase = getSupabase();
  if (!supabase) return false;

  const { data, error } = await supabase
    .from("profiles")
    .select("has_password")
    .single();

  if (error) {
    console.error("[profile] accountHasPassword", error.message);
    return false;
  }

  return Boolean(data?.has_password);
}
