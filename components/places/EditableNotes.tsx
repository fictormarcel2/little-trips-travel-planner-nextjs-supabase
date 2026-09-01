"use client";

import { useState } from "react";
import { updatePlaceNotes } from "@/lib/actions/places";
import { Button } from "@/components/ui/Button";
import { PLACE_NOTES_MAX_LENGTH } from "@/lib/constraints";

/**
 * Characters of notes above which the "Show more" toggle appears. Compared
 * against the string rather than the rendered height on purpose: reading a
 * clamped element's scrollHeight means a layout effect on every card on the
 * page just to decide whether one link is shown.
 */
const CLAMP_THRESHOLD = 160;

export function EditableNotes({
  placeId,
  itineraryId,
  initialNotes,
}: {
  placeId: string;
  itineraryId: string;
  initialNotes: string | null;
}) {
  const [editing, setEditing] = useState(false);
  const [expanded, setExpanded] = useState(false);
  const [notes, setNotes] = useState(initialNotes ?? "");

  async function handleSave(formData: FormData) {
    const next = String(formData.get("userNotes") ?? "").trim();
    await updatePlaceNotes(formData);
    setNotes(next);
    setEditing(false);
  }

  if (!editing) {
    return (
      <div className="mt-2">
        <button
          type="button"
          onClick={() => setEditing(true)}
          // min-h-11 for two reasons that happen to agree. It is the touch
          // target this needed — a single line of text with py-0.5 measured
          // about 24px. And it is the height of the textarea this swaps to,
          // so clicking it no longer makes the whole card jump.
          className="-mx-1 flex min-h-11 w-full items-center rounded-lg px-1 py-2 text-left text-body text-secondary transition duration-fast ease-entrance hover:bg-surface-sunken focus:outline-none focus-visible:bg-surface-sunken focus-visible:ring-2 focus-visible:ring-accent"
        >
          {notes ? (
            // Notes run to 2000 characters (PLACE_NOTES_MAX_LENGTH). Left
            // unclamped, one place's notes push every card below it off the
            // screen; `whitespace-pre-line` keeps the line breaks someone
            // typed, which is most of why a long note is long.
            //
            // `line-clamp-3` written out in full, never interpolated from a
            // constant: Tailwind scans these files as plain text, so a class
            // name assembled at runtime is a class name it never emits.
            <span
              className={`whitespace-pre-line break-words ${
                expanded ? "" : "line-clamp-3"
              }`}
            >
              {notes}
            </span>
          ) : (
            <span className="italic text-muted">Add notes…</span>
          )}
        </button>
        {/* Only offered when there is plausibly something hidden. */}
        {notes.length > CLAMP_THRESHOLD && (
          <Button
            variant="ghost"
            size="sm"
            className="-ml-1 mt-0.5"
            onClick={() => setExpanded((v) => !v)}
            aria-expanded={expanded}
          >
            {expanded ? "Show less" : "Show more"}
          </Button>
        )}
      </div>
    );
  }

  return (
    <form action={handleSave} className="mt-2 flex flex-col gap-2">
      <input type="hidden" name="placeId" value={placeId} />
      <input type="hidden" name="itineraryId" value={itineraryId} />
      {/* A real label, not a placeholder that vanishes on the first keystroke.
          Visually hidden rather than printed: the notes sit inside a card that
          already names the place, and a "Notes" caption above a two-row box
          restates what the box plainly is — but a screen reader landing on it
          has none of that context. */}
      <label htmlFor={`notes-${placeId}`} className="sr-only">
        Your notes about this place
      </label>
      <textarea
        id={`notes-${placeId}`}
        name="userNotes"
        defaultValue={notes}
        rows={2}
        autoFocus
        maxLength={PLACE_NOTES_MAX_LENGTH}
        placeholder="Your notes…"
        className="input-field resize-none text-body"
      />
      <div className="flex gap-2">
        <Button type="submit" variant="secondary" size="sm" pendingText="Saving…">
          Save
        </Button>
        <Button variant="ghost" size="sm" onClick={() => setEditing(false)}>
          Cancel
        </Button>
      </div>
    </form>
  );
}
