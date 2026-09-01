/**
 * Supabase Storage host for next/image.
 *
 * Uploaded group covers are the first user-supplied image in this app big
 * enough to need optimising. Avatars deliberately skip next/image and render
 * as a plain <img> (see components/groups/AvatarCircle.tsx) — at 36px that is
 * the right call and it kept this config empty. A cover is a full-width 16:9
 * banner, several of them stack on the groups list, and the bucket admits
 * files up to 2MB, so shipping the original bytes to a phone would recreate
 * exactly the problem that deleting the 8.7MB PNG just solved.
 *
 * Pinned to this project's own hostname rather than a `*.supabase.co`
 * wildcard. remotePatterns is not merely an allow-list for rendering: it
 * decides which origins /_next/image will fetch on the server's behalf, so a
 * wildcard would turn the optimiser into a fetch proxy for every Supabase
 * project in existence.
 *
 * Falls back to no remote patterns when the var is unset — a build without
 * Supabase configured has nothing to point at, and an empty list fails
 * closed.
 */
const supabaseHost = (() => {
  const url = process.env.NEXT_PUBLIC_SUPABASE_URL;
  if (!url) return null;
  try {
    return new URL(url).hostname;
  } catch {
    // A malformed URL is the env's problem to report, not this file's —
    // lib/env/client.ts throws a useful message on it at runtime. Here it
    // just means no remote pattern.
    return null;
  }
})();

/** @type {import('next').NextConfig} */
const nextConfig = {
  reactStrictMode: true,
  images: {
    remotePatterns: supabaseHost
      ? [
          {
            protocol: "https",
            hostname: supabaseHost,
            // Scoped to the one public bucket that holds covers. The avatars
            // bucket is not listed: nothing renders it through next/image,
            // and widening this to all of /storage/v1/object/public/ would
            // grant the optimiser more than this feature needs.
            pathname: "/storage/v1/object/public/group-covers/**",
          },
        ]
      : [],
  },
};

export default nextConfig;
