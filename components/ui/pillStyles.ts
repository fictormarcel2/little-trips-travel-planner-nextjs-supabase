/**
 * Shared Tailwind classes for a toggle-style pill button.
 *
 * Two components use this: `ToggleGroup`'s `aria-pressed` preference pills
 * and `AddPlaceForm`'s `role="tab"` step tabs. Those carry different ARIA
 * contracts — aria-pressed multi/single-select vs role="tab" with roving
 * tabindex — so this is a class helper, not a shared component. A shared
 * component would be a union of two ARIA contracts: more code, not less.
 *
 * Only classes both pills render byte-identically are pulled out here.
 * Padding, flex layout, and ToggleGroup's own idle-state border (its pills
 * stand alone and need a visible edge; AddPlaceForm's tabs sit inside a
 * `surface-sunken` strip that already provides the boundary) stay with each
 * caller.
 *
 * Lives under components/, not lib/ — see components/ui/images.ts's header
 * comment: tailwind.config.ts only scans app/** and components/**, so a
 * class string in lib/ is silently purged and the element renders unstyled.
 */

const BASE =
  "touch-target min-h-9 rounded-full text-label font-semibold transition duration-fast ease-entrance active:scale-[0.98] focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-accent focus-visible:ring-offset-2 focus-visible:ring-offset-surface-sunken";

// Active: bg-accent-fill under text-on-accent measures 5.15:1 in light and
// 5.27:1 in dark (Nocturne §2.2). The pill this replaced used
// bg-terracotta-500 with white text at 4.50:1 — under AA, the exact failure
// the old .btn-primary had.
const ACTIVE = "bg-accent-fill text-on-accent shadow-soft";

// Inactive: hover is repeated under focus-visible — same rule buttonStyles.ts
// documents (a focus ring is its own affordance, not a substitute for the
// same tint you'd get from a pointer).
const INACTIVE =
  "text-secondary hover:bg-surface-hover hover:text-primary focus-visible:bg-surface-hover focus-visible:text-primary";

/**
 * @param active - whether this pill is the selected/current one
 * @returns Complete Tailwind class string for the pill's base + state classes
 */
export function pillClasses(active: boolean): string {
  return [BASE, active ? ACTIVE : INACTIVE].join(" ");
}
