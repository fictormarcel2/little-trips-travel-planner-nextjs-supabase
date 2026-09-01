"use client";

import { useState, type ReactNode } from "react";
import { fetchPlaceReviews } from "@/lib/google/fetchPlaceReviews";
import { Badge, type BadgeProps } from "@/components/ui/Badge";
import { Button } from "@/components/ui/Button";
import { SECTION_STAGGER_MS } from "@/lib/motion";
import { isValidAiDetails, type AiDetails } from "@/types/ai";
import { placeRecommendationsHeading, type PlaceRecord } from "@/types/place";

/**
 * A wrapping row of AI-extracted tags.
 *
 * These strings come back from the model, so their length is bounded only by
 * whatever it decided to write — `max-w-full` plus `break-words` is what stops
 * one unusually long tag from pushing the drawer's content wider than the
 * drawer. The tones are the same contrast-verified pairs used everywhere else
 * rather than the raw sage-100/terracotta-100 pairs this used to hand-roll.
 */
function ChipList({
  items,
  tone,
  className = "mt-1",
}: {
  items: string[];
  tone: BadgeProps["tone"];
  className?: string;
}) {
  return (
    <ul className={`flex flex-wrap gap-1.5 ${className}`}>
      {items.map((t) => (
        <li key={t} className="min-w-0 max-w-full">
          <Badge tone={tone} className="max-w-full font-normal">
            <span className="break-words">{t}</span>
          </Badge>
        </li>
      ))}
    </ul>
  );
}

// Collapsible section built on native <details>/<summary> — keyboard support,
// screen-reader semantics, and open/close state all come for free, with no
// component state to manage. "What people say" stays open because it's the
// reason the drawer exists; the rest start closed so the panel opens as a
// scannable outline rather than a wall of prose.
function Section({
  heading,
  delay = 0,
  defaultOpen = false,
  children,
}: {
  heading: string;
  /** Milliseconds to hold before this section enters, for the cascade. */
  delay?: number;
  defaultOpen?: boolean;
  children: ReactNode;
}) {
  return (
    <details
      open={defaultOpen}
      className="animate-rise-in group border-t border-subtle pt-3"
      style={delay > 0 ? { animationDelay: `${delay}ms` } : undefined}
    >
      {/* min-h-11: the whole row is the disclosure control, and at py-0.5 it
          was a ~26px band of a drawer people open on a phone. The focus ring
          moved to --accent with it; ring-terracotta-300 was too light to
          register against this panel. */}
      <summary className="-mx-1 flex min-h-11 cursor-pointer list-none items-center justify-between gap-2 rounded-lg px-1 py-1.5 focus:outline-none focus-visible:ring-2 focus-visible:ring-accent">
        <h3 className="font-display text-body font-semibold text-primary">{heading}</h3>
        <span
          aria-hidden
          className="shrink-0 text-label text-secondary transition-transform duration-fast ease-entrance group-open:rotate-180"
        >
          ▾
        </span>
      </summary>
      <div className="mt-2">{children}</div>
    </details>
  );
}

