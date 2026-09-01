"use client";

import { useId, useRef, useState, type KeyboardEvent } from "react";
import { loadPlacesLibrary } from "@/lib/google/loadGoogleMaps";
import { PlacePhotoFallback } from "@/components/places/PlacePhotoFallback";
import { StarRating } from "@/components/places/StarRating";
import { Badge } from "@/components/ui/Badge";
import { Button } from "@/components/ui/Button";
import { Field } from "@/components/ui/Field";
import { pillClasses } from "@/components/ui/pillStyles";
import { toggleTerm, hasTerm } from "@/lib/searchTerms";
import type { PlaceSelection } from "@/components/places/PlaceAutocompleteInput";
import type { PlacePhotoRef } from "@/types/place";

const PHOTO_MAX_WIDTH = 400;
const PHOTO_MAX_HEIGHT = 300;
const MAX_RESULTS = 8;
// Rapid Enter/click bursts would otherwise fire one billed Google Places
// searchByText() call per keystroke/click — the `loading` state only blocks
// *concurrent* requests, not back-to-back ones once each resolves.
const SEARCH_COOLDOWN_MS = 800;

const PRICE_LEVEL_LABELS: Record<string, string> = {
  FREE: "Free",
  INEXPENSIVE: "$",
  MODERATE: "$$",
  EXPENSIVE: "$$$",
  VERY_EXPENSIVE: "$$$$",
};

interface Recommendation {
  id: string;
  name: string;
  address: string | null;
  latitude: number | null;
  longitude: number | null;
  rating: number | null;
  ratingCount: number | null;
  priceLevel: string | null;
  photos: PlacePhotoRef[];
}

