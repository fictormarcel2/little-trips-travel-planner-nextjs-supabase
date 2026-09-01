import type { Config } from "tailwindcss";

const config: Config = {
  darkMode: ["selector", '[data-theme="dark"]'],
  content: [
    "./app/**/*.{ts,tsx}",
    "./components/**/*.{ts,tsx}",
  ],
  theme: {
    extend: {
      colors: {
        // ── Semantic roles ────────────────────────────────────────────────
        // These read the channel-triple custom properties defined in
        // app/globals.css via rgb(var(--x) / <alpha-value>), which is what
        // makes Tailwind's opacity modifiers (bg-surface/80) actually work —
        // the old `var(--x)` form (x holding a hex string) silently produced
        // no background at all under an opacity modifier. Use these for
        // anything that carries a *role*; reach for the raw scales below
        // only for genuine one-offs.
        surface: {
          DEFAULT: "rgb(var(--surface) / <alpha-value>)",
          page: "rgb(var(--surface-page) / <alpha-value>)",
          elevated: "rgb(var(--surface-elevated) / <alpha-value>)",
          sunken: "rgb(var(--surface-sunken) / <alpha-value>)",
          hover: "rgb(var(--surface-hover) / <alpha-value>)",
        },
        // Line roles. `subtle`/`strong` are decorative-only; `input` is the
        // separate 3:1 token for control borders (.input-field,
        // .btn-secondary) — see the comment on those in globals.css.
        subtle: "rgb(var(--border-subtle) / <alpha-value>)",
        strong: "rgb(var(--border-strong) / <alpha-value>)",
        input: "rgb(var(--border-input) / <alpha-value>)",
        // Text roles, i.e. `text-primary` / `text-muted` / `text-on-accent`.
        primary: "rgb(var(--text-primary) / <alpha-value>)",
        secondary: "rgb(var(--text-secondary) / <alpha-value>)",
        muted: "rgb(var(--text-muted) / <alpha-value>)",
        placeholder: "rgb(var(--text-placeholder) / <alpha-value>)",
        "on-accent": "rgb(var(--text-on-accent) / <alpha-value>)",
        accent: {
          DEFAULT: "rgb(var(--accent) / <alpha-value>)",
          hover: "rgb(var(--accent-hover) / <alpha-value>)",
          fill: "rgb(var(--accent-fill) / <alpha-value>)",
          "fill-hover": "rgb(var(--accent-fill-hover) / <alpha-value>)",
          tint: "rgb(var(--accent-tint) / <alpha-value>)",
          "on-tint": "rgb(var(--accent-on-tint) / <alpha-value>)",
        },
        calm: {
          DEFAULT: "rgb(var(--calm) / <alpha-value>)",
          tint: "rgb(var(--calm-tint) / <alpha-value>)",
        },
        positive: {
          DEFAULT: "rgb(var(--positive) / <alpha-value>)",
          tint: "rgb(var(--positive-tint) / <alpha-value>)",
        },
        critical: {
          DEFAULT: "rgb(var(--critical) / <alpha-value>)",
          tint: "rgb(var(--critical-tint) / <alpha-value>)",
        },
        // Inverse ground — tooltip/overlay content that sits opposite the
        // page's own polarity (dark chip in light mode, and vice versa).
        inverse: "rgb(var(--inverse) / <alpha-value>)",
        "on-inverse": "rgb(var(--on-inverse) / <alpha-value>)",
        // Shadow tint, exposed as a color too (boxShadow below composes it
        // directly via var(--shadow-soft) etc., this is for any one-off use).
        shadow: "rgb(var(--shadow) / <alpha-value>)",

        // ── Raw scales — "Nocturne" ───────────────────────────────────────
        // Cool violet accent + neutral gray-violet scales, replacing the
        // warm terracotta/dustyrose/sage/cream/ink palette. Key NAMES are
        // unchanged on purpose: 22 raw-scale call sites across 11 files
        // (docs/redesign/06-redesign-spec.md §2.5) are being migrated to
        // semantic tokens one owning package at a time, in any order, and a
        // renamed key would render nothing at all for every site that
        // hasn't landed yet. Once every call site migrates (tracked in
        // §2.5), these keys stop mattering; WP-13 owns that cleanup.
        // Values below are no longer required to justify a specific
        // contrast ratio the way the semantic tokens above are — they're a
        // scale for one-off decoration, not a role — so treat them as
        // "close to the token family, not measured" (several 500–900 steps
        // intentionally line up with the surface/text/border token values
        // above; that's convenience, not a promise the other steps hold to
        // the same bar).
        dustyrose: {
          50: "#f7f7fa",
          100: "#ededf4",
          200: "#e0e0ea",
          300: "#c7c7d6",
          400: "#adadc2",
          500: "#8c8ca4",
          600: "#6a6a88",
          700: "#52526c",
          800: "#3a3a4e",
          900: "#26263a",
        },
        terracotta: {
          50: "#f5f3ff",
          100: "#ede9fe",
          200: "#ddd6fe",
          300: "#c4b5fd",
          400: "#a78bfa",
          500: "#8b5cf6",
          600: "#7c3aed",
          700: "#6d28d9",
          800: "#5b21b6",
          900: "#4c1d95",
        },
        sage: {
          50: "#ecfdf5",
          100: "#d1fae5",
          200: "#a7f3d0",
          300: "#6ee7b7",
          400: "#34d399",
          500: "#10b981",
          600: "#059669",
          700: "#0e7a55",
          800: "#065f46",
          900: "#064e3b",
        },
        cream: {
          50: "#ffffff",
          100: "#f7f7fa",
          200: "#f0f0f5",
          300: "#e4e4ed",
          400: "#d0d0de",
          500: "#b4b4c7",
          600: "#9494ac",
          700: "#6c6c86",
          800: "#46465c",
          900: "#26263a",
        },
        ink: {
          50: "#f2f2f7",
          100: "#e4e4ed",
          200: "#c4c4d4",
          300: "#9494ac",
          400: "#64647a",
          500: "#3f3f52",
          600: "#2a2a38",
          700: "#1c1c26",
          800: "#14141c",
          900: "#0b0b12",
          // Genuine near-black, one step past 900 — for headers/dark
          // surfaces that need real contrast weight.
          950: "#05050b",
        },
      },
      // Explicit type scale on a 1.25 (major third) ratio. Tailwind's own
      // sizes stay available because this sits in `extend`, but role-bearing
      // text should use these: `micro` is for badges and uppercase labels
      // only, and `body` (15px) is the new floor for anything meant to be
      // read rather than scanned.
      fontSize: {
        "display-xl": ["2.75rem", { lineHeight: "1.05" }],
        "display-lg": ["2.125rem", { lineHeight: "1.1" }],
        "display-md": ["1.625rem", { lineHeight: "1.2" }],
        title: ["1.25rem", { lineHeight: "1.3" }],
        "body-lg": ["1.0625rem", { lineHeight: "1.6" }],
        body: ["0.9375rem", { lineHeight: "1.6" }],
        label: ["0.8125rem", { lineHeight: "1.4" }],
        micro: ["0.75rem", { lineHeight: "1.4" }],
      },
      fontFamily: {
        // Product UI + product headings — both Inter now (see globals.css
        // .font-display for the weight/tracking split between them).
        display: ["var(--font-display)"],
        sans: ["var(--font-sans)"],
        // Marketing routes only (`/`, `/login`, `/join`) — Fraunces, kept.
        // Backs .font-marketing in globals.css. app/layout.tsx (not owned by
        // this package) needs to set --font-marketing for this to resolve to
        // anything other than the browser's serif fallback.
        marketing: ["var(--font-marketing)"],
      },
      boxShadow: {
        // Composed in globals.css as var(--shadow-soft) etc. so each theme
        // can raise the alpha without duplicating the multi-layer shadow
        // syntax here — dark surfaces need roughly 4x the alpha of light for
        // the same shadow to read at all (see the [data-theme="dark"] block).
        soft: "var(--shadow-soft)",
        "soft-lg": "var(--shadow-soft-lg)",
        // A more decisive "lifted" shadow for hover/active states, distinct
        // from the resting soft/soft-lg shadows.
        elevated: "var(--shadow-elevated)",
      },
      borderRadius: {
        xl2: "1.25rem",
      },
      backgroundImage: {
        // Keeps its name (redesign rule R2 applies to utility identifiers
        // callers already depend on, same spirit as token names) — only the
        // stops became token-driven, so it re-tints per theme from this one
        // definition instead of needing a dark-mode override.
        "warm-gradient": "linear-gradient(135deg, rgb(var(--surface-page)) 0%, rgb(var(--surface-sunken)) 100%)",
        shimmer: "linear-gradient(90deg, transparent, var(--shimmer-sweep), transparent)",
      },
      // Motion vocabulary. The values live as custom properties in
      // app/globals.css so the curve and the three durations are stated once;
      // these keys only expose them as `ease-entrance` and
      // `duration-fast|base|slow`. Tailwind's own `duration-150`/`ease-out`
      // stay available, but anything carrying intent should use these.
      transitionTimingFunction: {
        entrance: "var(--ease-entrance)",
      },
      transitionDuration: {
        fast: "var(--motion-fast)",
        base: "var(--motion-base)",
        slow: "var(--motion-slow)",
      },
      keyframes: {
        "fade-in": {
          "0%": { opacity: "0" },
          "100%": { opacity: "1" },
        },
        // The one entrance in the app. transform + opacity only, so it
        // composites without touching layout; 8px is a nudge, not an
        // entrance from off-screen.
        "rise-in": {
          from: { opacity: "0", transform: "translateY(8px)" },
          to: { opacity: "1", transform: "translateY(0)" },
        },
        shimmer: {
          "0%": { transform: "translateX(-100%)" },
          "100%": { transform: "translateX(100%)" },
        },
      },
      animation: {
        "fade-in": "fade-in 0.4s ease-out",
        // `both` is load-bearing: components/ui/Reveal.tsx staggers these
        // with an inline animation-delay, and without backwards fill the
        // element would flash at full opacity before its delay elapsed.
        // The reduced-motion block in globals.css neutralizes both the
        // duration and the delay.
        "rise-in": "rise-in var(--motion-base) var(--ease-entrance) both",
        shimmer: "shimmer 1.6s ease-in-out infinite",
      },
    },
  },
  plugins: [],
};

export default config;
