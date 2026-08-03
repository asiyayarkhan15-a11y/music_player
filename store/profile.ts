"use client";

import { create } from "zustand";
import * as api from "@/lib/profile";
import type { Profile } from "@/lib/profile";
import { friendly } from "@/store/auth";

type ProfileState = {
  profile: Profile | null;
  dialogOpen: boolean;
  busy: boolean;
  error: string | null;
  /** Green confirmation text, e.g. "Saved." */
  notice: string | null;

  openDialog: () => void;
  closeDialog: () => void;
  load: () => Promise<void>;
  clear: () => void;

  saveName: (name: string) => Promise<void>;
  uploadPicture: (file: File) => Promise<void>;
  removePicture: () => Promise<void>;
  changeEmail: (email: string) => Promise<void>;
  changePassword: (password: string) => Promise<void>;
};

/** Supabase's wording is for developers — translate it for visitors. */
function message(e: unknown, fallback: string) {
  return e instanceof Error && e.message ? friendly(e.message) : fallback;
}

export const useProfile = create<ProfileState>((set) => ({
  profile: null,
  dialogOpen: false,
  busy: false,
  error: null,
  notice: null,

  openDialog: () => set({ dialogOpen: true, error: null, notice: null }),
  closeDialog: () => set({ dialogOpen: false, error: null, notice: null }),

  load: async () => {
    const profile = await api.getProfile();
    set({ profile });
  },

  clear: () => set({ profile: null, dialogOpen: false }),

  saveName: async (name) => {
    set({ busy: true, error: null, notice: null });
    try {
      await api.saveDisplayName(name);
      set((s) => ({
        profile: s.profile ? { ...s.profile, displayName: name.trim() } : null,
        busy: false,
        notice: "Name saved.",
      }));
    } catch (e) {
      set({ busy: false, error: message(e, "Could not save your name.") });
    }
  },

  uploadPicture: async (file) => {
    set({ busy: true, error: null, notice: null });
    try {
      const url = await api.uploadAvatar(file);
      set((s) => ({
        profile: s.profile ? { ...s.profile, avatarUrl: url } : null,
        busy: false,
        notice: "Picture updated.",
      }));
    } catch (e) {
      set({ busy: false, error: message(e, "Could not upload the picture.") });
    }
  },

  removePicture: async () => {
    set({ busy: true, error: null, notice: null });
    try {
      await api.removeAvatar();
      set((s) => ({
        profile: s.profile ? { ...s.profile, avatarUrl: null } : null,
        busy: false,
        notice: "Picture removed.",
      }));
    } catch (e) {
      set({ busy: false, error: message(e, "Could not remove the picture.") });
    }
  },

  changeEmail: async (email) => {
    set({ busy: true, error: null, notice: null });
    try {
      await api.updateEmail(email);
      set({
        busy: false,
        notice: `Confirmation sent to ${email.trim()}. Your email changes once you click the link.`,
      });
    } catch (e) {
      set({ busy: false, error: message(e, "Could not change your email.") });
    }
  },

  changePassword: async (password) => {
    set({ busy: true, error: null, notice: null });
    try {
      await api.updatePassword(password);
      set({ busy: false, notice: "Password updated." });
    } catch (e) {
      set({ busy: false, error: message(e, "Could not change your password.") });
    }
  },
}));

/** Name to show in the sidebar: chosen name, else the email, else nothing. */
export function displayNameFor(
  profile: Profile | null,
  email: string | null | undefined,
): string {
  if (profile?.displayName) return profile.displayName;
  if (email) return email.split("@")[0];
  return "Account";
}
