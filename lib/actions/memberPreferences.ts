"use server";

import { revalidatePath } from "next/cache";
import { redirect } from "next/navigation";
import { createClient } from "@/lib/supabase/server";
import { toUserError } from "@/lib/errors";
import { MEMBER_OTHER_PREFERENCES_MAX_LENGTH } from "@/lib/constraints";
import { FOOD_PREFERENCES, ACTIVITY_PREFERENCES, ENVIRONMENT_PREFERENCES } from "@/types/member";

async function requireUser() {
  const supabase = createClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();
  if (!user) {
    redirect("/login");
  }
  return { supabase, user };
}

const FOOD_VALUES = new Set<string>(FOOD_PREFERENCES.map((o) => o.value));
const ACTIVITY_VALUES = new Set<string>(ACTIVITY_PREFERENCES.map((o) => o.value));
const ENVIRONMENT_VALUES = new Set<string>(ENVIRONMENT_PREFERENCES.map((o) => o.value));

// Drops anything not in the allow-list rather than erroring — same
// defensive posture as lib/actions/places.ts's parsePhotoRefs — never trust
// client-supplied form values as already-validated.
function parseMultiSelect(values: FormDataEntryValue[], allowed: Set<string>): string[] {
  const seen = new Set<string>();
  for (const value of values) {
    const s = String(value);
    if (allowed.has(s)) seen.add(s);
  }
  return Array.from(seen);
}

// Any group member can save preferences for any claimed profile in the
// group — mirrors group_member_profiles' own "equally-trusted co-planners"
// RLS shape (any member can already edit another member's display name or
// avatar today), not a new, looser rule invented for this table. The real
// authorization boundary is member_preferences' own RLS (the referenced
// profile's group membership) — groupId here is only used for
// revalidatePath, so a mismatched value can't be used to target a profile
// the caller shouldn't see.
export async function savePreferences(formData: FormData) {
  const profileId = String(formData.get("profileId") ?? "");
  const groupId = String(formData.get("groupId") ?? "");
  if (!profileId || !groupId) {
    throw new Error("Missing profile");
  }

  const food = parseMultiSelect(formData.getAll("food"), FOOD_VALUES);
  const activity = parseMultiSelect(formData.getAll("activity"), ACTIVITY_VALUES);
  const environmentRaw = String(formData.get("environment") ?? "");
  const environment = ENVIRONMENT_VALUES.has(environmentRaw) ? environmentRaw : null;
  const otherPreferences = String(formData.get("otherPreferences") ?? "").trim() || null;
  if (otherPreferences && otherPreferences.length > MEMBER_OTHER_PREFERENCES_MAX_LENGTH) {
    throw new Error(`Keep it under ${MEMBER_OTHER_PREFERENCES_MAX_LENGTH} characters`);
  }

  const { supabase } = await requireUser();

  const { error } = await supabase.from("member_preferences").upsert(
    {
      group_member_profile_id: profileId,
      food_preference: food,
      activity_preference: activity,
      environment_preference: environment,
      other_preferences: otherPreferences,
    },
    { onConflict: "group_member_profile_id" }
  );

  if (error) {
    throw toUserError("savePreferences failed", error, "Couldn't save your preferences — please try again.");
  }

  revalidatePath(`/groups/${groupId}`);
}
