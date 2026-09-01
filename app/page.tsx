import Link from "next/link";
import Image from "next/image";
import { BrandTag } from "@/components/ui/BrandTag";
import { Surface } from "@/components/ui/Surface";
import { buttonClasses } from "@/components/ui/buttonStyles";
import { HERO_LANDING } from "@/components/ui/images";

// The jotted list on the tilted note. Decorative and aria-hidden — it is a
// page torn out of the journal this app is meant to be, not a mock-up of the
// product UI and not a claim about anything. Kept as data so the markup below
// stays about composition.
const NOTE_LINES = [
  "coffee, first",
  "the little museum",
  "ramen, queue and all",
];

export default function HomePage() {
  return (
    // Not centered, by rule: ANTI-CENTER BIAS applies at DESIGN_VARIANCE > 4
    // and this surface sits at 6. What used to be here — one `.card max-w-lg`
    // dead-center in the viewport — is the single most predictable layout
    // available. The asymmetry now comes from three places: a 7/5 split, the
    // supporting copy indented away from the headline's left edge, and the
    // note stack hanging below the split's vertical center.
    <main className="mx-auto w-full max-w-5xl px-6 py-20 sm:py-32 lg:py-40">
      <div className="md:grid md:grid-cols-12 md:items-center md:gap-10">
        <div className="min-w-0 md:col-span-7">
          <BrandTag />

          <h1 className="mt-7 font-marketing text-display-xl italic text-primary">
            Little trips, planned together.
          </h1>

          {/* The indent is the composition. Body copy and CTA start where the
              headline does not, so the block reads as hand-assembled rather
              than as a stack of centered rows. */}
          <p className="mt-7 max-w-md text-body-lg text-secondary sm:ml-12">
            Start a group, drop in the spots you&apos;re curious about, and get
            a quick take on what&apos;s worth the trip.
          </p>

          <div className="mt-10 sm:ml-12">
            <Link href="/login" className={buttonClasses({ variant: "primary" })}>
              Let&apos;s go
            </Link>
          </div>
        </div>

        {/* Decorative, and hidden below md: on purpose. The mobile override is
            non-negotiable for an app whose most common entry point is a link
            opened on a phone — at 360px this column would push the CTA below
            the fold to show something nobody came for. */}
        <div aria-hidden className="hidden min-w-0 md:col-span-5 md:block">
          <div className="relative mx-auto max-w-xs md:mt-12">
            {/* The hero photo — this is the LCP element on the page, hence
                `priority`. A token-driven vignette (rgb(var(--surface-page)))
                grounds it against the page in both themes, and gives the note
                stack below something to visually land on. */}
            <div className="relative aspect-[4/3] overflow-hidden rounded-xl2 border border-subtle shadow-elevated">
              <Image
                src={HERO_LANDING.src}
                alt={HERO_LANDING.alt}
                fill
                priority
                sizes="(min-width: 768px) 320px, 0px"
                className="object-cover"
              />
              <div className="absolute inset-0 bg-gradient-to-t from-surface-page/60 to-transparent" />
            </div>

            {/* The note stack, now pinned onto the bottom of the photo rather
                than floating alone — the scrapbook cue reads more clearly
                against a "photo" than against empty page background. */}
            <div className="relative -mt-10 ml-6 max-w-[80%]">
              {/* Back note: absolute so the front one alone sets the size. */}
              <div className="absolute inset-0 translate-x-3 translate-y-3 rotate-3 rounded-xl2 border border-subtle bg-surface shadow-soft" />
              <Surface elevation="floating" padding="md" className="relative -rotate-2">
                <p className="font-marketing text-title italic text-primary">Saturday</p>
                <ul className="mt-3 space-y-2 text-body text-secondary">
                  {NOTE_LINES.map((line) => (
                    <li key={line} className="flex gap-2">
                      <span className="text-accent">&mdash;</span>
                      {line}
                    </li>
                  ))}
                </ul>
              </Surface>
            </div>
          </div>
        </div>
      </div>
    </main>
  );
}
