"use client";

import { useEffect, useId, useRef, useState, type ReactNode } from "react";
import { AnimatePresence, motion, type PanInfo } from "motion/react";
import { MotionProvider } from "@/components/ui/Motion";
import { SCRIM_FADE, SHEET_EXIT, SHEET_SPRING } from "@/lib/motion";

export interface SheetProps {
  open: boolean;
  onClose: () => void;
  /** Required — becomes the panel's accessible name via aria-labelledby. */
  title: string;
  children: ReactNode;
  /** Scrim + focus trap + scroll lock + click-outside. Default true. */
  modal?: boolean;
  /**
   * Never unmount, even while closed. Required for any sheet holding
   * PlaceAutocompleteInput — that widget binds to a live DOM node, and
   * losing it on close means a fresh network round-trip on every reopen.
   * When closed, the panel is made non-focusable immediately (`inert`) and
   * gains the native `hidden` attribute once its close animation settles.
   */
  keepMounted?: boolean;
  /** Default: responsive — bottom sheet below `md`, right panel from `md` up. */
  side?: "right" | "bottom";
}

const FOCUSABLE_SELECTOR =
  'a[href], button:not([disabled]), textarea:not([disabled]), input:not([disabled]), select:not([disabled]), [tabindex]:not([tabindex="-1"])';

/**
 * SSR-safe media query: both the server render and the first client render
 * return `false`, so there is no hydration mismatch. The real value lands in
 * a useEffect after mount — one extra client-only re-render, not an error.
 */
function useIsMdUp(): boolean {
  const [isMdUp, setIsMdUp] = useState(false);
  useEffect(() => {
    const mq = window.matchMedia("(min-width: 768px)");
    setIsMdUp(mq.matches);
    const onChange = () => setIsMdUp(mq.matches);
    mq.addEventListener("change", onChange);
    return () => mq.removeEventListener("change", onChange);
  }, []);
  return isMdUp;
}

// Both axes are pinned in both variant sets, not just the one each
// presentation animates. useIsMdUp() is SSR-safe by returning false on the
// server AND the first client render, so a keepMounted sheet's very first
// mount can briefly resolve isBottom=true and write y:"100%" via
// bottomVariants — before the effect flips isMdUp and swaps it onto
// rightVariants for good. rightVariants has no y key, so framer never
// animates that stale 900px back out: the panel opens with the right x but
// stays parked a full viewport below the fold. keepMounted is what exposes
// this — a sheet that unmounts on close only ever mounts once isMdUp has
// already settled, so it never sees the mismatched variant set.
const rightVariants = {
  hidden: { x: "100%", y: 0, transition: SHEET_EXIT },
  visible: { x: 0, y: 0, transition: SHEET_SPRING },
};

const bottomVariants = {
  hidden: { y: "100%", x: 0, transition: SHEET_EXIT },
  visible: { y: 0, x: 0, transition: SHEET_SPRING },
};

/**
 * The single overlay implementation for the app — see
 * docs/redesign/06-redesign-spec.md §4. Width is fixed at `max-w-md` (448px)
 * on the right-panel presentation: that figure is arithmetically load-bearing
 * for PlacesWithDetailsDrawer's `xl:-translate-x-56` page-shift (see the
 * comment there) and must not change here.
 */