// Real venues only, via Google Places Text Search (New) — no AI ranking here
// on purpose: running the AI details pass per result would hit the per-user
// Anthropic rate limit (lib/ai/rateLimit.ts, 20/hr) after a single search,
// and this app's own AI prompting already commits to never inventing
// specific place facts, which cuts against AI-generated venue suggestions
// anyway. Ratings shown here are real user ratings pulled straight from
// Google.
export function PlaceRecommendationSearch({
  onSelect,
  suggestedTerms,
}: {
  onSelect: (place: PlaceSelection) => void;
  /**
   * The group's saved preferences (types/member.ts `preferenceSearchTerms`),
   * offered as chips. Deliberately **opt-in**: appending a whole group's tastes
   * to the query by default makes results worse, because Google Text Search
   * matches these words literally rather than understanding them. Nothing here
   * changes the query until someone taps it.
   */
  suggestedTerms: string[];
}) {
  const [location, setLocation] = useState("");
  const [lookingFor, setLookingFor] = useState("");
  const [results, setResults] = useState<Recommendation[] | null>(null);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const lastRequestRef = useRef(0);
  const baseId = useId();

  const canSearch = location.trim().length > 0 && lookingFor.trim().length > 0;

  async function handleSearch() {
    if (!location.trim() || !lookingFor.trim()) return;
    if (Date.now() - lastRequestRef.current < SEARCH_COOLDOWN_MS) return;
    lastRequestRef.current = Date.now();

    setLoading(true);
    setError(null);
    setResults(null);
    try {
      const places = await loadPlacesLibrary();
      const { places: found } = await places.Place.searchByText({
        textQuery: `${lookingFor} in ${location}`,
        fields: [
          "id",
          "displayName",
          "formattedAddress",
          "location",
          "rating",
          "userRatingCount",
          "priceLevel",
          "photos",
        ],
        maxResultCount: MAX_RESULTS,
      });

      setResults(
        found.map((p) => ({
          id: p.id,
          name: p.displayName ?? "Unnamed place",
          address: p.formattedAddress ?? null,
          latitude: p.location?.lat() ?? null,
          longitude: p.location?.lng() ?? null,
          rating: p.rating ?? null,
          ratingCount: p.userRatingCount ?? null,
          priceLevel: p.priceLevel ?? null,
          photos: (p.photos ?? []).slice(0, 3).map((photo) => {
            const author = photo.authorAttributions?.[0];
            return {
              url: photo.getURI({ maxWidth: PHOTO_MAX_WIDTH, maxHeight: PHOTO_MAX_HEIGHT }),
              attributionText: author?.displayName ?? "Google",
              attributionUri: author?.uri ?? null,
            };
          }),
        }))
      );
    } catch (err) {
      console.error("Recommendation search failed", err);
      const detail = err instanceof Error ? err.message : String(err);
      setError(`Search failed: ${detail}`);
    } finally {
      setLoading(false);
    }
  }

  function handleKeyDown(e: KeyboardEvent<HTMLInputElement>) {
    if (e.key === "Enter") {
      e.preventDefault();
      handleSearch();
    }
  }

  function handlePick(rec: Recommendation) {
    onSelect({
      name: rec.name,
      address: rec.address,
      latitude: rec.latitude,
      longitude: rec.longitude,
      googlePlaceId: rec.id,
      rating: rec.rating,
      ratingCount: rec.ratingCount,
      photos: rec.photos,
    });
    setResults(null);
  }

  return (
    <div className="flex flex-col gap-4">
      {/* Deliberately a <div>, not a <form> — this renders inside
          AddPlaceForm's own <form action={createPlace}>, and nested <form>
          elements are invalid HTML: the browser drops the inner <form> tag
          during parsing and merges its submit button into the OUTER form,
          so clicking "Search" would actually submit createPlace with no
          place selected yet instead of running this search. */}
      <div className="grid gap-3 sm:grid-cols-2">
        <Field
          id={`${baseId}-location`}
          label="Where"
          value={location}
          onChange={(e) => setLocation(e.target.value)}
          onKeyDown={handleKeyDown}
          placeholder="Brooklyn, NY"
        />
        <Field
          id={`${baseId}-looking-for`}
          label="What you're after"
          value={lookingFor}
          onChange={(e) => setLookingFor(e.target.value)}
          onKeyDown={handleKeyDown}
          placeholder="Romantic italian dinner"
        />
      </div>

      {suggestedTerms.length > 0 && (
        <div className="flex flex-col gap-2">
          <p id={`${baseId}-suggestions`} className="text-label text-muted">
            From the group&apos;s preferences — tap to add:
          </p>
          <div
            className="flex flex-wrap gap-2"
            role="group"
            aria-labelledby={`${baseId}-suggestions`}
          >
            {suggestedTerms.map((term) => {
              const active = hasTerm(lookingFor, term);
              return (
                <button
                  key={term}
                  type="button"
                  aria-pressed={active}
                  onClick={() => setLookingFor((text) => toggleTerm(text, term))}
                  className={[
                    "inline-flex items-center px-3.5",
                    pillClasses(active),
                    active ? "border border-transparent" : "border border-strong bg-surface",
                  ].join(" ")}
                >
                  {term}
                </button>
              );
            })}
          </div>
        </div>
      )}

      <div className="flex flex-wrap items-center gap-3">
        <Button
          variant="secondary"
          size="sm"
          onClick={handleSearch}
          disabled={loading || !canSearch}
        >
          {loading ? "Searching…" : "Search Google"}
        </Button>
        {!canSearch && !loading && (
          <p className="text-label text-muted">Fill both boxes to search.</p>
        )}
      </div>

      {/* aria-live so a result count, an empty result, or a failure is
          announced — this list replaces itself in place with no navigation,
          which a screen reader has no other way to notice. */}
      <div aria-live="polite" className="min-w-0">
        {error && <p className="text-label font-semibold text-critical">{error}</p>}

        {results && results.length === 0 && (
          <p className="text-label text-muted">
            No matches — try a different location or description.
          </p>
        )}

        {results && results.length > 0 && (
          <ul className="flex flex-col gap-2">
            {results.map((rec) => {
              const priceLabel = rec.priceLevel
                ? PRICE_LEVEL_LABELS[rec.priceLevel] ?? rec.priceLevel
                : null;
              const cover = rec.photos[0];
              return (
                // surface-sunken, not a bordered box: this list already sits
                // inside the "Add a stop" card, and a framed row inside a
                // framed card is the nested-card anti-pattern (§2.5 no. 5).
                <li
                  key={rec.id}
                  className="surface-sunken flex flex-wrap items-center gap-x-3 gap-y-2.5 p-3"
                >
                  <div className="h-16 w-16 shrink-0 overflow-hidden rounded-lg">
                    {cover ? (
                      // eslint-disable-next-line @next/next/no-img-element
                      <img
                        src={cover.url}
                        alt=""
                        loading="lazy"
                        decoding="async"
                        className="h-full w-full object-cover"
                      />
                    ) : (
                      <PlacePhotoFallback
                        category="other"
                        compact
                        className="h-full w-full"
                      />
                    )}
                  </div>

                  {/* basis-40 is what makes this row work at 360px: the text
                      column claims 160px before the button is allowed any
                      width, so the button wraps to its own line instead of
                      squeezing the name down to a couple of characters. */}
                  <div className="min-w-0 flex-1 basis-40">
                    <p className="line-clamp-2 text-body font-semibold text-primary">
                      {rec.name}
                    </p>
                    {rec.address && (
                      <p className="truncate text-label text-muted" title={rec.address}>
                        {rec.address}
                      </p>
                    )}
                    {(rec.rating != null || priceLabel) && (
                      <div className="mt-1 flex flex-wrap items-center gap-x-2 gap-y-1">
                        {rec.rating != null && (
                          <span className="flex items-center gap-1.5">
                            <StarRating rating={rec.rating} ratingCount={rec.ratingCount} />
                            <span aria-hidden className="text-label text-secondary">
                              {rec.rating.toFixed(1)}
                            </span>
                          </span>
                        )}
                        {priceLabel && <Badge>{priceLabel}</Badge>}
                      </div>
                    )}
                    {cover && (
                      // Google's attribution policy applies wherever a Places
                      // photo is shown, results list included — not only on
                      // the saved card.
                      <p className="mt-1 truncate text-micro text-muted">
                        Photo: {cover.attributionText}
                      </p>
                    )}
                  </div>

                  <Button
                    variant="secondary"
                    size="sm"
                    onClick={() => handlePick(rec)}
                    className="ml-auto"
                  >
                    Use this
                  </Button>
                </li>
              );
            })}
          </ul>
        )}
      </div>
    </div>
  );
}
