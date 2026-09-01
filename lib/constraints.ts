// Single source of truth for text-field length limits — each constant here
// must match a CHECK constraint in the migration that introduced its column
// exactly (0003_prelaunch_hardening.sql for the first six; see each new
// migration's own CHECK for constants added later). Used both server-side
// (validation before insert/update) and client-side (maxLength on the
// corresponding input/textarea), so a limit only ever needs updating in one
// place. No "use server"/"server-only" guard: these are plain numbers, safe
// in either bundle.
export const GROUP_NAME_MAX_LENGTH = 100;
export const ITINERARY_TITLE_MAX_LENGTH = 100;
export const PLACE_NAME_MAX_LENGTH = 200;
export const PLACE_ADDRESS_MAX_LENGTH = 500;
export const PLACE_NOTES_MAX_LENGTH = 2000;
export const DISPLAY_NAME_MAX_LENGTH = 100;
export const ITINERARY_LOCATION_MAX_LENGTH = 200;
export const MEMBER_OTHER_PREFERENCES_MAX_LENGTH = 500;
