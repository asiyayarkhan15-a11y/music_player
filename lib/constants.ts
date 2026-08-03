/**
 * Password rules, in one place.
 *
 * ⚠️ These MUST match Supabase → Authentication → Sign In / Providers →
 * Email:
 *
 *   Minimum password length  = 10
 *   Password requirements    = "Lowercase, uppercase letters, digits and symbols"
 *
 * If the two disagree, the form accepts a password and Supabase then
 * rejects it — which reads to the user as a broken website.
 *
 * Checking here as well as on the server is not duplication for its own
 * sake: it lets us show the rules as a live checklist while someone types,
 * instead of failing them after they press the button.
 */
export const MIN_PASSWORD_LENGTH = 10;

export type PasswordRule = { label: string; ok: boolean };

export function checkPassword(password: string): PasswordRule[] {
  return [
    {
      label: `At least ${MIN_PASSWORD_LENGTH} characters`,
      ok: password.length >= MIN_PASSWORD_LENGTH,
    },
    { label: "A lowercase letter (a–z)", ok: /[a-z]/.test(password) },
    { label: "An uppercase letter (A–Z)", ok: /[A-Z]/.test(password) },
    { label: "A number (0–9)", ok: /[0-9]/.test(password) },
    { label: "A symbol (! @ # $ …)", ok: /[^A-Za-z0-9]/.test(password) },
  ];
}

export function isPasswordValid(password: string): boolean {
  return checkPassword(password).every((rule) => rule.ok);
}