export function Sheet({
  open,
  onClose,
  title,
  children,
  modal = true,
  keepMounted = false,
  side,
}: SheetProps) {
  const isMdUp = useIsMdUp();
  const effectiveSide = side ?? (isMdUp ? "right" : "bottom");
  const isBottom = effectiveSide === "bottom";

  const titleId = useId();
  const panelRef = useRef<HTMLDivElement>(null);
  const closeBtnRef = useRef<HTMLButtonElement>(null);
  const previouslyFocused = useRef<HTMLElement | null>(null);
  // keepMounted only: whether the close animation has finished, gating the
  // native `hidden` attribute so the exit still gets to animate first.
  const [closedAndSettled, setClosedAndSettled] = useState(!open);

  // Focus moves into the panel on open and returns to whatever triggered it
  // on close. Runs for both keepMounted and not — for a non-keepMounted
  // sheet this fires while it is still mid-exit-animation, which is correct:
  // the trigger should get focus back immediately, not after the animation.
  useEffect(() => {
    if (open) {
      previouslyFocused.current = document.activeElement as HTMLElement | null;
      setClosedAndSettled(false);
    } else {
      previouslyFocused.current?.focus();
      previouslyFocused.current = null;
    }
  }, [open]);

  // The actual focus() call is a separate effect, gated on closedAndSettled
  // rather than living in the effect above. On a keepMounted sheet the panel
  // still carries the `hidden` class from the render that closed it —
  // setClosedAndSettled(false) above is what removes that class, but it only
  // schedules the re-render; calling closeBtnRef.current?.focus() in the same
  // effect targeted an element that was still display:none, which no-ops.
  // Splitting the two lets this one re-run only once the DOM has actually
  // caught up. Non-keepMounted sheets never carry `hidden` at all, so this
  // fires on the same tick there and nothing changes for them.
  useEffect(() => {
    if (open && !closedAndSettled) closeBtnRef.current?.focus();
  }, [open, closedAndSettled]);

  // `inert` blocks focus and hit-testing the instant the sheet closes,
  // independent of however long the close animation takes. Set via the DOM
  // property directly rather than a JSX prop — this repo's React version
  // support for `inert` as a prop is inconsistent.
  useEffect(() => {
    if (panelRef.current) panelRef.current.inert = !open;
  }, [open]);

  // Escape closes in both modal and non-modal mode. Tab is trapped only
  // when modal — a non-modal sheet leaves the rest of the page tabbable.
  useEffect(() => {
    if (!open) return;
    function handleKeyDown(e: KeyboardEvent) {
      if (e.key === "Escape") {
        onClose();
        return;
      }
      if (e.key !== "Tab" || !modal || !panelRef.current) return;
      const focusable = Array.from(
        panelRef.current.querySelectorAll<HTMLElement>(FOCUSABLE_SELECTOR)
      );
      if (focusable.length === 0) {
        e.preventDefault();
        return;
      }
      const first = focusable[0];
      const last = focusable[focusable.length - 1];
      if (e.shiftKey && document.activeElement === first) {
        e.preventDefault();
        last.focus();
      } else if (!e.shiftKey && document.activeElement === last) {
        e.preventDefault();
        first.focus();
      }
    }
    document.addEventListener("keydown", handleKeyDown);
    return () => document.removeEventListener("keydown", handleKeyDown);
  }, [open, modal, onClose]);

  // Scroll lock only when modal — a non-modal sheet leaves the page
  // scrollable, matching the drawer contract this primitive replaces.
  useEffect(() => {
    if (!modal || !open) return;
    const original = document.body.style.overflow;
    document.body.style.overflow = "hidden";
    return () => {
      document.body.style.overflow = original;
    };
  }, [modal, open]);

  function handleDragEnd(_event: unknown, info: PanInfo) {
    if (info.offset.y > 100 || info.velocity.y > 500) onClose();
  }

  const panel = (
    <motion.div
      key="sheet-panel"
      ref={panelRef}
      role="dialog"
      aria-modal={modal}
      aria-labelledby={titleId}
      hidden={keepMounted ? closedAndSettled : undefined}
      drag={isBottom ? "y" : false}
      dragConstraints={{ top: 0, bottom: 0 }}
      dragElastic={{ top: 0, bottom: 1 }}
      onDragEnd={isBottom ? handleDragEnd : undefined}
      initial="hidden"
      animate={open ? "visible" : "hidden"}
      exit="hidden"
      variants={isBottom ? bottomVariants : rightVariants}
      onAnimationComplete={(definition) => {
        if (keepMounted && definition === "hidden") setClosedAndSettled(true);
      }}
      // The `hidden` ATTRIBUTE above cannot carry this on its own: it works
      // via the UA stylesheet's [hidden] { display: none }, and a Tailwind
      // `flex` class beats a UA rule on specificity — so a keepMounted panel
      // stayed `display: flex` while "hidden", held off-screen only by its
      // transform. The `hidden` CLASS is what actually removes it, and
      // Tailwind emits `hidden` last among the display utilities so it wins
      // over `flex` in the same string. Both are kept: the attribute is the
      // semantic signal, the class is the one with teeth.
      className={`${
        isBottom
          ? "fixed inset-x-0 bottom-0 z-50 flex max-h-[90vh] w-full flex-col rounded-t-xl2 bg-surface-elevated shadow-elevated"
          : "fixed inset-y-0 right-0 z-50 flex h-full w-full max-w-md flex-col bg-surface-elevated shadow-elevated"
      }${keepMounted && closedAndSettled ? " hidden" : ""}`}
    >
      <div className="flex items-start justify-between gap-3 border-b border-subtle p-5">
        <h2 id={titleId} className="line-clamp-2 break-words font-display text-xl text-primary">
          {title}
        </h2>
        {/* 44px square touch target, matching the drawer close button this
            primitive replaces. */}
        <button
          ref={closeBtnRef}
          type="button"
          onClick={onClose}
          aria-label="Close"
          className="flex h-11 w-11 shrink-0 items-center justify-center rounded-full text-muted transition duration-fast ease-entrance hover:bg-surface-sunken hover:text-primary focus-visible:bg-surface-sunken focus-visible:text-primary focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-accent active:scale-[0.98]"
        >
          <span aria-hidden>✕</span>
        </button>
      </div>
      <div className="flex-1 overflow-y-auto p-5">{children}</div>
    </motion.div>
  );

  // Below `xl`, the backdrop always renders while open (real scrim when
  // modal; a light-dismiss affordance when not). From `xl` up, a non-modal
  // sheet renders no backdrop at all, so the page beside it stays fully
  // interactive — the contract PlaceDetailsDrawer relies on to let a
  // different place's Details button keep working while the drawer is open.
  const backdrop = (
    <motion.div
      key="sheet-backdrop"
      aria-hidden
      onClick={onClose}
      initial={{ opacity: 0 }}
      animate={{ opacity: 1 }}
      exit={{ opacity: 0 }}
      transition={SCRIM_FADE}
      className={`fixed inset-0 z-40 bg-inverse/40 ${modal ? "" : "xl:hidden"}`}
    />
  );

  return (
    <MotionProvider>
      <AnimatePresence>{open && backdrop}</AnimatePresence>
      {keepMounted ? panel : <AnimatePresence>{open && panel}</AnimatePresence>}
    </MotionProvider>
  );
}
