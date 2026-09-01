// Brand mark. Replaced a literal heart icon (see git history / CLAUDE.md) —
// a simple line-drawn compass instead, fitting a "little trips" travel
// journal rather than a dating app. Pure stroke, no fill, so it inherits
// color the same way the old icon did: wrap in a text-{color} class and set
// size via className, same API as before.
export function CompassMark({ className = "h-4 w-4" }: { className?: string }) {
  return (
    <svg
      viewBox="0 0 24 24"
      fill="none"
      stroke="currentColor"
      strokeWidth={1.6}
      strokeLinecap="round"
      strokeLinejoin="round"
      className={className}
      aria-hidden
    >
      <circle cx="12" cy="12" r="8.5" />
      <path d="M15.2 8.8 12.9 12.9 8.8 15.2 11.1 11.1 15.2 8.8Z" />
    </svg>
  );
}
