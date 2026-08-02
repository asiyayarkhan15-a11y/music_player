/**
 * Small inline SVG icons.
 *
 * Written by hand instead of installing an icon library: a music player
 * needs about ten icons, and this keeps the bundle small with no extra
 * dependency to keep updated.
 */

type IconProps = { className?: string };

const base = "currentColor";

export const PlayIcon = ({ className = "size-5" }: IconProps) => (
  <svg viewBox="0 0 24 24" fill={base} className={className} aria-hidden="true">
    <path d="M8 5.14v13.72a1 1 0 0 0 1.54.84l10.3-6.86a1 1 0 0 0 0-1.68L9.54 4.3A1 1 0 0 0 8 5.14Z" />
  </svg>
);

export const PauseIcon = ({ className = "size-5" }: IconProps) => (
  <svg viewBox="0 0 24 24" fill={base} className={className} aria-hidden="true">
    <path d="M7 4h3.5v16H7zM13.5 4H17v16h-3.5z" />
  </svg>
);

export const PrevIcon = ({ className = "size-5" }: IconProps) => (
  <svg viewBox="0 0 24 24" fill={base} className={className} aria-hidden="true">
    <path d="M7 5a1 1 0 0 1 2 0v5.6l8.4-5.44A1 1 0 0 1 19 6v12a1 1 0 0 1-1.6.84L9 13.4V19a1 1 0 1 1-2 0Z" />
  </svg>
);

export const NextIcon = ({ className = "size-5" }: IconProps) => (
  <svg viewBox="0 0 24 24" fill={base} className={className} aria-hidden="true">
    <path d="M17 5a1 1 0 0 0-2 0v5.6L6.6 5.16A1 1 0 0 0 5 6v12a1 1 0 0 0 1.6.84L15 13.4V19a1 1 0 1 0 2 0Z" />
  </svg>
);

export const ShuffleIcon = ({ className = "size-4" }: IconProps) => (
  <svg
    viewBox="0 0 24 24"
    fill="none"
    stroke={base}
    strokeWidth="2"
    strokeLinecap="round"
    strokeLinejoin="round"
    className={className}
    aria-hidden="true"
  >
    <path d="M16 3h5v5" />
    <path d="M4 20 21 3" />
    <path d="M21 16v5h-5" />
    <path d="m15 15 6 6" />
    <path d="M4 4l5 5" />
  </svg>
);

export const RepeatIcon = ({ className = "size-4" }: IconProps) => (
  <svg
    viewBox="0 0 24 24"
    fill="none"
    stroke={base}
    strokeWidth="2"
    strokeLinecap="round"
    strokeLinejoin="round"
    className={className}
    aria-hidden="true"
  >
    <path d="m17 2 4 4-4 4" />
    <path d="M3 11v-1a4 4 0 0 1 4-4h14" />
    <path d="m7 22-4-4 4-4" />
    <path d="M21 13v1a4 4 0 0 1-4 4H3" />
  </svg>
);

export const RepeatOneIcon = ({ className = "size-4" }: IconProps) => (
  <svg
    viewBox="0 0 24 24"
    fill="none"
    stroke={base}
    strokeWidth="2"
    strokeLinecap="round"
    strokeLinejoin="round"
    className={className}
    aria-hidden="true"
  >
    <path d="m17 2 4 4-4 4" />
    <path d="M3 11v-1a4 4 0 0 1 4-4h14" />
    <path d="m7 22-4-4 4-4" />
    <path d="M21 13v1a4 4 0 0 1-4 4H3" />
    <path d="M11 10h1v5" />
  </svg>
);

export const VolumeIcon = ({ className = "size-5" }: IconProps) => (
  <svg
    viewBox="0 0 24 24"
    fill="none"
    stroke={base}
    strokeWidth="2"
    strokeLinecap="round"
    strokeLinejoin="round"
    className={className}
    aria-hidden="true"
  >
    <path d="M11 5 6 9H2v6h4l5 4z" />
    <path d="M15.5 8.5a5 5 0 0 1 0 7" />
    <path d="M18.5 5.5a9 9 0 0 1 0 13" />
  </svg>
);

export const MuteIcon = ({ className = "size-5" }: IconProps) => (
  <svg
    viewBox="0 0 24 24"
    fill="none"
    stroke={base}
    strokeWidth="2"
    strokeLinecap="round"
    strokeLinejoin="round"
    className={className}
    aria-hidden="true"
  >
    <path d="M11 5 6 9H2v6h4l5 4z" />
    <path d="m22 9-6 6" />
    <path d="m16 9 6 6" />
  </svg>
);

