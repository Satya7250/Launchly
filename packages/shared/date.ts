export function formatISO(date: Date | string | number): string {
  const d = new Date(date);
  return d.toISOString();
}

/**
 * Formats a date in a deterministic, UTC based, human‑readable way.
 * Uses Intl.DateTimeFormat with explicit locale and UTC time zone.
 * Options can be provided to customize the output while keeping UTC.
 */
export function formatHumanUTC(date: Date | string | number, options?: Intl.DateTimeFormatOptions): string {
  const d = new Date(date);
  if (isNaN(d.getTime())) return String(date);
  const defaultOptions: Intl.DateTimeFormatOptions = {
    year: "numeric",
    month: "short",
    day: "numeric",
    timeZone: "UTC",
    ...options,
  };
  return new Intl.DateTimeFormat("en-US", defaultOptions).format(d);
}
