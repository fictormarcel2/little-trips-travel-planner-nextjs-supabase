"use client";

import {
  useEffect,
  useId,
  useState,
  type KeyboardEvent,
  type MouseEvent,
  type ReactNode,
} from "react";
import { useFormStatus } from "react-dom";
import { Button, type ButtonProps } from "@/components/ui/Button";

/**
 * How long an armed button waits before disarming itself.
 *
 * Long enough to read the changed label and decide; short enough that a
 * button left armed by a mis-tap is harmless by the time anyone comes back
 * to the page. It does not run while the form is submitting — see below.
 */
const REVERT_MS = 4000;

export interface ConfirmButtonProps {
  /** Resting label — the verb, e.g. "Remove". */
  children: ReactNode;
  /** Label once armed. Short: it replaces `children` in the same box. */
  confirmText?: string;
  /** Label while the enclosing form submits. */
  pendingText?: string;
  variant?: ButtonProps["variant"];
  size?: ButtonProps["size"];
  className?: string;
  /**
   * Sentence announced when the button arms. Pass one naming the thing being
   * destroyed ("Remove Alex from this group?") — a screen reader hearing only
   * "Sure?" has no way to tell which of six Remove buttons it is standing on.
   */
  announcement?: string;
}

/**
 * A submit button that will not submit on its first click.
 *
 * Four actions in this app destroy data permanently, and the trust model
 * means *any* group member can aim them at *anyone's* work: removing a place
 * someone else added, removing a member, revoking an invite, leaving a group.
 * None of them had any confirmation at all.
 *
 * Two-step inline rather than `window.confirm()`, per the brief: the native
 * dialog cannot be styled, it blocks the whole tab, and on mobile it lands as
 * a system sheet with none of this app's language in it. Here the button
 * becomes its own confirmation, and reverts on its own if it is ignored.
 *
 * ── Why this does not toggle the `type` attribute ──────────────────────────
 *
 * The obvious implementation is `type={armed ? "submit" : "button"}`, so that
 * an unarmed button physically cannot submit. It was the first implementation
 * here, and it deleted a place on the *first* click — verified in a browser
 * against 32 seeded places, which it removed one per click while the label
 * never appeared to change.
 *
 * The reason is the order of a native click. React treats click as a discrete
 * event and flushes the resulting state update synchronously, before the
 * browser has finished dispatching that same event. So arming re-rendered the
 * element to `type="submit"` while the click was still in flight, and the
 * browser then computed the default action against the attribute it found at
 * that moment: submit. The confirmation step armed and fired in one gesture.
 *
 * So `type` is now a constant `"button"` — the element never becomes a submit
 * control at all — and the confirming click submits the form explicitly with
 * `requestSubmit()`. That is the API React itself points at (its own guard
 * action reads "If you called form.submit() manually, consider using
 * form.requestSubmit() instead"): it fires a real submit event, which is what
 * a Server Action form is listening for. No Server Action changed.
 *
 * `useFormStatus` reports the enclosing form's pending state, which is why the
 * label is resolved here rather than handed to Button's own `pendingText` —
 * Button gates that on `type === "submit"`, and this button never is one.
 */
export function ConfirmButton({
  children,
  confirmText = "Sure?",
  pendingText,
  variant = "danger",
  size = "md",
  className,
  announcement,
}: ConfirmButtonProps) {
  const [armed, setArmed] = useState(false);
  const { pending } = useFormStatus();
  const statusId = useId();

  // Disarm on a timer, but never while the form is in flight: a label that
  // reverted mid-submit would drop `pendingText` for no reason the user can
  // see.
  useEffect(() => {
    if (!armed || pending) return;
    const t = window.setTimeout(() => setArmed(false), REVERT_MS);
    return () => window.clearTimeout(t);
  }, [armed, pending]);

  function handleClick(e: MouseEvent<HTMLButtonElement>) {
    if (!armed) {
      setArmed(true);
      return;
    }
    // Armed: submit the form this button sits in. `requestSubmit` rather than
    // `submit` because only the former fires the submit event React's form
    // action is bound to.
    e.currentTarget.form?.requestSubmit();
  }

  // Escape backs out, matching the details drawer and every other dismissible
  // thing here. Bound to the button rather than to the document so it cannot
  // swallow an Escape meant for a drawer open behind it.
  function handleKeyDown(e: KeyboardEvent<HTMLButtonElement>) {
    if (e.key === "Escape" && armed) {
      e.stopPropagation();
      setArmed(false);
    }
  }

  const label = pending ? pendingText ?? "Working…" : armed ? confirmText : children;

  return (
    <>
      <Button
        type="button"
        variant={variant}
        size={size}
        className={className}
        disabled={pending}
        onClick={handleClick}
        onKeyDown={handleKeyDown}
        aria-describedby={armed ? statusId : undefined}
      >
        {label}
      </Button>
      {/* Announced, not merely shown: the visible change is a short label swap
          inside the button the user is already standing on, and a screen
          reader will not reliably re-read a focused element whose text changed
          under it. Always rendered and never `hidden` — a live region that is
          removed from the accessibility tree cannot announce anything when it
          returns. An empty <span> generates no box, so it costs no layout
          while idle. */}
      <span id={statusId} role="status" aria-live="polite" className="sr-only">
        {armed
          ? announcement ?? "Press the button again to confirm. This cannot be undone."
          : ""}
      </span>
    </>
  );
}
