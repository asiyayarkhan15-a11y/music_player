"use client";

import { useEffect, useRef, useState } from "react";
import { useProfile } from "@/store/profile";
import { useAuth } from "@/store/auth";
import { MAX_AVATAR_BYTES, accountHasPassword } from "@/lib/profile";
import { isPasswordValid } from "@/lib/constants";
import PasswordField from "@/components/PasswordField";
import { SpinnerIcon, UserIcon } from "@/components/icons";

export default function ProfileDialog() {
  const open = useProfile((s) => s.dialogOpen);
  const close = useProfile((s) => s.closeDialog);
  const profile = useProfile((s) => s.profile);
  const busy = useProfile((s) => s.busy);
  const error = useProfile((s) => s.error);
  const notice = useProfile((s) => s.notice);

  const saveName = useProfile((s) => s.saveName);
  const uploadPicture = useProfile((s) => s.uploadPicture);
  const removePicture = useProfile((s) => s.removePicture);
  const changeEmail = useProfile((s) => s.changeEmail);
  const changePassword = useProfile((s) => s.changePassword);

  const user = useAuth((s) => s.user);

  const fileRef = useRef<HTMLInputElement | null>(null);
  const [name, setName] = useState("");
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [currentPassword, setCurrentPassword] = useState("");
  /** null = still asking the server. Nothing is guessed while it is null. */
  const [hasPassword, setHasPassword] = useState<boolean | null>(null);
  /** Problems we can spot without asking the server. */
  const [formError, setFormError] = useState<string | null>(null);

  /* Fill the form when the dialog opens, not on every render. */
  useEffect(() => {
    if (open) {
      setName(profile?.displayName ?? "");
      setEmail(user?.email ?? "");
      setPassword("");
      setCurrentPassword("");
    }
  }, [open, profile?.displayName, user?.email]);

  /* Ask the server whether this account has a password, each time the
     dialog opens — it changes the moment someone sets their first one. */
  useEffect(() => {
    if (!open) return;

    let cancelled = false;
    setHasPassword(null);
    accountHasPassword().then((value) => {
      if (!cancelled) setHasPassword(value);
    });

    return () => {
      cancelled = true;
    };
  }, [open]);

  if (!open) return null;

  const emailChanged = email.trim() !== (user?.email ?? "") && email.trim() !== "";

  return (
    <div
      className="fixed inset-0 z-50 grid place-items-center overflow-y-auto bg-black/60 p-4 backdrop-blur-sm"
      role="dialog"
      aria-modal="true"
      aria-label="Your profile"
    >
      <button
        className="absolute inset-0 cursor-default"
        onClick={close}
        aria-label="Close"
        tabIndex={-1}
      />

      <div className="relative my-8 w-full max-w-sm rounded-2xl border border-line bg-surface p-6 shadow-2xl">
        <h2 className="text-lg font-semibold">Your profile</h2>

        {/* ---------------- picture ---------------- */}
        <div className="mt-5 flex items-center gap-4">
          <div className="grid size-16 shrink-0 place-items-center overflow-hidden rounded-full bg-surface-2">
            {profile?.avatarUrl ? (
              // eslint-disable-next-line @next/next/no-img-element
              <img
                src={profile.avatarUrl}
                alt=""
                className="size-full object-cover"
              />
            ) : (
              <UserIcon className="size-7 text-muted" />
            )}
          </div>

          <div className="min-w-0">
            <div className="flex flex-wrap gap-2">
              <button
                onClick={() => fileRef.current?.click()}
                disabled={busy}
                className="rounded-lg bg-surface-2 px-3 py-1.5 text-xs transition hover:brightness-125 disabled:opacity-50"
              >
                {profile?.avatarUrl ? "Change picture" : "Upload picture"}
              </button>

              {profile?.avatarUrl && (
                <button
                  onClick={removePicture}
                  disabled={busy}
                  className="rounded-lg px-3 py-1.5 text-xs text-muted transition hover:text-fg disabled:opacity-50"
                >
                  Remove
                </button>
              )}
            </div>
            <p className="mt-1.5 text-[11px] text-muted">
              JPG or PNG, up to {MAX_AVATAR_BYTES / 1024 / 1024} MB
            </p>
          </div>

          <input
            ref={fileRef}
            type="file"
            accept="image/*"
            className="hidden"
            onChange={(e) => {
              const file = e.target.files?.[0];
              if (file) uploadPicture(file);
              // Reset so choosing the same file twice still fires onChange.
              e.target.value = "";
            }}
          />
        </div>

        {/* ---------------- name ---------------- */}
        <form
          onSubmit={(e) => {
            e.preventDefault();
            saveName(name);
          }}
          className="mt-6"
        >
          <label className="text-xs text-muted" htmlFor="profile-name">
            Display name
          </label>
          <div className="mt-1.5 flex gap-2">
            <input
              id="profile-name"
              value={name}
              maxLength={60}
              onChange={(e) => setName(e.target.value)}
              placeholder="Your name"
              className="min-w-0 flex-1 rounded-lg border border-line bg-bg px-3 py-2 text-sm outline-none transition placeholder:text-muted focus:border-accent focus:ring-2 focus:ring-accent/25"
            />
            <button
              type="submit"
              disabled={busy || name.trim() === (profile?.displayName ?? "")}
              className="shrink-0 rounded-lg bg-surface-2 px-3 text-sm transition hover:brightness-125 disabled:opacity-40"
            >
              Save
            </button>
          </div>
        </form>

        {/* ---------------- email ---------------- */}
        <form
          onSubmit={(e) => {
            e.preventDefault();
            changeEmail(email);
          }}
          className="mt-4"
        >
          <label className="text-xs text-muted" htmlFor="profile-email">
            Email
          </label>
          <div className="mt-1.5 flex gap-2">
            <input
              id="profile-email"
              type="email"
              value={email}
              onChange={(e) => setEmail(e.target.value)}
              className="min-w-0 flex-1 rounded-lg border border-line bg-bg px-3 py-2 text-sm outline-none transition focus:border-accent focus:ring-2 focus:ring-accent/25"
            />
            <button
              type="submit"
              disabled={busy || !emailChanged}
              className="shrink-0 rounded-lg bg-surface-2 px-3 text-sm transition hover:brightness-125 disabled:opacity-40"
            >
              Change
            </button>
          </div>
          {emailChanged && (
            <p className="mt-1.5 text-[11px] text-muted">
              You will get a confirmation link. The change happens only after
              you click it.
            </p>
          )}
        </form>

        {/* ---------------- password ---------------- */}
        <form
          onSubmit={async (e) => {
            e.preventDefault();
            setFormError(null);

            if (!isPasswordValid(password)) {
              setFormError("Your new password does not meet all the rules below.");
              return;
            }
            if (hasPassword === true && !currentPassword) {
              setFormError("Enter your current password to change it.");
              return;
            }

            // Always hand over whatever was typed. lib/profile.ts asks the
            // server whether it is actually required — that decision must
            // not depend on this form being right.
            await changePassword(password, currentPassword || undefined);
            setPassword("");
            setCurrentPassword("");

            /* Setting a first password turns a Google-only account into one
               that HAS a password, so the "Current password" box must now
               appear. Without this re-check it only showed up after closing
               and reopening the dialog. */
            setHasPassword(await accountHasPassword());
          }}
          className="mt-4"
        >
          {/* Only asked for when there IS one. A Google-only account has
              no password yet, so demanding it would be impossible. */}
          {hasPassword === true && (
            <div className="mb-2.5">
              <label
                className="text-xs text-muted"
                htmlFor="profile-current-password"
              >
                Current password
              </label>
              <div className="mt-1.5">
                <PasswordField
                  id="profile-current-password"
                  value={currentPassword}
                  onChange={setCurrentPassword}
                  placeholder="Your password right now"
                  autoComplete="current-password"
                />
              </div>
            </div>
          )}

          <label className="text-xs text-muted" htmlFor="profile-password">
            New password
          </label>
          <div className="mt-1.5 flex gap-2">
            <div className="min-w-0 flex-1">
              <PasswordField
                id="profile-password"
                value={password}
                onChange={setPassword}
                placeholder="New password"
                autoComplete="new-password"
                showRules
              />
            </div>
            <button
              type="submit"
              // Clickable as soon as something is typed. A greyed-out
              // button that will not say why is worse than an error.
              disabled={busy || !password}
              className="h-[42px] shrink-0 rounded-lg bg-surface-2 px-3 text-sm transition hover:brightness-125 disabled:opacity-40"
            >
              Set
            </button>
          </div>
          <p className="mt-1.5 text-[11px] text-muted">
            {hasPassword === true
              ? "Your current password is required, so nobody can take over your account from a browser you left signed in."
              : hasPassword === false
                ? "You signed in with Google, so you have no password yet. Adding one lets you sign in either way."
                : "Checking your account…"}
          </p>
        </form>

        {/* ---------------- feedback ---------------- */}
        {(formError || error || notice) && (
          <p
            className={`mt-4 text-xs ${
              formError || error ? "text-red-300" : "text-accent"
            }`}
            role="status"
          >
            {formError ?? error ?? notice}
          </p>
        )}

        <div className="mt-5 flex items-center gap-2">
          {busy && <SpinnerIcon className="size-4 text-muted" />}
          <button
            onClick={close}
            className="ml-auto rounded-lg bg-surface-2 px-4 py-2 text-sm transition hover:brightness-125"
          >
            Done
          </button>
        </div>
      </div>
    </div>
  );
}
