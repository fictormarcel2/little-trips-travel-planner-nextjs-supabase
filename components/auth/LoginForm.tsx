"use client";

import { useState, type FormEvent } from "react";
import { createClient } from "@/lib/supabase/client";
import { Button } from "@/components/ui/Button";
import { Field } from "@/components/ui/Field";

export function LoginForm({ redirectTo }: { redirectTo: string }) {
  const [email, setEmail] = useState("");
  const [status, setStatus] = useState<"idle" | "sending" | "sent" | "error">(
    "idle"
  );
  const [errorMsg, setErrorMsg] = useState("");

  async function handleSubmit(e: FormEvent) {
    e.preventDefault();
    setStatus("sending");
    setErrorMsg("");

    const supabase = createClient();
    const { error } = await supabase.auth.signInWithOtp({
      email,
      options: {
        emailRedirectTo: `${window.location.origin}/auth/callback?next=${encodeURIComponent(
          redirectTo
        )}`,
      },
    });

    if (error) {
      setErrorMsg(error.message);
      setStatus("error");
    } else {
      setStatus("sent");
    }
  }

  if (status === "sent") {
    return (
      <div>
        <p className="font-marketing text-display-md italic text-primary">
          Check your inbox.
        </p>
        <p className="mt-3 text-body-lg text-secondary">
          We sent a magic link to{" "}
          <span className="font-bold text-primary">{email}</span>.
        </p>
        <p className="mt-2 text-body text-muted">
          Click the link in that email to finish logging in.
        </p>
      </div>
    );
  }

  return (
    <form onSubmit={handleSubmit} className="flex flex-col gap-5">
      <Field
        id="email"
        label="Email address"
        type="email"
        required
        autoComplete="email"
        value={email}
        onChange={(e) => setEmail(e.target.value)}
        placeholder="you@example.com"
        error={status === "error" ? errorMsg : undefined}
      />
      {/* Button's built-in pending state reads useFormStatus, which only
          reports for a <form action={…}>. This form submits through onSubmit
          because it needs the browser-side Supabase client, so the sending
          state is tracked here and applied explicitly. */}
      <Button type="submit" disabled={status === "sending"} className="w-full">
        {status === "sending" ? "Sending magic link…" : "Send magic link"}
      </Button>
    </form>
  );
}
