import type { HTMLAttributes, ReactNode } from "react";

export interface PanelProps
  extends Omit<HTMLAttributes<HTMLDivElement>, "title"> {
  /** Optional heading rendered above the panel's content. */
  title?: string;
  children: ReactNode;
}

/**
 * Nested content inside a Surface. Panel is the answer to "this block needs to
 * read as separate from the card around it" — it steps down into the sunken
 * tone rather than stacking a second bordered, shadowed card inside the first.
 */
export function Panel({ title, className = "", children, ...rest }: PanelProps) {
  const classes = ["surface-sunken p-4", className].filter(Boolean).join(" ");

  return (
    <div className={classes} {...rest}>
      {title && (
        <p className="mb-2 text-label font-semibold text-secondary">{title}</p>
      )}
      {children}
    </div>
  );
}
