import Image from "next/image";
import { LoginForm } from "@/components/auth/LoginForm";
import { BrandTag } from "@/components/ui/BrandTag";
import { Surface } from "@/components/ui/Surface";
import { LOGIN_SIDE } from "@/components/ui/images";

export default function LoginPage({
  searchParams,
}: {
  searchParams: { next?: string; error?: string };
}) {
  const redirectTo = searchParams.next ?? "/groups";

  return (
    // Same compositional grammar as `/`: brand tag, left-aligned display
    // heading, content offset off the headline's edge. Here the offset is the
    // form column dropping below the heading's baseline (md:mt-14) instead of
    // an indent, so the two Persuade surfaces rhyme without repeating.
    <main className="mx-auto flex min-h-screen w-full max-w-4xl flex-col justify-center px-6 py-20">
      <div className="md:grid md:grid-cols-12 md:items-start md:gap-10">
        <div className="min-w-0 md:col-span-5">
          <BrandTag />
          <h1 className="mt-7 font-marketing text-display-lg italic text-primary">
            Log in with a magic link
          </h1>
          <p className="mt-4 text-body-lg text-secondary">
            No password to remember. We email you a link, you tap it, you&apos;re in.
          </p>
        </div>

        <div className="mt-10 min-w-0 md:col-span-7 md:mt-14">
          {searchParams.error === "auth" && (
            <div className="mb-5 rounded-xl bg-critical-tint px-4 py-3 text-body text-critical">
              That link didn&apos;t work — it may have expired, already been
              used, or been opened in a different browser than the one you
              requested it from. Send yourself a new one below.
            </div>
          )}
          {/* Split card: LOGIN_SIDE beside the form, reused verbatim on
              /join/[token] (JoinAsGuest) so the two entry points into the app
              feel like the same place. Image pane hides below sm — the same
              360px-first rule as everywhere else here. */}
          <Surface elevation="floating" padding="none" className="overflow-hidden">
            <div className="grid sm:grid-cols-2">
              <div className="relative hidden min-h-[220px] min-w-0 sm:block">
                <Image
                  src={LOGIN_SIDE.src}
                  alt={LOGIN_SIDE.alt}
                  fill
                  sizes="(min-width: 640px) 424px, 0px"
                  className="object-cover"
                />
                <div className="absolute inset-0 bg-surface-page/20" />
              </div>
              {/* Padding steps down on mobile: Surface's `lg` (p-8) leaves a
                  248px-wide control inside a 360px viewport, which is
                  tighter than this form has any reason to be. */}
              <div className="min-w-0 p-6 sm:p-8">
                <LoginForm redirectTo={redirectTo} />
              </div>
            </div>
          </Surface>
        </div>
      </div>
    </main>
  );
}
