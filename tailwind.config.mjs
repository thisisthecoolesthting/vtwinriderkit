import typography from '@tailwindcss/typography';

/** @type {import('tailwindcss').Config} */
export default {
  content: ["./src/**/*.{astro,html,js,jsx,md,mdx,ts,tsx,svelte,vue}"],
  theme: {
    extend: {
      colors: {
        cream: {
          50: "#FAFAF9",
          100: "#0C0A09",
          200: "#E7E5E4",
        },
        terracotta: {
          400: "#FB923C",
          500: "#1C1917",
          600: "#0C0A09",
        },
        primary: { DEFAULT: "#1C1917" },
        accent: { DEFAULT: "#EA580C" },
        sage: { 400: "#8FA888", 500: "#6F8B6A", 600: "#566F52" },
        rose: { deep: "#FAFAF9" },
        ink: {
          900: "#FAFAF9",
          700: "#4A4340",
          500: "#6E6863",
        },
      },
      maxWidth: {
        prose: "68ch",
      },
      typography: {
        DEFAULT: { css: { maxWidth: "68ch" } },
        ink: { css: { color: "#4A4340" } },
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
