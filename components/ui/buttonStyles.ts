type ButtonVariant = "primary" | "secondary" | "ghost" | "danger";
type ButtonSize = "sm" | "md" | "lg";

// Base styles applied to all buttons
const BASE_CLASSES =
  "inline-flex shrink-0 items-center justify-center gap-2 whitespace-nowrap rounded-full font-semibold transition duration-fast ease-entrance active:scale-[0.98] focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-accent focus-visible:ring-offset-2 focus-visible:ring-offset-surface disabled:cursor-not-allowed disabled:opacity-50";

// Every hover here is repeated under focus-visible. The focus ring in
// BASE_CLASSES was already an affordance of its own, but "the same feedback
// however you got to the control" is a cheaper rule to keep than "a ring
// counts as equivalent to a tint", and it costs one class per variant.
const VARIANT_CLASSES: Record<ButtonVariant, string> = {
  primary:
    "border border-transparent bg-accent-fill text-on-accent shadow-soft hover:bg-accent-fill-hover focus-visible:bg-accent-fill-hover active:bg-accent-fill-hover",
  // border-input, not border-strong: this border is the only thing marking
  // the control's boundary, so WCAG 1.4.11 needs 3:1 for it, same reasoning
  // as .input-field in globals.css. border-strong is 1.45:1 on a card and
  // 1.36:1 on the page — measured live, not estimated, and exactly the
  // "never caught because phases 1-5 only measured text pairs" failure
  // app/globals.css's own comment on --border-input warns about.
  secondary:
    "border border-input bg-surface-sunken text-primary hover:bg-surface-hover focus-visible:bg-surface-hover",
  ghost:
    "border border-transparent bg-transparent text-accent hover:bg-accent-tint focus-visible:bg-accent-tint",
  // Destructive actions are deliberately *quieter* than primary: an outlined
  // critical tone, never a filled one. Removing a place is irreversible and
  // any group member can do it, so it must not out-shout the action people
  // actually came to take. border-input for the same 3:1 reason as secondary.
  danger:
    "border border-input bg-transparent text-critical hover:bg-critical-tint focus-visible:bg-critical-tint",
};

// Touch targets. `md` (44px) is the comfortable thumb target and the default.
// `sm` keeps a 36px *box* — the density these sit at is the reason the size
// exists — but carries `.touch-target`, which extends the area that actually
// receives the click to 44px with a pseudo-element. See app/globals.css: the
// pills this replaced measured about 28px, under WCAG 2.2 2.5.8's 24px floor
// as well as under a thumb.
const SIZE_CLASSES: Record<ButtonSize, string> = {
  sm: "touch-target min-h-9 px-3.5 py-1.5 text-label",
  md: "min-h-11 px-5 py-2.5 text-body",
  lg: "min-h-[3.25rem] px-6 py-3 text-body-lg",
};

export interface ButtonStylesProps {
  variant?: ButtonVariant;
  size?: ButtonSize;
}

/**
 * Generate Tailwind class string for button styles.
 * This is a class helper (not a component) so it can be used on both
 * <button> elements and <Link>s.
 *
 * @param variant - Button style variant (primary, secondary, ghost, danger)
 * @param size - Button size (sm, md, lg)
 * @returns Complete Tailwind class string
 */
export function buttonClasses({
  variant = "primary",
  size = "md",
}: ButtonStylesProps = {}): string {
  return [BASE_CLASSES, SIZE_CLASSES[size], VARIANT_CLASSES[variant]]
    .filter(Boolean)
    .join(" ");
}
