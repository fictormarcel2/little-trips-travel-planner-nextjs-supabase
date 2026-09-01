"use server";

import { revalidatePath } from "next/cache";
import { redirect } from "next/navigation";
import type { SupabaseClient } from "@supabase/supabase-js";
import { createClient } from "@/lib/supabase/server";
import { toUserError } from "@/lib/errors";
import { ITINERARY_TITLE_MAX_LENGTH, ITINERARY_LOCATION_MAX_LENGTH } from "@/lib/constraints";
import { getWeatherSnapshot } from "@/lib/weather/getWeatherSnapshot";

const ISO_DATE_PATTERN = /^\d{4}-\d{2}-\d{2}$/;

function parsePlannedDate(raw: FormDataEntryValue | null): string | null {
  const trimmed = String(raw ?? "").trim();
  return ISO_DATE_PATTERN.test(trimmed) ? trimmed : null;
}

function parseLocation(raw: FormDataEntryValue | null): string | null {
  const trimmed = String(raw ?? "").trim();
  return trimmed || null;
}

// Best-effort — a bad/unrecognized location string should never block
// saving the itinerary itself, so this never throws. Returns null (clearing
// any stale cached weather) whenever either field is missing.
async function resolveWeather(plannedDate: string | null, location: string | null) {
  if (!plannedDate || !location) return null;
  return getWeatherSnapshot(location, plannedDate);
}

async function requireItinerary(supabase: SupabaseClient, itineraryId: string) {
  const { data } = await supabase
    .from("itineraries")
    .select("id, group_id")
    .eq("id", itineraryId)
    .maybeSingle();
  if (!data) {
    throw new Error("You don't have access to this itinerary");
  }
  return data as { id: string; group_id: string };
}

export async function createItinerary(formData: FormData) {
  const groupId = String(formData.get("groupId") ?? "");
  const title = String(formData.get("title") ?? "").trim();
  if (!groupId || !title) {
    throw new Error("Missing group or title");
  }
  if (title.length > ITINERARY_TITLE_MAX_LENGTH) {
    throw new Error(`Title must be ${ITINERARY_TITLE_MAX_LENGTH} characters or fewer`);
  }
  const plannedDate = parsePlannedDate(formData.get("plannedDate"));
  const location = parseLocation(formData.get("location"));
  if (location && location.length > ITINERARY_LOCATION_MAX_LENGTH) {
    throw new Error(`Location must be ${ITINERARY_LOCATION_MAX_LENGTH} characters or fewer`);
  }

  const supabase = createClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();
  if (!user) {
    redirect("/login");
  }

  // Explicit server-side membership check — never trust the client-supplied
  // groupId alone. RLS enforces this independently on the insert below, but
  // this gives us a clear error instead of an opaque RLS rejection.
  const { data: group } = await supabase
    .from("groups")
    .select("id")
    .eq("id", groupId)
    .maybeSingle();
  if (!group) {
    throw new Error("You're not a member of this group");
  }

  const weather = await resolveWeather(plannedDate, location);

  const { data, error } = await supabase
    .from("itineraries")
    .insert({ group_id: groupId, title, planned_date: plannedDate, location, weather, created_by: user.id })
    .select("id")
    .single();

  if (error || !data) {
    throw toUserError("createItinerary failed", error, "Couldn't create the trip — please try again.");
  }

  revalidatePath(`/groups/${groupId}`);
  redirect(`/groups/${groupId}/itineraries/${data.id}`);
}

export async function updateItinerary(formData: FormData) {
  const itineraryId = String(formData.get("itineraryId") ?? "");
  const title = String(formData.get("title") ?? "").trim();
  if (!itineraryId || !title) {
    throw new Error("Missing itinerary or title");
  }
  if (title.length > ITINERARY_TITLE_MAX_LENGTH) {
    throw new Error(`Title must be ${ITINERARY_TITLE_MAX_LENGTH} characters or fewer`);
  }
  const plannedDate = parsePlannedDate(formData.get("plannedDate"));
  const location = parseLocation(formData.get("location"));
  if (location && location.length > ITINERARY_LOCATION_MAX_LENGTH) {
    throw new Error(`Location must be ${ITINERARY_LOCATION_MAX_LENGTH} characters or fewer`);
  }

  const supabase = createClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();
  if (!user) {
    redirect("/login");
  }

  const itinerary = await requireItinerary(supabase, itineraryId);
  const weather = await resolveWeather(plannedDate, location);

  const { error } = await supabase
    .from("itineraries")
    .update({ title, planned_date: plannedDate, location, weather })
    .eq("id", itineraryId);

  if (error) {
    throw toUserError("updateItinerary failed", error, "Couldn't save those changes — please try again.");
  }

  revalidatePath(`/groups/${itinerary.group_id}/itineraries/${itineraryId}`);
}

export async function refreshItineraryWeather(formData: FormData) {
  const itineraryId = String(formData.get("itineraryId") ?? "");
  if (!itineraryId) {
    throw new Error("Missing itinerary");
  }

  const supabase = createClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();
  if (!user) {
    redirect("/login");
  }

  const itinerary = await requireItinerary(supabase, itineraryId);

  const { data: current } = await supabase
    .from("itineraries")
    .select("planned_date, location")
    .eq("id", itineraryId)
    .maybeSingle();

  const weather = await resolveWeather(current?.planned_date ?? null, current?.location ?? null);

  const { error } = await supabase.from("itineraries").update({ weather }).eq("id", itineraryId);

  if (error) {
    throw toUserError(
      "refreshItineraryWeather failed",
      error,
      "Couldn't refresh the weather — please try again."
    );
  }

  revalidatePath(`/groups/${itinerary.group_id}/itineraries/${itineraryId}`);
}

// "We're going here" and its undo, in one action: an empty placeId clears the
// marker. Deliberately not a vote — see supabase/migrations/0008_chosen_place.sql.
// Any member can move the marker, same premise as every other mutation here.
export async function setChosenPlace(formData: FormData) {
  const itineraryId = String(formData.get("itineraryId") ?? "");
  const placeId = String(formData.get("placeId") ?? "").trim();
  if (!itineraryId) {
    throw new Error("Missing itinerary");
  }

  const supabase = createClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();
  if (!user) {
    redirect("/login");
  }

  const itinerary = await requireItinerary(supabase, itineraryId);

  // RLS will not catch a place id from a *different* itinerary: the places
  // select policy scopes to the group, so a member of a group with two trips
  // can see both sets of rows, and the FK only checks that the place exists.
  // Scoping the lookup by itinerary_id is what makes the mismatch fail.
  if (placeId) {
    const { data: place } = await supabase
      .from("places")
      .select("id")
      .eq("id", placeId)
      .eq("itinerary_id", itineraryId)
      .maybeSingle();
    if (!place) {
      throw new Error("That stop isn't part of this trip");
    }
  }

  const { error } = await supabase
    .from("itineraries")
    .update({ chosen_place_id: placeId || null })
    .eq("id", itineraryId);

  if (error) {
    throw toUserError("setChosenPlace failed", error, "Couldn't save that choice — please try again.");
  }

  revalidatePath(`/groups/${itinerary.group_id}/itineraries/${itineraryId}`);
}
