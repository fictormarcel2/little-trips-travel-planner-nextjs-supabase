"use client";

import { useEffect, useState } from "react";
import { Button } from "@/components/ui/Button";

type CopyState = "idle" | "copied" | "failed";

export function InviteLink({ token }: { token: string }) {
  const [state, setState] = useState<CopyState>("idle");
  const path = `/join/${token}`;

  // `typeof window !== "undefined" ? origin + path : path` in the render body
  // is what this used to be, and it was the app's one real hydration bug: the
  // server has no `window`, so it rendered "/join/abc" while the browser's
  // very first render produced "http://host/join/abc". React reported
  // "Text content does not match server-rendered HTML" (#425) and then, on the
  // same page, "There was an error while hydrating this Suspense boundary.
  // Switched to client rendering" (#422) — the whole group page silently
  // re-rendered on the client instead of hydrating.
  //
  // The rule the old code broke: the first client render must produce exactly
  // what the server produced. Anything that only exists in a browser has to
  // land in an effect, which runs after that first render is already
  // reconciled. So the path renders on both sides, and the origin arrives a
  // tick later.
  const [origin, setOrigin] = useState("");
  useEffect(() => setOrigin(window.location.origin), []);
  const url = `${origin}${path}`;

  async function copy() {
    // navigator.clipboard rejects outright on an insecure origin and when
    // the permission is denied. Previously nothing caught that, so the click
    // produced an unhandled rejection and no feedback whatsoever — the link
    // is selectable, so saying "copy it yourself" is a real fallback.
    //
    // Reads `window.location.origin` directly rather than the state above, so
    // a click that somehow beats the effect still copies an absolute URL
    // rather than a bare path someone would paste into a chat as "/join/abc".
    try {
      await navigator.clipboard.writeText(`${window.location.origin}${path}`);
      setState("copied");
    } catch (err) {
      console.error("Failed to copy invite link", err);
      setState("failed");
    }
    setTimeout(() => setState("idle"), 2500);
  }

  return (
    <div className="flex min-w-0 flex-col">
      <div className="flex min-w-0 items-center gap-2">
        <code className="min-w-0 flex-1 truncate rounded-lg border border-subtle bg-surface px-2 py-1 text-label text-secondary">
          {url}
        </code>
        <Button variant="ghost" size="sm" onClick={copy}>
          {state === "copied" ? "Copied" : "Copy"}
        </Button>
      </div>
      {/* role="status" so the outcome is announced — the button label alone
          changes silently for a screen reader that has already moved on.
          Always rendered, never `hidden`: display:none would drop it out of
          the accessibility tree, which is exactly what a live region cannot
          afford. An empty <p> generates no line box, so it costs no height
          while idle, and empty:mt-0 stops its margin doing so either. */}
      <p role="status" className="mt-2 text-label text-muted empty:mt-0">
        {state === "copied" && "Invite link copied to your clipboard."}
        {state === "failed" && "Couldn't copy automatically — select the link above and copy it."}
      </p>
    </div>
  );
}
