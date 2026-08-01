"use client";

import { SearchIcon, SpinnerIcon } from "@/components/icons";

type Props = {
  value: string;
  onChange: (value: string) => void;
  loading?: boolean;
};

export default function SearchBar({ value, onChange, loading }: Props) {
  return (
    <div className="relative">
      <span className="pointer-events-none absolute left-3 top-1/2 -translate-y-1/2 text-muted">
        <SearchIcon className="size-4" />
      </span>

      <input
        type="search"
        value={value}
        onChange={(e) => onChange(e.target.value)}
        placeholder="Search songs, artists, moods…"
        aria-label="Search music"
        className="w-full rounded-full border border-line bg-surface py-2.5 pl-10 pr-10 text-sm outline-none transition placeholder:text-muted focus:border-accent focus:ring-2 focus:ring-accent/25"
      />

      {loading && (
        <span className="absolute right-3 top-1/2 -translate-y-1/2 text-muted">
          <SpinnerIcon className="size-4" />
        </span>
      )}
    </div>
  );
}
