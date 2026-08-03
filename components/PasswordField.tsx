"use client";

import { useState } from "react";
import { checkPassword } from "@/lib/constants";

type Props = {
  value: string;
  onChange: (value: string) => void;
  id?: string;
  placeholder?: string;
  autoComplete?: string;
  /** Show the live rules checklist. Off when simply signing in. */
  showRules?: boolean;
};

/**
 * A password box with a Show/Hide toggle and, when creating a password,
 * a live checklist of the rules.
 *
 * The toggle matters more than it looks. There is no "confirm password"
 * field, so a typo would lock someone out of an account they just made —
 * and with email confirmation switched off there is no email to recover
 * from. Letting people read back what they typed is the fix; asking them
 * to type it twice mostly just gets the same typo twice.
 */
export default function PasswordField({
  value,
  onChange,
  id,
  placeholder = "Password",
  autoComplete = "current-password",
  showRules = false,
}: Props) {
  const [visible, setVisible] = useState(false);
  const rules = checkPassword(value);

  return (
    <div>
      <div className="relative">
        <input
          id={id}
          type={visible ? "text" : "password"}
          value={value}
          onChange={(e) => onChange(e.target.value)}
          placeholder={placeholder}
          autoComplete={autoComplete}
          className="w-full rounded-lg border border-line bg-bg py-2.5 pl-3 pr-16 text-sm outline-none transition placeholder:text-muted focus:border-accent focus:ring-2 focus:ring-accent/25"
        />

        <button
          type="button"
          onClick={() => setVisible((v) => !v)}
          className="absolute right-1 top-1/2 -translate-y-1/2 rounded px-2 py-1 text-xs text-muted transition hover:text-fg"
          // Not a real password field toggle for screen readers, so say so.
          aria-label={visible ? "Hide password" : "Show password"}
        >
          {visible ? "Hide" : "Show"}
        </button>
      </div>

      {showRules && value.length > 0 && (
        <ul className="mt-2 space-y-0.5">
          {rules.map((rule) => (
            <li
              key={rule.label}
              className={`flex items-center gap-1.5 text-[11px] ${
                rule.ok ? "text-accent" : "text-muted"
              }`}
            >
              <span aria-hidden="true">{rule.ok ? "✓" : "○"}</span>
              {rule.label}
            </li>
          ))}
        </ul>
      )}
    </div>
  );
}