// Rendered with key={place.id} by PlaceDetailsDrawer, so switching to a
// different place gets a fresh instance (fresh details/loading/error state)
// rather than needing manual state resets.
export function PlaceDetailsContent({ place }: { place: PlaceRecord }) {
  const initial = isValidAiDetails(place.ai_details) ? place.ai_details : null;
  const [details, setDetails] = useState<AiDetails | null>(initial);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);

  async function generate() {
    setLoading(true);
    setError(null);
    try {
      // Real Google review excerpts, fetched client-side (this app has no
      // server-side Google Places access — see lib/google/fetchPlaceReviews.ts),
      // then sent to the server so Claude can ground its output in them
      // instead of inventing sentiment.
      const reviews = place.google_place_id ? await fetchPlaceReviews(place.google_place_id) : [];
      const res = await fetch("/api/places/details", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ placeId: place.id, reviews }),
      });
      const data = await res.json();
      if (!res.ok) {
        throw new Error(data.error ?? "Something went wrong");
      }
      setDetails(data.details as AiDetails);
    } catch (e) {
      setError(e instanceof Error ? e.message : "Something went wrong");
    } finally {
      setLoading(false);
    }
  }

  if (!details) {
    return (
      <div>
        <p className="text-body text-secondary">
          Get an AI-generated breakdown grounded in real Google reviews — what people
          praise, what to seek out, what it&apos;s like, and good-to-know tips.
        </p>
        <Button
          variant="secondary"
          className="mt-3"
          onClick={generate}
          disabled={loading}
        >
          {loading ? "Thinking…" : "Generate details"}
        </Button>
        {/* aria-live, because this arrives seconds after a click with nothing
            else on screen changing — a rate-limit refusal or a network failure
            would otherwise appear in silence. */}
        <p role="status" aria-live="polite" className="mt-1.5 text-label font-semibold text-critical empty:mt-0">
          {error}
        </p>
      </div>
    );
  }

  // Heading resolved from the place's category — "What to order" reads as a
  // bug on a museum. types/place.ts owns the mapping, next to the category
  // list itself.
  const recommendationsHeading = placeRecommendationsHeading(place.category);

  // Stagger positions, counted over the sections that actually render rather
  // than fixed per section: two of the four are conditional, and a hardcoded
  // delay would leave a visible gap in the cascade wherever one is missing.
  // Written out rather than accumulated with a counter during render, so the
  // order is readable at a glance and does not depend on JSX evaluation
  // order.
  const hasRecommendations = details.whatToOrder.length > 0;
  const hasGoodToKnow = details.goodToKnow.length > 0;
  const whatItsLikeStep = hasRecommendations ? 2 : 1;
  const goodToKnowStep = whatItsLikeStep + 1;
  const regenerateStep = goodToKnowStep + (hasGoodToKnow ? 1 : 0);

  return (
    <div className="flex flex-col gap-4">
      <Section heading="What people say" defaultOpen>
        {details.whatPeopleSay.frequentlyPraised.length > 0 && (
          <div>
            <p className="text-micro font-semibold uppercase tracking-wide text-positive">
              Frequently praised
            </p>
            <ChipList items={details.whatPeopleSay.frequentlyPraised} tone="positive" />
          </div>
        )}
        {details.whatPeopleSay.commonCriticisms.length > 0 && (
          <div className="mt-2.5">
            <p className="text-micro font-semibold uppercase tracking-wide text-critical">
              Common criticisms
            </p>
            <ChipList items={details.whatPeopleSay.commonCriticisms} tone="critical" />
          </div>
        )}
        <p className="mt-2.5 text-body text-secondary">
          {details.whatPeopleSay.overallImpression}
        </p>
      </Section>

      {hasRecommendations && (
        <Section heading={recommendationsHeading} delay={SECTION_STAGGER_MS}>
          <ChipList items={details.whatToOrder} tone="neutral" className="mt-0" />
        </Section>
      )}

      <Section heading="What it’s like" delay={whatItsLikeStep * SECTION_STAGGER_MS}>
        <p className="text-body text-secondary">{details.whatItsLike}</p>
      </Section>

      {hasGoodToKnow && (
        <Section heading="Good to know" delay={goodToKnowStep * SECTION_STAGGER_MS}>
          <ul className="list-disc space-y-1 pl-4 text-body text-secondary">
            {details.goodToKnow.map((t) => (
              <li key={t} className="break-words">
                {t}
              </li>
            ))}
          </ul>
        </Section>
      )}

      <p role="status" aria-live="polite" className="text-label font-semibold text-critical">
        {error}
      </p>
      {/* Last step of the cascade, so it lands on the one thing left to do
          rather than the reveal petering out mid-panel.
          Was a bare underlined text link at text-xs with no minimum height —
          about 18px tall, the smallest target in the drawer. `ghost` keeps it
          visually quiet, which was the point of the link, while carrying the
          36px box and the 44px hit area every other small control here has. */}
      <Button
        variant="ghost"
        size="sm"
        onClick={generate}
        disabled={loading}
        style={{ animationDelay: `${regenerateStep * SECTION_STAGGER_MS}ms` }}
        className="animate-rise-in -ml-1 self-start"
      >
        {loading ? "Regenerating…" : "Regenerate"}
      </Button>
    </div>
  );
}
