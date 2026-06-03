import typography from '@tailwindcss/typography';

/** @type {import('tailwindcss').Config} */
export default {
  content: ["./src/**/*.{astro,html,js,jsx,md,mdx,ts,tsx,svelte,vue}"],
  theme: {
    extend: {
      colors: {
        cream: {
          50: "#FAFAF9",
          100: "#F5F5F4",
          200: "#E7E5E4",
        },
        terracotta: {
          400: "#FB923C",
          500: "#EA580C",
          600: "#C2410C",
        },
        primary: { DEFAULT: "#1C1917" },
        accent: { DEFAULT: "#EA580C" },
        sage: { 400: "#8FA888", 500: "#6F8B6A", 600: "#566F52" },
        rose: { deep: "#9F3D2E" },
        ink: {
          900: "#1C1917",
          700: "#44403C",
          500: "#78716C",
        },
      },
      maxWidth: {
        prose: "68ch",
        site: "72rem",
      },
      typography: {
        DEFAULT: { css: { maxWidth: "68ch" } },
        ink: { css: { color: "#44403C" } },
      },
      fontFamily: {
        display: ["Oswald", "Georgia", "serif"],
        sans: ["Source Sans 3", "system-ui", "sans-serif"],
        body: ["Source Sans 3", "sans-serif"],
        mono: ["IBM Plex Mono", "monospace"],
      },
    },
  },
  plugins: [typography],
};
