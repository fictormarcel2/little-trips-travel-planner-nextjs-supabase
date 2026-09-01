// Cached weather lookup result, stored on itineraries.weather (jsonb, no DB
// CHECK constraint — shape validated here, same posture as types/ai.ts's
// isValidAiDetails for places.ai_details). Sourced entirely from Open-Meteo
// (see lib/weather/), never from the LLM.

export const WEATHER_KINDS = ["forecast", "historical_actual", "historical_average"] as const;
export type WeatherKind = (typeof WEATHER_KINDS)[number];

export interface WeatherSnapshot {
  summary: string;
  tempC: number;
  weatherCode: number;
  kind: WeatherKind;
  // True only for "historical_average" — the other two kinds are a real
  // forecast or a real observed reading, not an estimate.
  isEstimate: boolean;
  // What this snapshot was fetched for — compared against the itinerary's
  // *current* location/planned_date at render time to detect staleness
  // without a separate tracking column.
  forLocation: string;
  forDate: string;
  resolvedLocationName: string;
  fetchedAt: string;
}

export function isValidWeatherSnapshot(value: unknown): value is WeatherSnapshot {
  if (!value || typeof value !== "object") return false;
  const v = value as Record<string, unknown>;

  const nonEmptyString = (s: unknown) => typeof s === "string" && s.trim().length > 0;

  return (
    nonEmptyString(v.summary) &&
    typeof v.tempC === "number" &&
    Number.isFinite(v.tempC) &&
    typeof v.weatherCode === "number" &&
    Number.isFinite(v.weatherCode) &&
    typeof v.kind === "string" &&
    (WEATHER_KINDS as readonly string[]).includes(v.kind) &&
    typeof v.isEstimate === "boolean" &&
    nonEmptyString(v.forLocation) &&
    nonEmptyString(v.forDate) &&
    nonEmptyString(v.resolvedLocationName) &&
    nonEmptyString(v.fetchedAt)
  );
}
