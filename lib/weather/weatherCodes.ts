// Open-Meteo returns WMO weather-interpretation codes (WMO code table
// 4677/4678) for its "weather_code" daily variable — a small, stable,
// widely-documented set. Mapped here to short human labels; never generated
// by the LLM (see CLAUDE.md's "Do NOT use Claude/the LLM to generate or
// guess weather data" direction for this feature).
export const WEATHER_CODE_LABELS: Record<number, string> = {
  0: "Clear",
  1: "Mostly clear",
  2: "Partly cloudy",
  3: "Overcast",
  45: "Foggy",
  48: "Foggy",
  51: "Light drizzle",
  53: "Drizzle",
  55: "Heavy drizzle",
  56: "Freezing drizzle",
  57: "Freezing drizzle",
  61: "Light rain",
  63: "Rain",
  65: "Heavy rain",
  66: "Freezing rain",
  67: "Freezing rain",
  71: "Light snow",
  73: "Snow",
  75: "Heavy snow",
  77: "Snow grains",
  80: "Rain showers",
  81: "Rain showers",
  82: "Heavy rain showers",
  85: "Snow showers",
  86: "Heavy snow showers",
  95: "Thunderstorm",
  96: "Thunderstorm with hail",
  99: "Thunderstorm with hail",
};

export function weatherCodeLabel(code: number): string {
  return WEATHER_CODE_LABELS[code] ?? "Mixed conditions";
}
