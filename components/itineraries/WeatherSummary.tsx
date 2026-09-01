import { isValidWeatherSnapshot } from "@/types/weather";
import { refreshItineraryWeather } from "@/lib/actions/itineraries";
import { Badge } from "@/components/ui/Badge";
import { Button } from "@/components/ui/Button";

// Purely presentational + one refresh form — no client state needed. Real
// weather only, sourced from lib/weather/ (Open-Meteo), never the LLM.
// Staleness is detected by comparing the cached snapshot's forDate/
// forLocation against the itinerary's *current* planned_date/location,
// rather than a separate tracking column.
export function WeatherSummary({
  itineraryId,
  weather,
  plannedDate,
  location,
}: {
  itineraryId: string;
  weather: unknown;
  plannedDate: string | null;
  location: string | null;
}) {
  if (!plannedDate || !location) return null;

  const snapshot = isValidWeatherSnapshot(weather) ? weather : null;
  const isStale = !snapshot || snapshot.forDate !== plannedDate || snapshot.forLocation !== location;

  return (
    <div className="mt-2 flex flex-wrap items-center gap-x-3 gap-y-2">
      {snapshot ? (
        // The qualifiers were text-xs asides in the same muted grey as the
        // summary itself, which made "may be outdated" read as part of the
        // forecast. They're badges now — the one thing here that changes
        // what you should believe.
        <span
          className={`min-w-0 text-body ${isStale ? "text-muted" : "text-secondary"}`}
        >
          {snapshot.summary}
        </span>
      ) : (
        <span className="text-body text-muted">No weather checked yet</span>
      )}

      {snapshot?.isEstimate && <Badge>Estimate</Badge>}
      {snapshot && isStale && <Badge tone="critical">May be outdated</Badge>}

      {isStale && (
        <form action={refreshItineraryWeather}>
          <input type="hidden" name="itineraryId" value={itineraryId} />
          <Button type="submit" variant="ghost" size="sm" pendingText="Checking…">
            {snapshot ? "Refresh" : "Check weather"}
          </Button>
        </form>
      )}
    </div>
  );
}
