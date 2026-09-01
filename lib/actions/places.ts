"use server";

import { revalidatePath } from "next/cache";
import { redirect } from "next/navigation";
import { createClient } from "@/lib/supabase/server";
import type { SupabaseClient } from "@supabase/supabase-js";
import { isPlaceCategory, type PlacePhotoRef } from "@/types/place";
import { toUserError } from "@/lib/errors";
import { PLACE_NAME_MAX_LENGTH, PLACE_ADDRESS_MAX_LENGTH, PLACE_NOTES_MAX_LENGTH } from "@/lib/constraints";

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

// Explicit server-side check that the requesting user actually belongs to
// the group the itinerary lives in — never trust a client-supplied
// itineraryId alone. RLS enforces the same thing on every subsequent
// read/write, but this fails fast with a clear error and gives us the
// itinerary's group_id for revalidation/redirects.
async function requireItineraryMembership(
  supabase: SupabaseClient,
  itineraryId: string
) {
  const { data: itinerary } = await supabase
    .from("itineraries")
    .select("id, group_id")
    .eq("id", itineraryId)
    .maybeSingle();
  if (!itinerary) {
    throw new Error("You don't have access to this itinerary");
  }
  return itinerary as { id: string; group_id: string };
}

function parseCoordinate(raw: FormDataEntryValue | null): number | null {
  if (raw === null) return null;
  const n = Number(raw);
  return Number.isFinite(n) ? n : null;
}

function parseRating(raw: FormDataEntryValue | null): number | null {
  if (raw === null) return null;
  const n = Number(raw);
  return Number.isFinite(n) && n >= 0 && n <= 5 ? n : null;
}

function parseRatingCount(raw: FormDataEntryValue | null): number | null {
  if (raw === null) return null;
  const n = Number(raw);
  return Number.isFinite(n) && Number.isInteger(n) && n >= 0 ? n : null;
}

const MAX_PHOTO_REFS = 3;

// Rejects anything that isn't a genuine http(s) URL — in particular
// javascript: URIs, which would otherwise get stored as-is and rendered as
// a real <a href> (photo attribution links) or <img src> for every group
// member to encounter. Never loosen this to a plain typeof === "string"
// check again: that's exactly what let a stored-XSS payload through before.
function isSafeHttpUrl(value: string): boolean {
  try {
    const parsed = new URL(value);
    return parsed.protocol === "http:" || parsed.protocol === "https:";
  } catch {
    return false;
  }
}

// Trusts nothing from the client beyond shape — re-validates every field
// rather than assuming the browser-side fetch produced well-formed data.
function parsePhotoRefs(raw: FormDataEntryValue | null): PlacePhotoRef[] {
  if (typeof raw !== "string" || !raw) return [];
  let parsed: unknown;
  try {
    parsed = JSON.parse(raw);
  } catch {
    return [];
  }
  if (!Array.isArray(parsed)) return [];

  const refs: PlacePhotoRef[] = [];
  for (const item of parsed) {
    if (
      item &&
      typeof item === "object" &&
      typeof (item as Record<string, unknown>).url === "string" &&
      typeof (item as Record<string, unknown>).attributionText === "string"
    ) {
      const candidate = item as Record<string, unknown>;
      const url = candidate.url as string;
      if (!isSafeHttpUrl(url)) continue;
      const attributionUri =
        typeof candidate.attributionUri === "string" && isSafeHttpUrl(candidate.attributionUri)
          ? candidate.attributionUri
          : null;
      refs.push({
        url,
        attributionText: candidate.attributionText as string,
        attributionUri,
      });
    }
    if (refs.length >= MAX_PHOTO_REFS) break;
  }
  return refs;
}

