import type { HTMLAttributes, ReactNode } from "react";

type SurfaceElevation = "flat" | "raised" | "floating";
type SurfacePadding = "none" | "sm" | "md" | "lg";
type SurfaceTag = "div" | "section" | "article" | "aside" | "li" | "header" | "footer";

// Three levels, so "this needs to look different from its surroundings" stops
// resolving to "stack another bordered box". Nested content steps *down* into
// components/ui/Panel.tsx instead of reaching for a second raised surface.
const ELEVATION_CLASSES: Record<SurfaceElevation, string> = {
  flat: "rounded-xl2 border border-subtle bg-surface",
  raised: "card",
  floating: "card-elevated",
};

// One padding rhythm for every surface, replacing the per-call-site mix of
// p-4 / p-5 / p-6 / px-8 py-10 that had no rule behind it.
const PADDING_CLASSES: Record<SurfacePadding, string> = {
  none: "",
  sm: "p-4",
  md: "p-6",
  lg: "p-8",
};

export interface SurfaceProps extends HTMLAttributes<HTMLElement> {
  as?: SurfaceTag;
  elevation?: SurfaceElevation;
  padding?: SurfacePadding;
  children?: ReactNode;
}

export function Surface({
  as = "div",
  elevation = "raised",
  padding = "md",
  className = "",
  children,
  ...rest
}: SurfaceProps) {
  const Tag = as;
  const classes = [ELEVATION_CLASSES[elevation], PADDING_CLASSES[padding], className]
    .filter(Boolean)
    .join(" ");

  return (
    <Tag className={classes} {...rest}>
      {children}
    </Tag>
  );
}
