/**
 * The image registry — the single source of truth for every decorative photo
 * in the app.
 *
 * WHY THIS FILE EXISTS
 *
 * No component may reference a path under /images directly. Everything goes
 * through here, which buys two things:
 *
 *   1. Swapping a photo is a file drop, not a code change. Replace the file in
 *      `public/images/` keeping the same name and the app picks it up. Only if
 *      the replacement has different pixel dimensions do you touch this file —
 *      and then it is two numbers, in one place.
 *   2. The `note` field on every entry says what the photo actually depicts and
 *      what the layout needs from it. That makes this file a complete shopping
 *      list: you can pick replacements without opening a single component.
 *
 * WHY STRING PATHS, NOT `import hero from "./hero.jpg"`
 *
 * Static imports would hand us `width`, `height` and a blur placeholder for
 * free, and they are still the wrong choice here. A static import is resolved
 * at build time, so a missing file is a hard build failure, and a replacement
 * of a different size silently invalidates the layout the old dimensions
 * implied. String paths degrade instead: a missing file is one broken image,
 * not a broken deploy. Given that the entire point of this registry is "the
 * owner swaps these later without touching code", failing the build on a file
 * swap would defeat it.
 *
 * The cost is that `width`/`height`/`blurDataURL` are maintained by hand. That
 * is the trade, and it is why they sit next to the `note` that explains them.
 *
 * WHY IT LIVES UNDER components/ AND NOT lib/
 *
 * `tailwind.config.ts` scans `./app/**` and `./components/**` only. Nothing in
 * this file emits Tailwind classes today, but its neighbours (`buttonStyles`,
 * `pillStyles`) do, and a class string that lands in `lib/` is silently purged
 * — the build passes and the element renders unstyled. Keeping every style-
 * adjacent helper on the scanned side of that line removes the trap entirely.
 */

export interface ImageAsset {
  /**
   * Stable identifier, deliberately independent of the filename.
   *
   * A group that has chosen a cover stores `registry:<id>` in group_covers
   * (0007_group_covers.sql). That stored reference has to survive the one
   * operation this whole registry exists to make free — swapping the file
   * underneath. Keying a choice on `src` would tie it to an extension, so
   * replacing a .jpg with a .png would silently orphan every group that had
   * picked it. The id never changes; the file behind it can change daily.
   */
  id: string;
  /** Public path, e.g. "/images/hero-landing.jpg". */
  src: string;
  /** Intrinsic pixel width. Update if you swap in a differently-sized file. */
  width: number;
  /** Intrinsic pixel height. */
  height: number;
  /**
   * Alt text. Empty string for purely decorative imagery — these photos carry
   * no information the surrounding copy does not already state, so announcing
   * them would only add noise for a screen reader.
   */
  alt: string;
  /**
   * What this photo is, and what the layout needs from it. Read this before
   * choosing a replacement.
   */
  note: string;
  /** Attribution, when the source requires it. */
  credit?: string;
  /** Tiny inline placeholder shown while the real file decodes. */
  blurDataURL?: string;
}

/**
 * Landing page hero. This is the LCP element on `/` — it must be rendered with
 * `priority` so Next preloads it instead of lazy-loading the largest thing on
 * the page.
 */
export const HERO_LANDING: ImageAsset = {
  id: "hero-landing",
  // .png, not .jpg: the file WP-03 actually dropped in public/images/ is a
  // PNG (2400×1792), and the registry pointed at a .jpg that never existed —
  // a 404 on the LCP element. Swap in a real .jpg later and this reverts to
  // matching the rest of the registry; nothing else changes.
  src: "/images/hero-landing.png",
  width: 2400,
  height: 1792,
  alt: "",
  note: "Aerial dusk view of an empty coastal road winding through dark hills, violet and slate-blue evening light. 4:3. The headline sits over the upper-left, so that region must stay dark, soft and free of detail — a replacement with a bright sky or a horizon line running through that corner will make the headline unreadable.",
  credit: "Generated with Higgsfield (nano-banana)",
};

/**
 * The vertical panel beside the form on `/login`, reused on `/join/[token]`.
 * One file, two surfaces — deliberately, so the two entry points into the app
 * feel like the same place.
 */
export const LOGIN_SIDE: ImageAsset = {
  id: "login-side",
  // This entry pointed at a file that was never on disk — a 404 on the image
  // pane of both /login and /join/[token], the latter being the single most
  // common first touch anyone has with this app. e64dad0 fixed the same class
  // of bug for HERO_LANDING and COVERS by repointing at the PNGs that did
  // exist; this one had no file in any extension, so it stayed broken. Now
  // there is a real file.
  src: "/images/login-side.jpg",
  // 900x1200, not the 1200x1600 this entry used to claim. The pane's true
  // maximum render width is ~424px (max-w-4xl, minus page padding, halved by
  // sm:grid-cols-2) and 320px on /join, so 1200px of source was ~3x more than
  // any display would ever ask for and cost 689KB to sit in git for it.
  width: 900,
  height: 1200,
  alt: "",
  note: "Footbridge running into dense temperate forest, even shade, deep greens and slate blue rails. 3:4 vertical. Sits next to a form, so what it needs is even lighting and no bright hotspot to pull the eye off the email field — this has neither a sky nor a sun in frame, which is the whole brief. Reads cooler and greener than the violet/slate of the generated set it replaced.",
  credit:
    "Unsplash, images.unsplash.com/photo-1447752875215-b2761acb3c5d. Unsplash License: free for commercial use, attribution not required.",
};