export async function createPlace(formData: FormData) {
  const itineraryId = String(formData.get("itineraryId") ?? "");
  const name = String(formData.get("name") ?? "").trim();
  const categoryRaw = String(formData.get("category") ?? "other").trim();
  const address = String(formData.get("address") ?? "").trim() || null;
  const latitude = parseCoordinate(formData.get("latitude"));
  const longitude = parseCoordinate(formData.get("longitude"));
  const googlePlaceId = String(formData.get("googlePlaceId") ?? "").trim() || null;
  const rating = parseRating(formData.get("rating"));
  const ratingCount = parseRatingCount(formData.get("ratingCount"));
  const ratingSource = rating !== null ? "google" : null;
  const userNotes = String(formData.get("userNotes") ?? "").trim() || null;
  const photoRefs = parsePhotoRefs(formData.get("photoRefs"));
  if (!itineraryId || !name) {
    throw new Error("Missing itinerary or place name");
  }
  if (!isPlaceCategory(categoryRaw)) {
    throw new Error("Invalid category");
  }
  if (name.length > PLACE_NAME_MAX_LENGTH) {
    throw new Error(`Place name must be ${PLACE_NAME_MAX_LENGTH} characters or fewer`);
  }
  if (address && address.length > PLACE_ADDRESS_MAX_LENGTH) {
    throw new Error(`Address must be ${PLACE_ADDRESS_MAX_LENGTH} characters or fewer`);
  }
  if (userNotes && userNotes.length > PLACE_NOTES_MAX_LENGTH) {
    throw new Error(`Notes must be ${PLACE_NOTES_MAX_LENGTH} characters or fewer`);
  }

  const { supabase, user } = await requireUser();
  const itinerary = await requireItineraryMembership(supabase, itineraryId);

  // Fixed at creation time — see the added_by_profile_id comment in
  // supabase/migrations/0001_consolidated_schema.sql. Deliberately not
  // re-derived later, since claiming is freely reassignable now.
  const { data: myProfile } = await supabase
    .from("group_member_profiles")
    .select("id")
    .eq("group_id", itinerary.group_id)
    .eq("claimed_by_user_id", user.id)
    .maybeSingle();

  const { error } = await supabase.from("places").insert({
    itinerary_id: itineraryId,
    name,
    category: categoryRaw,
    address,
    latitude,
    longitude,
    google_place_id: googlePlaceId,
    rating,
    rating_count: ratingCount,
    rating_source: ratingSource,
    user_notes: userNotes,
    photo_refs: photoRefs,
    added_by: user.id,
    added_by_profile_id: myProfile?.id ?? null,
  });

  if (error) {
    throw toUserError("createPlace failed", error, "Couldn't add that stop — please try again.");
  }

  revalidatePath(`/groups/${itinerary.group_id}/itineraries/${itineraryId}`);
}

export async function updatePlaceNotes(formData: FormData) {
  const placeId = String(formData.get("placeId") ?? "");
  const itineraryId = String(formData.get("itineraryId") ?? "");
  const userNotes = String(formData.get("userNotes") ?? "").trim() || null;
  if (!placeId || !itineraryId) {
    throw new Error("Missing place");
  }
  if (userNotes && userNotes.length > PLACE_NOTES_MAX_LENGTH) {
    throw new Error(`Notes must be ${PLACE_NOTES_MAX_LENGTH} characters or fewer`);
  }

  const { supabase } = await requireUser();
  const itinerary = await requireItineraryMembership(supabase, itineraryId);

  const { error } = await supabase
    .from("places")
    .update({ user_notes: userNotes })
    .eq("id", placeId)
    .eq("itinerary_id", itineraryId);

  if (error) {
    throw toUserError("updatePlaceNotes failed", error, "Couldn't save those notes — please try again.");
  }

  revalidatePath(`/groups/${itinerary.group_id}/itineraries/${itineraryId}`);
}

export async function deletePlace(formData: FormData) {
  const placeId = String(formData.get("placeId") ?? "");
  const itineraryId = String(formData.get("itineraryId") ?? "");
  if (!placeId || !itineraryId) {
    throw new Error("Missing place");
  }

  const { supabase } = await requireUser();
  const itinerary = await requireItineraryMembership(supabase, itineraryId);

  const { error } = await supabase
    .from("places")
    .delete()
    .eq("id", placeId)
    .eq("itinerary_id", itineraryId);

  if (error) {
    throw toUserError("deletePlace failed", error, "Couldn't remove that stop — please try again.");
  }

  revalidatePath(`/groups/${itinerary.group_id}/itineraries/${itineraryId}`);
}
