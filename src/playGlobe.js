// Play-skin globe surface and first-load policy.
//
// This fork is shown inside AlsDitDan /globe. A missing Google or FIRMS key
// must still produce a visible, draggable earth — never a white void, and
// never a full-screen loader that eats the first drag.

/** Environmental default. Do not start from Contacts (military bundle). */
export const PLAY_DEFAULT_MISSION = 'environmental';

/** Layers the play first-load may enable. FIRMS is honest when keyless. */
export const PLAY_DEFAULT_LAYER_IDS = Object.freeze(['earthquakes', 'local-firms']);

/**
 * Systems that must not auto-start on play. Registering a layer is fine;
 * enabling / voice-connecting is not.
 */
export const PLAY_DEFERRED_LAYER_IDS = Object.freeze([
  'cctv',
  'ais-live-vessels',
  'radio',
  'military',
  'military-installations',
  'military-awareness',
]);

/** Ocean fill so the ellipsoid is an earth before the first OSM tile lands. */
export const PLAY_EARTH_BASE_COLOR = '#1a4a7a';

export const PLAY_OSM_CREDIT = '© OpenStreetMap contributors';

export const PLAY_OSM_TILE_URL = 'https://tile.openstreetmap.org/';

/** Full-earth framing. The earth is the thing you drag — not Austin close-up. */
export const PLAY_GLOBE_CAMERA = Object.freeze({
  longitude: 10,
  latitude: 20,
  heightM: 18_000_000,
  pitchDeg: -90,
});

const GOOGLE_KEY_PLACEHOLDERS = new Set(['', 'undefined', 'null', 'your_key_here']);

/**
 * A key that would actually let createGooglePhotorealistic3DTileset succeed.
 * Empty, whitespace, and common define-fallthroughs are not usable.
 * @param {unknown} key
 * @returns {boolean}
 */
export function hasUsableGoogleKey(key) {
  const trimmed = String(key ?? '').trim();
  if (!trimmed) return false;
  return !GOOGLE_KEY_PLACEHOLDERS.has(trimmed.toLowerCase());
}

/**
 * Decide the first-paint globe surface.
 *
 * Photoreal hides the ellipsoid (`globe.show = false`) because Google 3D
 * tiles carry their own surface. Without a live tileset that pair — hidden
 * globe + `baseLayer: false` — is a white void. Keyless and failed-tileset
 * boots must therefore keep the globe shown and attach OSM (or a default
 * Cesium imagery layer) immediately.
 *
 * @param {{ googleApiKey?: unknown, tileset?: unknown }} [input]
 * @returns {{
 *   showGlobe: boolean,
 *   hideGlobe: boolean,
 *   imagery: 'osm' | 'photoreal' | 'none',
 *   initialStack: 'osm' | 'photoreal',
 *   attachOsmImagery: boolean,
 *   baseColorCss: string | null,
 * }}
 */
export function resolvePlayGlobeSurface({ googleApiKey, tileset } = {}) {
  const hasPhotoreal = hasUsableGoogleKey(googleApiKey) && Boolean(tileset);
  if (hasPhotoreal) {
    return {
      showGlobe: false,
      hideGlobe: true,
      imagery: 'photoreal',
      initialStack: 'photoreal',
      attachOsmImagery: false,
      baseColorCss: null,
    };
  }
  return {
    showGlobe: true,
    hideGlobe: false,
    imagery: 'osm',
    initialStack: 'osm',
    attachOsmImagery: true,
    baseColorCss: PLAY_EARTH_BASE_COLOR,
  };
}

/** Options for `new Cesium.OpenStreetMapImageryProvider(...)`. */
export function createOsmImageryOptions() {
  return {
    url: PLAY_OSM_TILE_URL,
    credit: PLAY_OSM_CREDIT,
  };
}

/**
 * Apply the resolved surface to a Cesium-like viewer. `toColor` converts the
 * CSS ocean fill; tests inject a stub so this module never imports Cesium.
 * @param {{ scene?: { globe?: { show?: boolean, baseColor?: unknown } } }} viewer
 * @param {ReturnType<typeof resolvePlayGlobeSurface>} surface
 * @param {{ toColor?: (css: string) => unknown }} [hooks]
 * @returns {ReturnType<typeof resolvePlayGlobeSurface>}
 */
export function applyPlayGlobeSurface(viewer, surface, { toColor } = {}) {
  const globe = viewer?.scene?.globe;
  if (!globe || !surface) return surface;
  globe.show = surface.showGlobe;
  if (surface.baseColorCss && typeof toColor === 'function') {
    globe.baseColor = toColor(surface.baseColorCss);
  }
  return surface;
}

/**
 * Drop the full-screen play loader so the earth can receive the first drag.
 * Safe to call more than once.
 * @param {{ classList?: { add: Function }, setAttribute?: Function } | null | undefined} loadingScreen
 * @returns {boolean} true when the node was hidden
 */
export function hidePlayLoader(loadingScreen) {
  if (!loadingScreen) return false;
  loadingScreen.classList?.add?.('hidden');
  loadingScreen.setAttribute?.('aria-hidden', 'true');
  return true;
}

/** Play first-load never opens a Realtime voice session. */
export function shouldInitVoiceOnPlayStart() {
  return false;
}

/**
 * Whether an enabled-id list is a legal play first-load (Environmental only).
 * Empty is also legal: durable defaults stay `[]` until first-run writes.
 * @param {Iterable<string>} [enabledIds]
 * @returns {boolean}
 */
export function playBootLayersAreSafe(enabledIds = []) {
  const enabled = [...enabledIds];
  if (enabled.some((id) => PLAY_DEFERRED_LAYER_IDS.includes(id))) return false;
  return enabled.every((id) => PLAY_DEFAULT_LAYER_IDS.includes(id));
}
