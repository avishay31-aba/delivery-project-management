/** Minimal className merge helper (no external dep for Phase A). */
export function cn(...classes: (string | false | null | undefined)[]): string {
  return classes.filter(Boolean).join(' ')
}
