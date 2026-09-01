"use client";

import { useId, useRef, useState, type KeyboardEvent, type ReactNode } from "react";
import { createPlace } from "@/lib/actions/places";
import { Button } from "@/components/ui/Button";
import { Field } from "@/components/ui/Field";
import { Panel } from "@/components/ui/Panel";
import { pillClasses } from "@/components/ui/pillStyles";
import { PlaceAutocompleteInput, type PlaceSelection } from "@/components/places/PlaceAutocompleteInput";
import { PlaceRecommendationSearch } from "@/components/places/PlaceRecommendationSearch";
import { StarRating } from "@/components/places/StarRating";
import { PLACE_CATEGORIES, type PlacePhotoRef } from "@/types/place";
import { fetchPlacePhotos } from "@/lib/google/fetchPlacePhotos";
import { formatCount } from "@/lib/format";
import { PLACE_NOTES_MAX_LENGTH } from "@/lib/constraints";

const MODES = [
  { id: "search", label: "Search by name" },
  { id: "recommend", label: "Get ideas" },
] as const;

type Mode = (typeof MODES)[number]["id"];

const MODE_ORDER: Mode[] = MODES.map((m) => m.id);

/**
 * One numbered stage of the add-a-stop flow. The numeral sits inline above the
 * content on phones and moves out into a left gutter from `sm:` up, so the
 * reading order is identical at both widths and only the offset changes.
 *
 * There are two of these now, not three. "Check what's coming with it" used to
 * be step 2 and is not a decision at all — it is the *result* of step 1, so it
 * renders inline under the picker once something is selected rather than
 * occupying a numbered stage whose entire content, most of the time, was the
 * sentence "Nothing picked yet" (redesign spec §5.2).
 */
function Step({
  number,
  title,
  hint,
  children,
}: {
  number: number;
  title: string;
  hint?: string;
  children: ReactNode;
}) {
  return (
    <li className="relative sm:pl-12">
      <div className="mb-3 flex items-start gap-2.5">
        <span
          aria-hidden
          className="flex h-7 w-7 shrink-0 items-center justify-center rounded-full bg-accent-tint text-micro font-bold text-accent-on-tint sm:absolute sm:left-0 sm:top-0"
        >
          {number}
        </span>
        <div className="min-w-0">
          <h3 className="text-body font-semibold text-primary">{title}</h3>
          {hint && <p className="mt-0.5 text-label text-muted">{hint}</p>}
        </div>
      </div>
      <div className="min-w-0">{children}</div>
    </li>
  );
}

