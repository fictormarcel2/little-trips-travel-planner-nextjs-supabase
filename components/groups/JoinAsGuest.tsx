"use client";

import { useEffect, useRef, useState } from "react";
import { useRouter } from "next/navigation";
import Link from "next/link";
import Image from "next/image";
import { joinAnonymously } from "@/lib/actions/anonymousJoin";
import { BrandTag } from "@/components/ui/BrandTag";
import { StatusScreen } from "@/components/ui/StatusScreen";
import { buttonClasses } from "@/components/ui/buttonStyles";
import { LOGIN_SIDE } from "@/components/ui/images";

// hCaptcha is paused for now (Supabase's Bot and Abuse Protection must also
// be turned off in the Dashboard for signInAnonymously() to succeed — see
// CLAUDE.md). The widget import, ref, onLoad handler and render were removed
// with it; recover them from git history (see JoinAsGuest.tsx before the
// "dead hCaptcha import" cleanup) alongside re-enabling this flag.
const HCAPTCHA_ENABLED = false;

export function JoinAsGuest({
  token,
  groupName,
}: {
  token: string;
  groupName: string;
}) {
  const router = useRouter();
  const [error, setError] = useState<string | null>(null);
  const started = useRef(false);

  useEffect(() => {
    if (HCAPTCHA_ENABLED || started.current) return;
    started.current = true;
    handleVerify(null);
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  async function handleVerify(captchaToken: string | null) {
    const result = await joinAnonymously(token, captchaToken);
    if (result.ok) {
      router.push(`/groups/${result.groupId}`);
    } else {
      setError(result.error);
    }
  }

  if (error) {
    // A failed join used to end here, with nothing to do next. StatusScreen
    // gives it the same Persuade grammar as the invalid-invite screen instead
    // of a hand-rolled dead end. `alert` restores the role="alert" the old
    // markup had on this description, replacing the "Getting you in…"
    // role="status" region the visitor was already waiting on.
    return (
      <StatusScreen
        title="That didn't work"
        description={error}
        alert
        actions={
          <>
            <Link href="/" className={buttonClasses({ variant: "primary" })}>
              Go to Little Trips
            </Link>
            <Link href="/login" className={buttonClasses({ variant: "secondary" })}>
              Log in instead
            </Link>
          </>
        }
      />
    );
  }

  return (
    // This is the first screen most new people ever see: the common entry
    // point to this app is an invite link opened on a phone. So it is built
    // at 360px first and desktop follows, and it is left-aligned rather than
    // a centered card — same reason as `/` (ANTI-CENTER BIAS above
    // DESIGN_VARIANCE 4). What it replaces was "Joining {group}… One moment."
    // in a centered box, which reads as a spinner, not as an invitation.
    <main className="mx-auto flex min-h-screen w-full max-w-4xl flex-col justify-center px-6 py-16">
      <div className="md:grid md:grid-cols-12 md:items-center md:gap-10">
        <div className="min-w-0 md:col-span-7">
          <BrandTag />

          <p className="mt-8 text-label font-semibold uppercase tracking-widest text-muted">
            You&apos;ve been invited to
          </p>
          {/* The group name is the loudest thing on the screen — it is the
              one piece of information that makes this feel addressed to
              them. break-words because a group name is free text, and
              display-lg before sm: so a long one still fits a 360px
              column. */}
          <h1 className="mt-2 break-words font-marketing text-display-lg italic text-primary sm:text-display-xl">
            {groupName}
          </h1>
          <p className="mt-5 max-w-md text-body-lg text-secondary">
            Inside you&apos;ll find the little trips this group is planning, and
            the places everyone is curious about. You can add your own — no
            email, no account needed.
          </p>

          {/* Calm progress, not a spinner. `.skeleton` is the shimmer
              primitive that already exists for route-level loading, and it
              already carries its own prefers-reduced-motion guard in
              globals.css — so this adds a progress cue without adding an
              unguarded animation (§2.5 no. 12), and without adding motion
              that belongs to Phase 4. */}
          {/* role="status" so the wait is announced too. The shimmer is
              aria-hidden: it is the visual half of the same message the
              sentence under it already carries in words. */}
          <div role="status" className="mt-10 max-w-xs">
            <div aria-hidden className="skeleton h-1.5 w-full rounded-full" />
            <p className="mt-3 text-label text-muted">Getting you in…</p>
          </div>
        </div>

        {/* LOGIN_SIDE, reused verbatim from /login — one file, two surfaces,
            so this entry point and the magic-link one feel like the same
            place. Hidden below md: same 360px-first rule as everywhere else
            on this page. */}
        <div aria-hidden className="mt-10 hidden min-w-0 md:col-span-5 md:mt-0 md:block">
          <div className="relative mx-auto aspect-[3/4] max-w-xs overflow-hidden rounded-xl2 border border-subtle shadow-elevated">
            <Image
              src={LOGIN_SIDE.src}
              alt={LOGIN_SIDE.alt}
              fill
              sizes="(min-width: 768px) 320px, 0px"
              className="object-cover"
            />
            <div className="absolute inset-0 bg-surface-page/20" />
          </div>
        </div>
      </div>
    </main>
  );
}
