"use client";

import { useId, useState } from "react";
import { savePreferences } from "@/lib/actions/memberPreferences";
import { Button } from "@/components/ui/Button";
import { Field } from "@/components/ui/Field";
import { Panel } from "@/components/ui/Panel";
import { ToggleGroup } from "@/components/groups/ToggleGroup";
import { FOOD_PREFERENCES, ACTIVITY_PREFERENCES, ENVIRONMENT_PREFERENCES } from "@/types/member";
import { MEMBER_OTHER_PREFERENCES_MAX_LENGTH } from "@/lib/constraints";
import type { MemberPreferences } from "@/types/member";

// Non-blocking by design — this app deliberately removed a full-screen
// forced "who are you?" gate after claiming (see CLAUDE.md), so this never
// reintroduces one. The first time a claimed profile has no preferences row
// yet, this renders auto-expanded (right alongside AvatarUpload, same "your
// claimed row" extension point in MembersSection) with a visible "Skip for
// now" — skipping just hides it for this page load, not a persisted
// dismissal, so it offers again next visit until actually completed. Once
// preferences exist, it collapses behind a compact "Edit preferences" link,
// reusing the same form for later edits instead of a second component.
export function MemberPreferencesSection({
  profileId,
  groupId,
  initialPreferences,
}: {
  profileId: string;
  groupId: string;
  initialPreferences: MemberPreferences | null;
}) {
  const hasPreferences = initialPreferences !== null;
  const [expanded, setExpanded] = useState(!hasPreferences);
  const [dismissed, setDismissed] = useState(false);
  const otherId = useId();

  if (dismissed) return null;

  if (!expanded) {
    return (
      <Button variant="ghost" size="sm" onClick={() => setExpanded(true)}>
        Edit preferences
      </Button>
    );
  }

  async function handleSave(formData: FormData) {
    await savePreferences(formData);
    setExpanded(false);
  }

  return (
    // Panel, not a second bordered box: this sits inside MembersSection's
    // own card, and a framed card inside a framed card is §2.5 no. 5. The
    // sunken tone does the separating instead.
    <Panel>
      <form action={handleSave} className="flex flex-col gap-4">
        <input type="hidden" name="profileId" value={profileId} />
        <input type="hidden" name="groupId" value={groupId} />

        {!hasPreferences && (
          <p className="text-body text-secondary">
            Quick preferences that turn into shared search suggestions — takes
            under a minute, and you can always change it later.
          </p>
        )}

        <ToggleGroup
          name="food"
          label="Food"
          options={FOOD_PREFERENCES}
          defaultSelected={initialPreferences?.food_preference ?? []}
        />

        <ToggleGroup
          name="activity"
          label="Activities"
          options={ACTIVITY_PREFERENCES}
          defaultSelected={initialPreferences?.activity_preference ?? []}
        />

        <ToggleGroup
          name="environment"
          label="Indoor or outdoor"
          options={ENVIRONMENT_PREFERENCES}
          defaultSelected={
            initialPreferences?.environment_preference
              ? [initialPreferences.environment_preference]
              : []
          }
          multiple={false}
        />

        <Field
          id={otherId}
          label="Anything else?"
          hint="Allergies, budget, anything the group should plan around."
          name="otherPreferences"
          defaultValue={initialPreferences?.other_preferences ?? ""}
          maxLength={MEMBER_OTHER_PREFERENCES_MAX_LENGTH}
          placeholder="Optional"
        />

        <div className="flex flex-wrap items-center gap-2">
          <Button type="submit" variant="secondary" size="sm" pendingText="Saving…">
            Save
          </Button>
          {/* Both exits are real buttons at the same 36px target as Save —
              "Skip for now" in particular has to be genuinely reachable, or
              the non-blocking promise above is only half kept. */}
          {hasPreferences ? (
            <Button variant="ghost" size="sm" onClick={() => setExpanded(false)}>
              Cancel
            </Button>
          ) : (
            <Button variant="ghost" size="sm" onClick={() => setDismissed(true)}>
              Skip for now
            </Button>
          )}
        </div>
      </form>
    </Panel>
  );
}
