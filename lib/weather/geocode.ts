import "server-only";

export interface GeocodedLocation {
  lat: number;
  lon: number;
  displayName: string;
}

interface GeocodingResult {
  name: string;
  latitude: number;
  longitude: number;
  admin1?: string;
  country?: string;
}

// Open-Meteo's free geocoding lookup — no API key, no billing. Converts a
// free-typed city/area name (e.g. "Aachen") into coordinates for the
// weather endpoints below. Returns null rather than throwing on a
// not-found/malformed response — a bad location string should never block
// saving an itinerary, just leave it without a weather snapshot.
export async function geocodeLocation(query: string): Promise<GeocodedLocation | null> {
  const trimmed = query.trim();
  if (!trimmed) return null;

  try {
    const url = new URL("https://geocoding-api.open-meteo.com/v1/search");
    url.searchParams.set("name", trimmed);
    url.searchParams.set("count", "1");
    url.searchParams.set("language", "en");
    url.searchParams.set("format", "json");

    const res = await fetch(url, { signal: AbortSignal.timeout(5000) });
    if (!res.ok) return null;

    const data = (await res.json()) as { results?: GeocodingResult[] };
    const result = data.results?.[0];
    if (!result) return null;

    const displayName = [result.name, result.admin1, result.country].filter(Boolean).join(", ");

    return { lat: result.latitude, lon: result.longitude, displayName };
  } catch {
    return null;
  }
}
