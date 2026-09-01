"use client";

import { useId, useState } from "react";
import { pillClasses } from "@/components/ui/pillStyles";

// A small tappable pill-button multi/single-select, syncing its selection
// into hidden <input>s so it still works inside a plain <form action={...}>
// submitted to a Server Action — the same "client interactivity synced into
// hidden form fields" shape components/places/AddPlaceForm.tsx already uses
// for its pickers, rather than a client-side fetch.
//
// The label lives here rather than as a loose <p> beside the group, so the
// group actually carries its accessible name: a bare role="group" announces
// as "group" with no indication of what is being chosen.
export function ToggleGroup({
  name,
  label,
  options,
  defaultSelected = [],
  multiple = true,
}: {
  name: string;
  label: string;
  options: readonly { value: string; label: string }[];
  defaultSelected?: string[];
  multiple?: boolean;
}) {
  const [selected, setSelected] = useState<string[]>(defaultSelected);
  const labelId = useId();

  function toggle(value: string) {
    setSelected((prev) => {
      if (!multiple) {
        return prev.includes(value) ? [] : [value];
      }
      return prev.includes(value) ? prev.filter((v) => v !== value) : [...prev, value];
    });
  }

  return (
    <div role="group" aria-labelledby={labelId}>
      <p id={labelId} className="mb-2 text-label font-semibold text-secondary">
        {label}
      </p>
      <div className="flex flex-wrap gap-2">
        {options.map((option) => {
          const active = selected.includes(option.value);
          return (
            <button
              key={option.value}
              type="button"
              onClick={() => toggle(option.value)}
              aria-pressed={active}
              className={[
                // min-h-9 is the same 36px floor Button's `sm` size holds:
                // the old pills came in around 32px, under WCAG 2.2 2.5.8.
                // touch-target takes the tappable area to 44px without
                // changing the density of a wrapped row of these. Shared
                // base/state classes live in pillStyles.ts (shared with
                // AddPlaceForm's tab pills); the border and inline-flex
                // layout here are specific to this standalone pill shape —
                // AddPlaceForm's tabs sit inside a bordered strip instead.
                "inline-flex items-center px-3.5",
                pillClasses(active),
                // border-transparent on the active pill keeps the box the
                // same size as the border-strong idle pill next to it.
                active ? "border border-transparent" : "border border-strong bg-surface",
              ].join(" ")}
            >
              {option.label}
            </button>
          );
        })}
      </div>
      {selected.map((value) => (
        <input key={value} type="hidden" name={name} value={value} />
      ))}
    </div>
  );
}