/**
 * Card covers for groups and trips, assigned by `coverFor()`.
 *
 * Three is enough for the list to stop looking like a stack of identical
 * boxes, which is the entire job here. Adding a fourth is appending one entry
 * and dropping one file — `coverFor` picks up the new length automatically.
 */
export const COVERS: readonly ImageAsset[] = [
  // cover-01-desert had no file on disk at all — no .jpg, no .png, nothing
  // to point at even with the wrong extension — so it is dropped rather than
  // left as a dead reference. coverFor() hashes mod COVERS.length, computed
  // fresh from this array; nothing else in the app assumes a count.
  //
  // cover-02-ocean is gone too, for a different reason: the only file behind
  // it was an 8.7MB PNG, and with no image tooling on this machine there was
  // no way to downscale it in place. Replacing it with correctly-sized JPEGs
  // was cheaper than keeping it. Anything below sourced from Unsplash was
  // fetched pre-cropped at these exact dimensions via the CDN's own resize
  // parameters, which is why they land in the 180-270KB range rather than
  // the multi-megabyte range the generated PNGs did.
  //
  // NOTE ON PALETTE: the generated set was violet and slate, dusk and blue
  // hour, deliberately desaturated. The Unsplash entries below are cooler
  // and greener, and cover-06-highland is frankly a daylight photograph.
  // They are honest about that in their notes rather than pretending
  // otherwise. Swapping any of them is a file drop plus two numbers here.
  {
    src: "/images/cover-03-forest.jpg",
    id: "cover-03-forest",
    width: 1600,
    height: 900,
    alt: "",
    note: "Aerial forest canopy at blue hour with low mist between the trees, slate green and violet shadow. 16:9. The most textural of the set and the one that reads best behind a long title.",
    credit: "Generated with Higgsfield (nano-banana)",
  },
  {
    id: "cover-04-dusk-peaks",
    src: "/images/cover-04-dusk-peaks.jpg",
    width: 1600,
    height: 900,
    alt: "",
    note: "Snow-capped peaks standing above a full valley of cloud at dusk, pink and violet sky grading to slate. 16:9. The closest match in this set to the original Nocturne direction. The lower third is dark rock and cloud, so the title band sits over quiet ground at any card height.",
    credit:
      "Unsplash, images.unsplash.com/photo-1506905925346-21bda4d32df4. Unsplash License: free for commercial use, attribution not required.",
  },
  {
    id: "cover-05-misty-ridges",
    src: "/images/cover-05-misty-ridges.jpg",
    width: 1600,
    height: 900,
    alt: "",
    note: "Receding forested ridges in low golden haze, with a single tiny figure standing on a rock outcrop at right. 16:9. Warmer and greener than the rest of the set. The figure is the one focal subject in any cover here — small enough not to fight a title, but it is there.",
    credit:
      "Unsplash, images.unsplash.com/photo-1469474968028-56623f02e42e. Unsplash License: free for commercial use, attribution not required.",
  },
  {
    id: "cover-06-highland",
    src: "/images/cover-06-highland.jpg",
    width: 1600,
    height: 900,
    alt: "",
    note: "Green highland escarpment with cloud spilling over the ridge and a road threading the valley, sun breaking through upper right. 16:9. The brightest and least on-palette of the set — a daylight photograph, not a dusk one. It works here only because the title sits in a solid bg-inverse band rather than directly on the photo; do not reuse it anywhere text lands on the image itself.",
    credit:
      "Unsplash, images.unsplash.com/photo-1470071459604-3b5ec3a7fe05. Unsplash License: free for commercial use, attribution not required.",
  },
];

/**
 * Pick a stable cover for a group or trip id.
 *
 * MUST be deterministic. `Math.random()` here would be a hydration mismatch by
 * construction: the server renders one cover into the HTML, the browser picks a
 * different one on hydration, and React throws. This repo has already spent two
 * phases hunting exactly one such bug, so the rule is worth stating rather than
 * assuming.
 *
 * A char-code sum is enough — the only property required is that the same id
 * always maps to the same cover, on both sides of the network.
 */
export function coverFor(id: string): ImageAsset {
  let hash = 0;
  for (let i = 0; i < id.length; i++) {
    hash = (hash + id.charCodeAt(i)) % COVERS.length;
  }
  return COVERS[hash];
}

/**
 * Resolve a registry id back to its asset, for a group that has chosen one.
 *
 * Returns undefined rather than throwing when the id is unknown, and callers
 * are expected to fall back to `coverFor(groupId)`. That is not defensive
 * padding — it is the documented consequence of the swap procedure. Retiring
 * a photo means deleting its entry here, and any group that had chosen it
 * still holds `registry:<that id>` in the database. Throwing would take the
 * groups list down for those users; degrading returns them to the same
 * deterministic cover they had before they ever chose one.
 */
export function coverById(id: string): ImageAsset | undefined {
  return COVERS.find((c) => c.id === id);
}
