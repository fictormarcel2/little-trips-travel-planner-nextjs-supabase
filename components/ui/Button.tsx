"use client";

import { useFormStatus } from "react-dom";
import type { ButtonHTMLAttributes, ReactNode } from "react";
import { buttonClasses } from "./buttonStyles";

type ButtonVariant = "primary" | "secondary" | "ghost" | "danger";
type ButtonSize = "sm" | "md" | "lg";

export interface ButtonProps extends ButtonHTMLAttributes<HTMLButtonElement> {
  variant?: ButtonVariant;
  size?: ButtonSize;
  /** Label shown while the enclosing form is submitting. Requires type="submit". */
  pendingText?: string;
  children: ReactNode;
}

export function Button({
  variant = "primary",
  size = "md",
  pendingText,
  type = "button",
  disabled = false,
  className = "",
  children,
  ...rest
}: ButtonProps) {
  // useFormStatus reports the pending state of the *enclosing form*, so it is
  // only meaningful for the button that submits it. Gating on type="submit"
  // stops an unrelated button in the same form from wearing someone else's
  // pending state.
  const { pending } = useFormStatus();
  const isPending = type === "submit" && pending;

  const classes = [buttonClasses({ variant, size }), className]
    .filter(Boolean)
    .join(" ");

  return (
    <button
      type={type}
      disabled={disabled || isPending}
      className={classes}
      {...rest}
    >
      {isPending ? pendingText ?? "Working…" : children}
    </button>
  );
}
