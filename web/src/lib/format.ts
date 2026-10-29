export const DEFAULT_BRAND = '#053065';

export function formatDate(d: Date | string): string {
  const date = typeof d === 'string' ? new Date(d + (d.length === 10 ? 'T00:00:00' : '')) : d;
  const y = date.getFullYear();
  const m = String(date.getMonth() + 1).padStart(2, '0');
  const day = String(date.getDate()).padStart(2, '0');
  return `${y}-${m}-${day}`;
}

/** Returns a safe "#rrggbb" string; anything else falls back to the CyleSoma navy. */
export function safeHexColor(hex: string | null | undefined, fallback = DEFAULT_BRAND): string {
  return hex && /^#[0-9a-fA-F]{6}$/.test(hex) ? hex.toLowerCase() : fallback;
}
