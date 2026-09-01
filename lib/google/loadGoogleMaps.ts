import { setOptions, importLibrary } from "@googlemaps/js-api-loader";
import { clientEnv } from "@/lib/env/client";

// Client-only. NEXT_PUBLIC_GOOGLE_MAPS_API_KEY is inherently exposed to the
// browser (the Maps JS API has no server-side proxy mode) — it must be
// locked down with HTTP referrer restrictions in Google Cloud Console
// rather than kept secret. See CLAUDE.md for the exact steps.
let optionsSet = false;

function ensureOptionsSet() {
  if (optionsSet) return;
  setOptions({ key: clientEnv.googleMapsApiKey, v: "weekly" });
  optionsSet = true;
}

export async function loadPlacesLibrary() {
  ensureOptionsSet();
  return importLibrary("places");
}
