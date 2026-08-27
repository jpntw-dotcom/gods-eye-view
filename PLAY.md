# PLAY.md — AlsDitDan first play skin

JP’s fork of [bilawalsidhu/gods-eye-view](https://github.com/bilawalsidhu/gods-eye-view). This is a testing ground, not the product desk. The point of the experiment is how easy GEV is to configure. Copyright remains MIT © Bilawal Sidhu.

We did **not** rewrite the cockpit. Live flights stay on the toggle panel. Military flights, CCTV, mapped military installations stay off. TeleGeography cables are gone.

## What we changed

| Area | What happened |
|---|---|
| Default layers | Fresh boot still has `enabledLayerIds: []` in `createDefaultLayerState()`. Environmental is auto-run from first-run init: `earthquakes` + `local-firms`. FIRMS is honest (`KEY REQUIRED`) when no `FIRMS_MAP_KEY`. We never call `setContextMode('contacts')`. |
| Cables | Stopped registering `submarineCablesLayer`. Dropped `src/data/local_data/telegeography_submarine_cables/` (CC BY-NC-SA 3.0, not for commercial). Removed the `u` token from `LAYER_STATE_REGISTRY`. |
| Dutch chrome | Title, subtitle, and first-run copy only. Hidden CONTACTS / SPACE MISSIONS / GEV MIC / CCTV. Not an i18n sweep. |
| Colors | `:root` `--bg-dark: #0a0b0d` and `--accent: #8fb8c2`. Hidden `#intel-hud`. HUD JS forced off so CRT/NVG never paints TOP SECRET. Did not restyle 247KB of `style.css`. |
| Iframe | `Content-Security-Policy: frame-ancestors` allowlist for `https://alsditdan.com`, `http://localhost:4720`, and localhost Vite ports. No `X-Frame-Options` (see below). |

## Easy / medium / hard

### (a) Default layers — **easy**, with one medium lockstep

**Files:** `src/firstRunExperience.js`, `src/data/layerState.js`, `src/data/localLayers.js`

The Environmental mission already existed (`FIRST_RUN_MISSIONS.environmental.layerIds = ['earthquakes', 'local-firms']`) and already persisted like a toggle click (`origin: 'user'`). Auto-running it and skipping the card was a small init change. Fresh-boot durable state stays `[]` — defaults are not in `createDefaultLayerState()`, they are first-run.

**Do not start from Contacts.** That path is `setContextMode('contacts')` and lights military flights + OSM military sites. We never call it.

Dropping cables was **medium**: `finalizeRegistrations()` requires an exact match between registered modules and `LAYER_STATE_REGISTRY`. Unregistering without dropping the `u` token throws at boot. Scene test `REGISTERED` lists had to stay in step.

The JS module `src/data/telegeographySubmarineCables.js` is still in the tree (and its unit tests still run against fixtures). It is not registered, so the globe never loads the NC dataset.

### (b) Dutch chrome — **medium**

**Files:** `index.html`, `style.css` (hide rules only)

There is no i18n layer. Strings are hardcoded in `index.html` and a lot of JS. We translated title / subtitle / first-run only (`lang="nl"`, “AlsDitDan · geen plek blijft verborgen”, first-run “Omgeving”). The rest of the cockpit is still English.

Hiding unused chrome is easy if you know the ids (`#global-context-flights-btn`, `#global-context-missions-btn`, `#gev-voice-control`, `#cctv-panel`). GEV MIC is injected at runtime into `#command-dock`, so CSS on `#gev-voice-control` is the hook — it is not in the static HTML.

A full Dutch cockpit would be **hard**.

### (c) Colors — **easy** for two tokens; **hard** to paint the rest

**Files:** `style.css` (`:root` only), `src/hud.js`

`:root` has `--bg-dark` and `--accent`. Those two lines are the cheap AlsDitDan taste. `--accent-dim` / `--accent-glow` and `--cockpit-accent` are still the old cyan. Hundreds of hardcoded `#00d4ff` / `rgba(0, 212, 255, …)` values are not tokens. We did not restyle `style.css`.

`#intel-hud` is `display: none !important`. `IntelHUD` starts with `_autoMode = false` and `show()` / `setMode()` force hide, so CRT/NVG cannot paint TOP SECRET banners.

### (d) Iframe host — **easy**, with one XFO caveat

**Files:** `vite.config.js` (`server.headers`, `preview.headers`)

The repo set none. Vite `server.headers` / `preview.headers` is the hook for this checkout. Allowlist:

`frame-ancestors 'self' https://alsditdan.com http://localhost:4720 http://127.0.0.1:4720` plus localhost Vite ports (`4173`, `5173`).

**`X-Frame-Options` cannot express this allowlist.** It only supports `DENY`, `SAMEORIGIN`, or obsolete single-origin `ALLOW-FROM`. `SAMEORIGIN` would block AlsDitDan framing GEV. CSP `frame-ancestors` is the clickjacking control. Production static hosting must send the same CSP header; a meta tag is ignored for `frame-ancestors`.

## Boot without paid keys

A missing `GOOGLE_MAPS_API_KEY` must still paint a draggable earth. The Viewer used to start with `baseLayer: false` and `globe.show = false` (the photoreal path). Without a tileset that pair is a white void.

`src/playGlobe.js` decides the surface: no usable Google key or no live tileset → show the globe, attach OSM immediately, fill the ellipsoid with an ocean color so the first frame is an earth even before tiles land. Photoreal may hide the ellipsoid only after Google 3D tiles are actually on the scene.

Play first-load yields the full-screen loader as soon as that earth exists, starts at full-globe camera (not Austin), skips the mission card, and does not boot voice / CCTV / AIS / military / radio. Environmental (`earthquakes` + `local-firms`) still auto-runs. FIRMS stays honest (`KEY REQUIRED`) when `FIRMS_MAP_KEY` is unset.

Do **not** add Google Maps, OpenAI, or FIRMS keys to git. Photoreal stays optional.

FIRMS: `/api/firms` is installed on both `configureServer` and `configurePreviewServer`. Live should be `vite build` + `npm start` (`vite preview` on `:4173`), not `npm run dev`. Keyless FIRMS is honest empty (`503 {error:'no_key'}`).

## Files touched

- `src/playGlobe.js` — keyless-earth surface + play first-load policy
- `src/playGlobe.test.mjs` — keyless-earth and play-default pins
- `src/firstRunExperience.js` — auto-run Environmental; skip the card unless `?welcome=1`
- `src/firstRunExperience.test.mjs` — play-skin pins
- `src/data/localLayers.js` — do not register cables
- `src/data/layerState.js` — drop `telegeography-submarine-cables` / token `u`
- `src/data/layerState.test.mjs` — registry size 15
- `src/data/dataCredits.js` — drop always-on TeleGeography credit
- `src/data/local_data/telegeography_submarine_cables/` — removed
- `src/scenes/scenePolicy.test.mjs`, `src/scenes/director.test.mjs` — registry lists
- `src/hud.js` — force HUD off
- `src/main.js` — OSM earth on first paint; loader yields before HUD; no Austin / voice
- `src/mapStackController.js` — drop constructor-seeded imagery when switching stacks
- `index.html` — Dutch title/subtitle/first-run; `play-skin` body
- `style.css` — two tokens + hide HUD/unused chrome; loader never eats drags
- `vite.config.js` — CSP `frame-ancestors`; FIRMS proxy on preview
- `package.json` — `npm start` = `vite preview` on `:4173`
- `LICENSE` — note that this fork removed the NC cable dataset
- `PLAY.md` — this file
