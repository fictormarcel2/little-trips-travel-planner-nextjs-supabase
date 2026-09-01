import type { ReactNode } from "react";

export function SectionHeading({ children }: { children: ReactNode }) {
  return (
    <h2 className="mb-4 flex items-center gap-2 font-display text-title text-primary">
      {/* Decorative, and aria-hidden so it is not read as a bullet before every
          section title. On --accent (not a raw scale step) so it re-tints with the
          theme; it carries no information, so it has no contrast floor to clear,
          and at this size the accent tone reads as a lit status dot. */}
      <span aria-hidden className="h-1.5 w-1.5 shrink-0 rounded-full bg-accent" />
      {children}
    </h2>
  );
}
