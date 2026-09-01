"use client";

import { useState, type FormEvent } from "react";
import { linkEmail } from "@/lib/actions/account";
import { Button } from "@/components/ui/Button";
import { Field } from "@/components/ui/Field";

export function SaveAccountForm() {
  const [email, setEmail] = useState("");
  const [status, setStatus] = useState<"idle" | "sending" | "sent" | "error">("idle");
  const [error, setError] = useState<string | null>(null);

  async function handleSubmit(e: FormEvent) {
    e.preventDefault();
    if (!email.trim()) return;
    setStatus("sending");
    setError(null);
    const result = await linkEmail(email.trim());
    if (result.ok) {
      setStatus("sent");
    } else {
      setStatus("error");
      setError(result.error);
    }
  }

  if (status === "sent") {
    return (
      // role="status": the form this replaces is gone by the time this renders,
      // so without a live region a screen reader is left on a page that
      // silently changed under it.
      <p role="status" className="text-body text-secondary">
        Check <strong className="break-words">{email}</strong> for a confirmation
        link — once you click it, you can log in from any device and see all your
        groups, right where you left them.
      </p>
    );
  }

  return (
    <div>
      <h2 className="mb-2 font-display text-title text-primary">Save your account</h2>
      <p className="text-body text-secondary">
        You&apos;re here as a guest — everything you do still counts, but this
        only works from this device. Add an email to save your groups and log
        in from anywhere.
      </p>
      {/* Field, so the email input gets the visible label it never had — it
          ran on a placeholder alone, which disappears on the first keystroke
          and is announced as nothing at all. The error also lands in Field's
          own error slot, which brings aria-invalid and aria-describedby with
          it. sm:items-end lines the button up with the input rather than with
          the label above it. */}
      <form
        onSubmit={handleSubmit}
        className="mt-3 flex flex-col gap-2 sm:flex-row sm:items-end"
      >
        <Field
          id="save-account-email"
          label="Email address"
          type="email"
          value={email}
          onChange={(e) => setEmail(e.target.value)}
          placeholder="you@example.com"
          required
          error={error ?? undefined}
          className="min-w-0 flex-1"
        />
        <Button
          type="submit"
          variant="secondary"
          disabled={status === "sending"}
          className="whitespace-nowrap"
        >
          {status === "sending" ? "Sending…" : "Save my account"}
        </Button>
      </form>
    </div>
  );
}