export const SearchIcon = ({ className = "size-5" }: IconProps) => (
  <svg
    viewBox="0 0 24 24"
    fill="none"
    stroke={base}
    strokeWidth="2"
    strokeLinecap="round"
    strokeLinejoin="round"
    className={className}
    aria-hidden="true"
  >
    <circle cx="11" cy="11" r="7" />
    <path d="m20 20-3.5-3.5" />
  </svg>
);

export const HeartIcon = ({
  className = "size-5",
  filled = false,
}: IconProps & { filled?: boolean }) => (
  <svg
    viewBox="0 0 24 24"
    fill={filled ? base : "none"}
    stroke={base}
    strokeWidth="2"
    strokeLinecap="round"
    strokeLinejoin="round"
    className={className}
    aria-hidden="true"
  >
    <path d="M12 20.5 3.9 12.6a5 5 0 0 1 7.1-7l1 1 1-1a5 5 0 0 1 7.1 7Z" />
  </svg>
);

export const MusicIcon = ({ className = "size-5" }: IconProps) => (
  <svg
    viewBox="0 0 24 24"
    fill="none"
    stroke={base}
    strokeWidth="2"
    strokeLinecap="round"
    strokeLinejoin="round"
    className={className}
    aria-hidden="true"
  >
    <path d="M9 18V5l11-2v13" />
    <circle cx="6" cy="18" r="3" />
    <circle cx="17" cy="16" r="3" />
  </svg>
);

export const TrendingIcon = ({ className = "size-5" }: IconProps) => (
  <svg
    viewBox="0 0 24 24"
    fill="none"
    stroke={base}
    strokeWidth="2"
    strokeLinecap="round"
    strokeLinejoin="round"
    className={className}
    aria-hidden="true"
  >
    <path d="m3 17 6-6 4 4 8-8" />
    <path d="M17 7h4v4" />
  </svg>
);

export const UserIcon = ({ className = "size-5" }: IconProps) => (
  <svg
    viewBox="0 0 24 24"
    fill="none"
    stroke={base}
    strokeWidth="2"
    strokeLinecap="round"
    strokeLinejoin="round"
    className={className}
    aria-hidden="true"
  >
    <circle cx="12" cy="8" r="4" />
    <path d="M4 21c0-4 3.6-6.5 8-6.5s8 2.5 8 6.5" />
  </svg>
);

/** Google's four-colour G. Fixed brand colours, so it ignores currentColor. */
export const GoogleIcon = ({ className = "size-4" }: IconProps) => (
  <svg viewBox="0 0 24 24" className={className} aria-hidden="true">
    <path
      fill="#4285F4"
      d="M23.52 12.27c0-.85-.08-1.67-.22-2.45H12v4.64h6.46a5.52 5.52 0 0 1-2.4 3.62v3.01h3.88c2.27-2.09 3.58-5.17 3.58-8.82Z"
    />
    <path
      fill="#34A853"
      d="M12 24c3.24 0 5.96-1.08 7.94-2.91l-3.88-3.01c-1.08.72-2.45 1.15-4.06 1.15-3.13 0-5.78-2.11-6.72-4.96H1.28v3.11A12 12 0 0 0 12 24Z"
    />
    <path
      fill="#FBBC05"
      d="M5.28 14.27a7.2 7.2 0 0 1 0-4.54V6.62H1.28a12 12 0 0 0 0 10.76l4-3.11Z"
    />
    <path
      fill="#EA4335"
      d="M12 4.75c1.77 0 3.35.61 4.6 1.8l3.44-3.44C17.95 1.19 15.23 0 12 0A12 12 0 0 0 1.28 6.62l4 3.11C6.22 6.87 8.87 4.75 12 4.75Z"
    />
  </svg>
);

export const SpinnerIcon = ({ className = "size-5" }: IconProps) => (
  <svg viewBox="0 0 24 24" className={`${className} animate-spin`} aria-hidden="true">
    <circle
      cx="12"
      cy="12"
      r="9"
      fill="none"
      stroke={base}
      strokeWidth="2.5"
      strokeLinecap="round"
      strokeDasharray="44"
      strokeDashoffset="14"
      opacity="0.9"
    />
  </svg>
);
