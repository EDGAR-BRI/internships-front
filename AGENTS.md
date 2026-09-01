# AGENTS.md

Astro 6 SSR + Vue 3 + Tailwind v4 PWA. Full repo guidance lives in `../AGENTS.md` — read it first.

- Dev: `pnpm dev` (= `astro dev --host`, port 5173). There is no `astro dev --background` flag in this Astro version; run in a background terminal instead.
- `pnpm typecheck` runs `astro check` (not `tsc`). Lint: `pnpm lint`.
- Node 24 required (`.nvmrc`); `astro.config.mjs` uses `@astrojs/vercel` and `@tailwindcss/vite` plugins.
- `PUBLIC_API_URL` must include the `/api/v1` prefix (see `../AGENTS.md`).
- Pages: Astro routes in `src/pages/` (login/register are plain `.astro`); all in-app UI is Vue in `src/components/`; state in `src/stores/` with logic wrappers in `src/composables/`.
- All HTTP via `src/lib/api.ts` (offline writes queued in `src/lib/syncQueue.ts`); exports live in `src/utils/` (docx via jszip, markdown).