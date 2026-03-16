/**
 * Formats an ISO string (UTC) to a local datetime-local string (YYYY-MM-DDTHH:mm)
 * using Wall Clock parity. This ensures that the exact time entered is what is displayed,
 * regardless of the viewer's local timezone.
 */
export function toLocalDatetimeString(iso: string | null | undefined): string {
  if (!iso) return '';
  // We slice the ISO string to get the "Wall Clock" parts, ignoring any 'Z' or offset.
  // Example: "2026-03-15T08:30:00.000Z" -> "2026-03-15T08:30"
  try {
    return iso.slice(0, 16);
  } catch (e) {
    return '';
  }
}

/**
 * Converts a local datetime-local string (YYYY-MM-DDTHH:mm) to an ISO string (UTC)
 * using Wall Clock parity. It simply appends the UTC suffix without shifting the time.
 */
export function fromLocalDatetimeStringToIso(local: string | null | undefined): string {
  if (!local) return '';
  // We treat the "local" wall clock as UTC to ensure it's saved as-is.
  // Example: "2026-03-15T08:30" -> "2026-03-15T08:30:00.000Z"
  return `${local}:00.000Z`;
}

/**
 * Formats a YYYY-MM-DD string from an ISO string using Wall Clock parity.
 */
export function toLocalDateString(iso: string | null | undefined): string {
  if (!iso) return '';
  // Example: "2026-03-15T08:30:00.000Z" -> "2026-03-15"
  return iso.slice(0, 10);
}
