import { loadPlacesLibrary } from "@/lib/google/loadGoogleMaps";
import type { PlacePhotoRef } from "@/types/place";

const MAX_PHOTOS = 3;
const PHOTO_MAX_WIDTH = 800;
const PHOTO_MAX_HEIGHT = 600;

// Uses the current Place class (Place.fetchFields), not the legacy
// PlacesService/Autocomplete.getPlace().photos path — that legacy surface
// was restricted for new Google Cloud API keys as of March 2025. See
// CLAUDE.md for the full reasoning and the attribution requirement this
// feeds into.
export async function fetchPlacePhotos(placeId: string): Promise<PlacePhotoRef[]> {
  const places = await loadPlacesLibrary();
  const place = new places.Place({ id: placeId });
  const { place: fetched } = await place.fetchFields({ fields: ["photos"] });

  const photos = fetched.photos ?? [];
  return photos.slice(0, MAX_PHOTOS).map((photo) => {
    const author = photo.authorAttributions?.[0];
    return {
      url: photo.getURI({ maxWidth: PHOTO_MAX_WIDTH, maxHeight: PHOTO_MAX_HEIGHT }),
      attributionText: author?.displayName ?? "Google",
      attributionUri: author?.uri ?? null,
    };
  });
}
