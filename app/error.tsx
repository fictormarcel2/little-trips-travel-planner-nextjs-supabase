"use client";

import { useEffect } from "react";
import Link from "next/link";
import { StatusScreen } from "@/components/ui/StatusScreen";
import { buttonClasses } from "@/components/ui/buttonStyles";

export default function GlobalError({
  error,
  reset,
}: {
  error: Error & { digest?: string };
  reset: () => void;
}) {
  useEffect(() => {
    console.error("Unhandled route error", error);
  }, [error]);

  return (
    <StatusScreen
      title="Something went off course"
      description="That didn't load right. Try again, or head back to your groups."
      actions={
        <>
          <button type="button" onClick={reset} className={buttonClasses({ variant: "primary" })}>
            Try again
          </button>
          <Link href="/groups" className={buttonClasses({ variant: "secondary" })}>
            Back to groups
          </Link>
        </>
      }
    />
  );
}
