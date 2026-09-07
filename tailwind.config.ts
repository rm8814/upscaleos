import type { Config } from "tailwindcss";

/**
 * Tailwind is a thin alias layer over the vendored design system.
 * Every value points at a CSS custom property defined in
 * src/styles/upscale-tokens.css — that file is the source of truth.
 */
const config: Config = {
  content: ["./src/**/*.{js,ts,jsx,tsx,mdx}"],
  theme: {
    extend: {
      colors: {
        // Backgrounds / ink-blue ramp
        ink: "var(--bg-ink)",
        deep: "var(--bg-deep)",
        elevated: "var(--bg-elevated)",
        deepest: "var(--bg-deepest)",
        border: "var(--bg-border)",

        // Hairlines
        line: "var(--line)",
        "line-soft": "var(--line-soft)",
        "line-strong": "var(--line-strong)",

        // Accents
        "accent-violet": "var(--accent-violet)",
        "accent-violet-hi": "var(--accent-violet-hi)",
        "accent-cyan": "var(--accent-cyan)",

        // Foreground
        ice: "var(--fg-ice)",
        "fg-1": "var(--fg-1)",
        "fg-2": "var(--fg-2)",
        "fg-3": "var(--fg-3)",
        "fg-4": "var(--fg-4)",
        "fg-on-accent": "var(--fg-on-accent)",

        // Semantic
        positive: "var(--positive)",
        negative: "var(--negative)",
        warning: "var(--warning)",
        info: "var(--info)",

        // Washes
        "violet-wash": "var(--violet-wash)",
        "cyan-wash": "var(--cyan-wash)",

        // Room status (housekeeping board, tape chart)
        "room-vacant-clean": "var(--room-vacant-clean)",
        "room-vacant-dirty": "var(--room-vacant-dirty)",
        "room-occupied": "var(--room-occupied)",
        "room-inspected": "var(--room-inspected)",
        "room-ooo": "var(--room-ooo)",
        "room-oos": "var(--room-oos)",

        // Reservation status
        "res-tentative": "var(--res-tentative)",
        "res-confirmed": "var(--res-confirmed)",
        "res-inhouse": "var(--res-inhouse)",
        "res-departed": "var(--res-departed)",
        "res-cancelled": "var(--res-cancelled)",

        // AI surface
        "ai-tint": "var(--ai-tint)",
        "ai-edge": "var(--ai-edge)",
        "ai-fg": "var(--ai-fg)",
      },
      fontFamily: {
        display: "var(--font-display)",
        body: "var(--font-body)",
        mono: "var(--font-mono)",
        brand: "var(--font-brand)",
      },
      fontSize: {
        "12": "var(--fs-12)",
        "13": "var(--fs-13)",
        "14": "var(--fs-14)",
        "16": "var(--fs-16)",
        "18": "var(--fs-18)",
        "22": "var(--fs-22)",
        "28": "var(--fs-28)",
        "36": "var(--fs-36)",
        "48": "var(--fs-48)",
        "64": "var(--fs-64)",
      },
      letterSpacing: {
        display: "var(--ls-display)",
        tight: "var(--ls-tight)",
        wide: "var(--ls-wide)",
        eyebrow: "var(--ls-eyebrow)",
      },
      borderRadius: {
        xs: "var(--r-xs)",
        sm: "var(--r-sm)",
        md: "var(--r-md)",
        lg: "var(--r-lg)",
        xl: "var(--r-xl)",
        "2xl": "var(--r-2xl)",
        pill: "var(--r-pill)",
      },
      boxShadow: {
        1: "var(--shadow-1)",
        2: "var(--shadow-2)",
        3: "var(--shadow-3)",
        "glow-violet": "var(--glow-violet)",
        "glow-cyan": "var(--glow-cyan)",
        ai: "var(--ai-glow)",
      },
      transitionTimingFunction: {
        out: "var(--ease-out)",
        "in": "var(--ease-in)",
        spring: "var(--ease-spring)",
      },
      transitionDuration: {
        fast: "140ms",
        base: "220ms",
        slow: "420ms",
      },
      maxWidth: {
        content: "1280px",
      },
    },
  },
  plugins: [],
};
export default config;
