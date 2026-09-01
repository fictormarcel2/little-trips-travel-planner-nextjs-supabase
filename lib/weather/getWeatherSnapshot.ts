import "server-only";
import { geocodeLocation } from "@/lib/weather/geocode";
import { weatherCodeLabel } from "@/lib/weather/weatherCodes";
import type { WeatherKind, WeatherSnapshot } from "@/types/weather";

const FORECAST_URL = "https://api.open-meteo.com/v1/forecast";
const ARCHIVE_URL = "https://archive-api.open-meteo.com/v1/archive";
const DAILY_PARAMS = "weather_code,temperature_2m_max,temperature_2m_min";
const FORECAST_HORIZON_DAYS = 16;
const HISTORICAL_AVERAGE_YEARS = 5;

interface DailyResponse {
  daily?: {
    time: string[];
    weather_code: (number | null)[];
    temperature_2m_max: (number | null)[];
    temperature_2m_min: (number | null)[];
  };
}

function toIsoDate(date: Date): string {
  return date.toISOString().slice(0, 10);
}

function parseIsoDate(value: string): Date {
  return new Date(`${value}T00:00:00Z`);
}

function daysBetween(from: Date, to: Date): number {
  const msPerDay = 24 * 60 * 60 * 1000;
  return Math.round((to.getTime() - from.getTime()) / msPerDay);
}

function mostCommon(values: number[]): number {
  const counts = new Map<number, number>();
  for (const v of values) counts.set(v, (counts.get(v) ?? 0) + 1);
  let best = values[0];
  let bestCount = 0;
  for (const [value, count] of counts) {
    if (count > bestCount) {
      best = value;
      bestCount = count;
    }
  }
  return best;
}

async function fetchDaily(baseUrl: string, lat: number, lon: number, startDate: string, endDate: string) {
  const url = new URL(baseUrl);
  url.searchParams.set("latitude", String(lat));
  url.searchParams.set("longitude", String(lon));
  url.searchParams.set("daily", DAILY_PARAMS);
  url.searchParams.set("timezone", "auto");
  url.searchParams.set("start_date", startDate);
  url.searchParams.set("end_date", endDate);

  const res = await fetch(url, { signal: AbortSignal.timeout(8000) });
  if (!res.ok) return null;
  const data = (await res.json()) as DailyResponse;
  return data.daily ?? null;
}

function buildSnapshot(params: {
  tempC: number;
  weatherCode: number;
  kind: WeatherKind;
  location: string;
  plannedDate: string;
  resolvedLocationName: string;
}): WeatherSnapshot {
  const { tempC, weatherCode, kind, location, plannedDate, resolvedLocationName } = params;
  const label = weatherCodeLabel(weatherCode);
  const roundedTemp = Math.round(tempC);
  const isEstimate = kind === "historical_average";

  let summary: string;
  if (kind === "forecast") {
    summary = `Likely ${label.toLowerCase()}, ~${roundedTemp}°C`;
  } else if (kind === "historical_actual") {
    summary = `${label} on this date historically, ~${roundedTemp}°C`;
  } else {
    summary = `Typically ${label.toLowerCase()} this time of year, ~${roundedTemp}°C`;
  }

  return {
    summary,
    tempC: roundedTemp,
    weatherCode,
    kind,
    isEstimate,
    forLocation: location,
    forDate: plannedDate,
    resolvedLocationName,
    fetchedAt: new Date().toISOString(),
  };
}

// Real weather only — never LLM-generated. Geocodes `location`, then picks
// one of three Open-Meteo endpoints depending on how far plannedDate is from
// today: a real forecast (0-16 days out), a real observed reading (past
// dates), or a multi-year historical average clearly labeled as an estimate
// (further than 16 days out — Open-Meteo has no direct "climate normal for
// date X" endpoint, so this averages the archive API's data for the same
// month/day across the last few years). Returns null on any failure
// (unrecognized location, network error, etc.) — a bad location should
// never block saving the itinerary itself.
export async function getWeatherSnapshot(
  location: string,
  plannedDate: string
): Promise<WeatherSnapshot | null> {
  try {
    const geocoded = await geocodeLocation(location);
    if (!geocoded) return null;

    const today = parseIsoDate(toIsoDate(new Date()));
    const target = parseIsoDate(plannedDate);
    const daysOut = daysBetween(today, target);

    if (daysOut < 0) {
      // Past date — real observed weather for that exact day.
      const daily = await fetchDaily(ARCHIVE_URL, geocoded.lat, geocoded.lon, plannedDate, plannedDate);
      const code = daily?.weather_code?.[0];
      const tMax = daily?.temperature_2m_max?.[0];
      const tMin = daily?.temperature_2m_min?.[0];
      if (code == null || tMax == null || tMin == null) return null;
      return buildSnapshot({
        tempC: (tMax + tMin) / 2,
        weatherCode: code,
        kind: "historical_actual",
        location,
        plannedDate,
        resolvedLocationName: geocoded.displayName,
      });
    }

    if (daysOut <= FORECAST_HORIZON_DAYS) {
      // Within Open-Meteo's real forecast window.
      const daily = await fetchDaily(FORECAST_URL, geocoded.lat, geocoded.lon, plannedDate, plannedDate);
      const code = daily?.weather_code?.[0];
      const tMax = daily?.temperature_2m_max?.[0];
      const tMin = daily?.temperature_2m_min?.[0];
      if (code == null || tMax == null || tMin == null) return null;
      return buildSnapshot({
        tempC: (tMax + tMin) / 2,
        weatherCode: code,
        kind: "forecast",
        location,
        plannedDate,
        resolvedLocationName: geocoded.displayName,
      });
    }

    // Further out than the forecast horizon — average the same calendar
    // day across the last few full years of historical data as an estimate.
    const endYear = today.getUTCFullYear() - 1;
    const startYear = endYear - (HISTORICAL_AVERAGE_YEARS - 1);
    const daily = await fetchDaily(
      ARCHIVE_URL,
      geocoded.lat,
      geocoded.lon,
      `${startYear}-01-01`,
      `${endYear}-12-31`
    );
    if (!daily) return null;

    const targetMonthDay = plannedDate.slice(5); // "MM-DD"
    const temps: number[] = [];
    const codes: number[] = [];
    daily.time.forEach((date, i) => {
      if (date.slice(5) !== targetMonthDay) return;
      const code = daily.weather_code[i];
      const tMax = daily.temperature_2m_max[i];
      const tMin = daily.temperature_2m_min[i];
      if (code == null || tMax == null || tMin == null) return;
      temps.push((tMax + tMin) / 2);
      codes.push(code);
    });
    if (temps.length === 0) return null;

    const avgTemp = temps.reduce((sum, t) => sum + t, 0) / temps.length;
    return buildSnapshot({
      tempC: avgTemp,
      weatherCode: mostCommon(codes),
      kind: "historical_average",
      location,
      plannedDate,
      resolvedLocationName: geocoded.displayName,
    });
  } catch {
    return null;
  }
}