export function AddPlaceForm({
  itineraryId,
  suggestedTerms,
  onAdded,
}: {
  itineraryId: string;
  /** Passed straight through to the recommendation search's chips. */
  suggestedTerms: string[];
  /**
   * Called after a successful insert. AddStopSheet uses it to close the sheet
   * — without it the sheet would sit over the stop that was just added.
   */
  onAdded?: () => void;
}) {
  const [mode, setMode] = useState<Mode>("search");
  const [nameValue, setNameValue] = useState("");
  const [selection, setSelection] = useState<PlaceSelection | null>(null);
  const [photos, setPhotos] = useState<PlacePhotoRef[]>([]);
  const [photosLoading, setPhotosLoading] = useState(false);
  const [photosError, setPhotosError] = useState<string | null>(null);
  const baseId = useId();
  const tabRefs = useRef<Partial<Record<Mode, HTMLButtonElement | null>>>({});
  const formRef = useRef<HTMLFormElement>(null);

  async function handleSelect(place: PlaceSelection) {
    setSelection(place);
    setNameValue(place.name);
    setPhotosError(null);

    // A recommendation pick already carries photos from its searchByText()
    // call — reusing them skips a redundant fetchPlacePhotos round-trip.
    // An Autocomplete pick never has them (that widget doesn't return
    // photos), so it still needs the fetch below.
    if (place.photos) {
      setPhotos(place.photos);
      return;
    }
    setPhotos([]);
    if (!place.googlePlaceId) return;

    // Fetched once here, at add-time, and stored — never refetched on
    // render. See lib/google/fetchPlacePhotos.ts and CLAUDE.md.
    setPhotosLoading(true);
    try {
      const fetched = await fetchPlacePhotos(place.googlePlaceId);
      setPhotos(fetched);
    } catch (err) {
      console.error("Failed to fetch place photos", err);
      const detail = err instanceof Error ? err.message : String(err);
      setPhotosError(`Couldn't load photos: ${detail}`);
    } finally {
      setPhotosLoading(false);
    }
  }

  function handleManualEdit(value: string) {
    setSelection(null);
    setNameValue(value);
    setPhotos([]);
    setPhotosError(null);
  }

  /**
   * Wraps the Server Action rather than replacing it — `createPlace` receives
   * exactly the FormData it always did and its signature is untouched (§10).
   * The work afterwards exists because this form now lives inside a
   * `keepMounted` Sheet: the DOM is never torn down, so nothing clears itself,
   * and reopening the sheet would otherwise show the stop you just added still
   * sitting in the picker. `formRef.reset()` covers the uncontrolled half (the
   * Autocomplete input, the select, the textarea); the setState calls cover
   * the controlled half.
   */
  async function handleSubmit(formData: FormData) {
    await createPlace(formData);
    setSelection(null);
    setNameValue("");
    setPhotos([]);
    setPhotosError(null);
    setMode("search");
    formRef.current?.reset();
    onAdded?.();
  }

  // Automatic activation (the panel follows focus), which is the WAI-ARIA
  // recommendation when switching panels is cheap — both panels here are
  // already mounted, so an arrow key costs nothing but a `hidden` flip.
  function handleTabKeyDown(e: KeyboardEvent<HTMLButtonElement>) {
    const current = MODE_ORDER.indexOf(mode);
    let next: Mode | undefined;
    if (e.key === "ArrowRight") next = MODE_ORDER[(current + 1) % MODE_ORDER.length];
    else if (e.key === "ArrowLeft")
      next = MODE_ORDER[(current - 1 + MODE_ORDER.length) % MODE_ORDER.length];
    else if (e.key === "Home") next = MODE_ORDER[0];
    else if (e.key === "End") next = MODE_ORDER[MODE_ORDER.length - 1];
    if (!next) return;
    e.preventDefault();
    setMode(next);
    tabRefs.current[next]?.focus();
  }

  const hasName = nameValue.trim().length > 0;
  // One line naming every photographer once, rather than one bar per
  // thumbnail. Google's attribution requirement covers this preview too, not
  // just the saved card.
  const photoCredits = Array.from(new Set(photos.map((p) => p.attributionText)));

  return (
    <form ref={formRef} action={handleSubmit} className="flex flex-col gap-6">
      <input type="hidden" name="itineraryId" value={itineraryId} />
      <input type="hidden" name="name" value={nameValue} />
      <input type="hidden" name="address" value={selection?.address ?? ""} />
      <input type="hidden" name="latitude" value={selection?.latitude ?? ""} />
      <input type="hidden" name="longitude" value={selection?.longitude ?? ""} />
      <input type="hidden" name="googlePlaceId" value={selection?.googlePlaceId ?? ""} />
      <input type="hidden" name="rating" value={selection?.rating ?? ""} />
      <input type="hidden" name="ratingCount" value={selection?.ratingCount ?? ""} />
      <input type="hidden" name="photoRefs" value={JSON.stringify(photos)} />

      <ol className="flex flex-col gap-7">
        <Step
          number={1}
          title="Find the place"
          hint="Look it up by name, or describe what you're in the mood for."
        >
          <div className="flex flex-col gap-4">
            {/* A real tablist, not two buttons swapping button classes: the
                previous pair announced as "button, Search by name" with
                nothing conveying that they were alternatives or which one was
                active. Deliberately untouched by the Nocturne pass and named
                in its §5.2 table so nobody "fixes" it — the double-mount below
                is what keeps the Google Autocomplete widget alive across a tab
                switch, and it was never the density problem. */}
            <div
              role="tablist"
              aria-label="How to find a place"
              className="surface-sunken flex w-full max-w-sm gap-1 p-1"
            >
              {MODES.map((m) => {
                const selected = mode === m.id;
                return (
                  <button
                    key={m.id}
                    ref={(el) => {
                      tabRefs.current[m.id] = el;
                    }}
                    type="button"
                    role="tab"
                    id={`${baseId}-tab-${m.id}`}
                    aria-selected={selected}
                    aria-controls={`${baseId}-panel-${m.id}`}
                    tabIndex={selected ? 0 : -1}
                    onClick={() => setMode(m.id)}
                    onKeyDown={handleTabKeyDown}
                    // pillClasses carries the half both pills share: a 36px
                    // box with a 44px `.touch-target` hit area, the focus
                    // ring, and the accent-fill active state. flex-1 and the
                    // padding stay here, because ToggleGroup's pills size to
                    // their own content and these two split a strip.
                    className={`${pillClasses(selected)} flex-1 px-3`}
                  >
                    {m.label}
                  </button>
                );
              })}
            </div>

            {/* Both panels stay mounted and the inactive one is `hidden`, so
                switching tabs keeps whatever you already typed and doesn't
                tear down and re-create the Google Autocomplete widget. */}
            <div
              role="tabpanel"
              id={`${baseId}-panel-search`}
              aria-labelledby={`${baseId}-tab-search`}
              hidden={mode !== "search"}
            >
              <PlaceAutocompleteInput onSelect={handleSelect} onManualEdit={handleManualEdit} />
            </div>
            <div
              role="tabpanel"
              id={`${baseId}-panel-recommend`}
              aria-labelledby={`${baseId}-tab-recommend`}
              hidden={mode !== "recommend"}
            >
              <PlaceRecommendationSearch
                onSelect={handleSelect}
                suggestedTerms={suggestedTerms}
              />
            </div>

            {/* The former step 2, demoted to what it always was: a readout.
                It appears only once there is something to read, and carries
                the single aria-live region that used to wrap just the photo
                lifecycle — the whole block now arrives unprompted, not only
                the thumbnails. */}
            {hasName && (
              <Panel aria-live="polite">
                <div className="flex flex-col gap-3">
                  <div className="min-w-0">
                    <p className="line-clamp-2 break-words font-display text-title text-primary">
                      {nameValue}
                    </p>
                    {selection?.address && (
                      <p
                        className="mt-1 truncate text-label text-secondary"
                        title={selection.address}
                      >
                        {selection.address}
                      </p>
                    )}
                  </div>

                  {selection?.rating != null && (
                    <div className="flex flex-wrap items-center gap-x-2 gap-y-1">
                      <StarRating
                        rating={selection.rating}
                        ratingCount={selection.ratingCount}
                        size="lg"
                      />
                      <span aria-hidden className="text-body font-semibold text-primary">
                        {selection.rating.toFixed(1)}
                      </span>
                      {selection.ratingCount != null && (
                        <span aria-hidden className="text-label text-muted">
                          {formatCount(selection.ratingCount)} Google reviews
                        </span>
                      )}
                    </div>
                  )}

                  {photosLoading && (
                    <div className="flex gap-2">
                      <span className="sr-only">Fetching photos…</span>
                      {[0, 1, 2].map((i) => (
                        <div key={i} className="skeleton h-14 w-14" aria-hidden />
                      ))}
                    </div>
                  )}

                  {photosError && (
                    <p className="text-label font-semibold text-critical">{photosError}</p>
                  )}

                  {!photosLoading && photos.length > 0 && (
                    <>
                      <ul className="flex flex-wrap gap-2">
                        {photos.map((photo) => (
                          <li key={photo.url}>
                            {/* eslint-disable-next-line @next/next/no-img-element */}
                            <img
                              src={photo.url}
                              alt=""
                              loading="lazy"
                              decoding="async"
                              className="h-14 w-14 rounded-lg object-cover"
                            />
                          </li>
                        ))}
                      </ul>
                      <p className="mt-1.5 text-micro text-muted">
                        Photos: {photoCredits.join(", ")}
                      </p>
                    </>
                  )}

                  {!selection && (
                    <p className="text-label text-muted">
                      Typed by hand, so no address, rating or photos come with it — that&apos;s
                      fine, it still saves.
                    </p>
                  )}
                </div>
              </Panel>
            )}
          </div>
        </Step>

        <Step
          number={2}
          title="Add your own bit"
          hint="Category is required; the note is for the rest of the group."
        >
          <div className="flex flex-col gap-4">
            <Field
              as="select"
              id={`${baseId}-category`}
              label="Category"
              name="category"
              required
              defaultValue=""
              hint="Also decides what the Details write-up looks for — dishes, exhibits or things to do."
              // .input-field carries no min-height, and a <select> resolves
              // line-height: normal where an <input> resolves the text-body
              // 24px — so the identical class measured 43px here, 44 on an
              // input. Same shortfall WP-07 found and fixed the same way in
              // InvitesSection's expiry select; the shared cause is
              // .input-field itself, which this file does not own.
              controlClassName="min-h-11"
            >
              <option value="" disabled>
                Choose one…
              </option>
              {PLACE_CATEGORIES.map((c) => (
                <option key={c.value} value={c.value}>
                  {c.label}
                </option>
              ))}
            </Field>

            <Field
              as="textarea"
              id={`${baseId}-notes`}
              label="Notes"
              name="userNotes"
              rows={3}
              maxLength={PLACE_NOTES_MAX_LENGTH}
              placeholder="Who suggested it, what to book, when it's quiet…"
              hint="Optional. Everyone in the group can read and edit this."
              controlClassName="resize-y"
            />
          </div>
        </Step>
      </ol>

      <div className="flex flex-wrap items-center gap-x-3 gap-y-2 border-t border-subtle pt-5">
        <Button type="submit" pendingText="Adding…" disabled={!hasName}>
          Add stop
        </Button>
        {!hasName && (
          <p className="text-label text-muted">Pick or type a place name first.</p>
        )}
      </div>
    </form>
  );
}
