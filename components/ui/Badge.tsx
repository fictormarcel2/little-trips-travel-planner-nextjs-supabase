import type { HTMLAttributes, ReactNode } from "react";

type BadgeTone = "neutral" | "accent" | "positive" | "critical";

// Each tone is a contrast-verified pair: the text color is measured against
// its own tint, not against the page, because a badge always sits on its fill.
const TONE_CLASSES: Record<BadgeTone, string> = {
  neutral: "bg-surface-sunken text-secondary", // 7.54:1
  accent: "bg-accent-tint text-accent-on-tint", // 8.00:1
  positive: "bg-positive-tint text-positive", // 6.31:1
  critical: "bg-critical-tint text-critical", // 6.97:1
};

export interface BadgeProps extends HTMLAttributes<HTMLSpanElement> {
  tone?: BadgeTone;
  children: ReactNode;
}

export function Badge({ tone = "neutral", className = "", children, ...rest }: BadgeProps) {
  const classes = ["badge", TONE_CLASSES[tone], className].filter(Boolean).join(" ");

  return (
    <span className={classes} {...rest}>
      {children}
    </span>
  );
}
