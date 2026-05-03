/**
 * PostCSS configuration for Tailwind v4.
 *
 * Tailwind v4 ships its own PostCSS plugin (`@tailwindcss/postcss`).
 * No autoprefixer entry — Tailwind v4 includes browser-prefix handling
 * in its preflight + utility output.
 */
const config = {
  plugins: {
    "@tailwindcss/postcss": {},
  },
};

export default config;
