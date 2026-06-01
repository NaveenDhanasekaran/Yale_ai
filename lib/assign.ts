export interface ZoneTech {
  id: string;
  name: string;
  status: string;
}

export interface ZoneRow {
  area: string;
  technician: ZoneTech | null;
}

/**
 * Find the zone whose area appears in the given text (address/area).
 * The longest area match wins, so "Anna Nagar" beats "Nagar".
 */
export function matchZone(text: string | null | undefined, zones: ZoneRow[]): ZoneRow | null {
  if (!text) return null;
  const hay = text.toLowerCase();
  let best: ZoneRow | null = null;
  for (const z of zones) {
    if (z.area && hay.includes(z.area.toLowerCase())) {
      if (!best || z.area.length > best.area.length) best = z;
    }
  }
  return best;
}
