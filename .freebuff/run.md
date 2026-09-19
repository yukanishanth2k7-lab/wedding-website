# Run doc — wedding website (Vite + React + R3F)

## Reproduce artifacts (fresh checkout)

1. Install dependencies with npm (project uses `package-lock.json`):
   ```bash
   npm install
   ```
2. No `.env` files are used by this project (no env vars in `vite.config.ts` or scripts), so nothing to copy from the main checkout. Fonts load from Google Fonts at runtime; 3D textures load from Unsplash at runtime — internet access needed for full visuals, but the app builds and serves without it.

## Run the dev server

```bash
npm run dev -- --port 5175 --strictPort
```

- Default Vite port is 5173; in this workspace it (and 5174) may already be occupied by other running threads/servers, so pin **5175** with `--strictPort`.
- Build check (optional): `npm run build` (runs `tsc -b && vite build`), lint: `npm run lint`.
