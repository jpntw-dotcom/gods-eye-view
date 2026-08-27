import test from 'node:test';
import assert from 'node:assert/strict';
import fs from 'node:fs';
import { createDefaultLayerState } from './data/layerState.js';
import { FIRST_RUN_MISSIONS, PLAY_DEFAULT_MISSION as FIRST_RUN_PLAY_MISSION } from './firstRunExperience.js';
import {
  PLAY_DEFAULT_LAYER_IDS,
  PLAY_DEFAULT_MISSION,
  PLAY_DEFERRED_LAYER_IDS,
  PLAY_EARTH_BASE_COLOR,
  PLAY_GLOBE_CAMERA,
  PLAY_OSM_TILE_URL,
  applyPlayGlobeSurface,
  createOsmImageryOptions,
  hasUsableGoogleKey,
  hidePlayLoader,
  playBootLayersAreSafe,
  resolvePlayGlobeSurface,
  shouldInitVoiceOnPlayStart,
  playAllowPhotorealFromLocation,
} from './playGlobe.js';

test('keyless first paint is a shown OSM earth, never a hidden globe without imagery', () => {
  const keyless = resolvePlayGlobeSurface({ googleApiKey: '', tileset: null });
  assert.equal(keyless.showGlobe, true);
  assert.equal(keyless.hideGlobe, false);
  assert.equal(keyless.imagery, 'osm');
  assert.equal(keyless.initialStack, 'osm');
  assert.equal(keyless.attachOsmImagery, true);
  assert.equal(keyless.baseColorCss, PLAY_EARTH_BASE_COLOR);
  assert.notEqual(keyless.baseColorCss, '#ffffff');
  assert.notEqual(keyless.baseColorCss, '#fff');
});

test('blank, missing, and define-fallthrough Google keys are not usable', () => {
  for (const key of [undefined, null, '', '   ', 'undefined', 'null', 'your_key_here']) {
    assert.equal(hasUsableGoogleKey(key), false, `must reject ${JSON.stringify(key)}`);
    const surface = resolvePlayGlobeSurface({ googleApiKey: key, tileset: { fake: true } });
    assert.equal(surface.showGlobe, true, 'a fake tileset without a real key must not hide the globe');
    assert.equal(surface.attachOsmImagery, true);
    assert.equal(surface.initialStack, 'osm');
  }
});

test('photoreal may hide the ellipsoid only when explicitly allowed and a live tileset exists', () => {
  const ready = resolvePlayGlobeSurface({ googleApiKey: 'AIza-real', tileset: { id: 'tiles' }, allowPhotoreal: true });
  assert.equal(ready.showGlobe, false);
  assert.equal(ready.hideGlobe, true);
  assert.equal(ready.imagery, 'photoreal');
  assert.equal(ready.attachOsmImagery, false);
  assert.equal(ready.initialStack, 'photoreal');

  const keyedDefaultPlay = resolvePlayGlobeSurface({
    googleApiKey: 'AIza-reject-default-play',
    tileset: { id: 'tiles' },
  });
  assert.equal(keyedDefaultPlay.showGlobe, true);
  assert.equal(keyedDefaultPlay.attachOsmImagery, true);
  assert.equal(keyedDefaultPlay.initialStack, 'osm');

  const keyedButNoTiles = resolvePlayGlobeSurface({ googleApiKey: 'AIza-real', tileset: null, allowPhotoreal: true });
  assert.equal(keyedButNoTiles.showGlobe, true);
  assert.equal(keyedButNoTiles.attachOsmImagery, true);
  assert.equal(keyedButNoTiles.initialStack, 'osm');
});

test('applyPlayGlobeSurface never leaves globe.show false without photoreal', () => {
  const globe = { show: false, baseColor: '#ffffff' };
  const colors = [];
  const keyless = resolvePlayGlobeSurface({});
  applyPlayGlobeSurface({ scene: { globe } }, keyless, {
    toColor: (css) => {
      colors.push(css);
      return `color:${css}`;
    },
  });
  assert.equal(globe.show, true);
  assert.equal(globe.baseColor, `color:${PLAY_EARTH_BASE_COLOR}`);
  assert.deepEqual(colors, [PLAY_EARTH_BASE_COLOR]);

  const photoreal = resolvePlayGlobeSurface({ googleApiKey: 'AIza-real', tileset: {}, allowPhotoreal: true });
  applyPlayGlobeSurface({ scene: { globe } }, photoreal, { toColor: (css) => css });
  assert.equal(globe.show, false);
});

test('OSM imagery options point at the public tile endpoint, not a key', () => {
  const options = createOsmImageryOptions();
  assert.equal(options.url, PLAY_OSM_TILE_URL);
  assert.match(options.credit, /OpenStreetMap/);
  assert.doesNotMatch(JSON.stringify(options), /AIza|FIRMS_MAP_KEY|GOOGLE_MAPS/);
});

test('play first-load hides the loader so the earth can be dragged', () => {
  const classes = new Set();
  const attrs = {};
  const hidden = hidePlayLoader({
    classList: { add: (name) => classes.add(name) },
    setAttribute: (name, value) => { attrs[name] = value; },
  });
  assert.equal(hidden, true);
  assert.equal(classes.has('hidden'), true);
  assert.equal(attrs['aria-hidden'], 'true');
  assert.equal(hidePlayLoader(null), false);
});

test('play default is Environmental and never auto-starts the heavy bundle', () => {
  assert.equal(PLAY_DEFAULT_MISSION, 'environmental');
  assert.equal(FIRST_RUN_PLAY_MISSION, 'environmental');
  assert.deepEqual(PLAY_DEFAULT_LAYER_IDS, ['earthquakes', 'local-firms']);
  assert.deepEqual(FIRST_RUN_MISSIONS.environmental.layerIds, [...PLAY_DEFAULT_LAYER_IDS]);
  assert.equal(shouldInitVoiceOnPlayStart(), false);
  assert.deepEqual([...PLAY_DEFERRED_LAYER_IDS].sort(), [
    'ais-live-vessels',
    'cctv',
    'military',
    'military-awareness',
    'military-installations',
    'radio',
  ]);
  assert.equal(playBootLayersAreSafe([]), true);
  assert.equal(playBootLayersAreSafe(PLAY_DEFAULT_LAYER_IDS), true);
  assert.equal(playBootLayersAreSafe(['earthquakes']), true);
  for (const id of PLAY_DEFERRED_LAYER_IDS) {
    assert.equal(playBootLayersAreSafe([id]), false, `${id} must not boot on play start`);
    assert.equal(playBootLayersAreSafe(['earthquakes', 'local-firms', id]), false);
  }
  assert.equal(playBootLayersAreSafe(['flights']), false);
});

test('durable defaults stay empty — play layers come from first-run, not Contacts', () => {
  const defaults = createDefaultLayerState();
  assert.deepEqual(defaults.enabledLayerIds, []);
  assert.equal(playBootLayersAreSafe(defaults.enabledLayerIds), true);
  assert.ok(!PLAY_DEFERRED_LAYER_IDS.some((id) => defaults.enabledLayerIds.includes(id)));
  assert.ok(!FIRST_RUN_MISSIONS.environmental.layerIds.includes('military'));
  assert.ok(!FIRST_RUN_MISSIONS.environmental.layerIds.includes('cctv'));
});

test('play camera is a full earth, not a city fly-in', () => {
  assert.ok(PLAY_GLOBE_CAMERA.heightM >= 10_000_000);
  assert.equal(PLAY_GLOBE_CAMERA.pitchDeg, -90);
});

test('main.js uses the keyless-earth helpers and does not boot voice or Austin', () => {
  const main = fs.readFileSync(new URL('./main.js', import.meta.url), 'utf8');
  assert.match(main, /resolvePlayGlobeSurface/);
  assert.match(main, /applyPlayGlobeSurface/);
  assert.match(main, /hidePlayLoader/);
  assert.match(main, /createOsmImageryOptions/);
  assert.match(main, /shouldInitVoiceOnPlayStart/);
  assert.match(main, /PLAY_GLOBE_CAMERA/);
  assert.doesNotMatch(main, /flyToAustin/);
  assert.match(main, /if \(shouldInitVoiceOnPlayStart\(\)\)/);
  // Loader yields as soon as the earth exists — not after StyleManager + 1s.
  const hideAt = main.indexOf('hidePlayLoader(loadingScreen)');
  const styleAt = main.indexOf('new StyleManager');
  const voiceAt = main.indexOf('initGevVoiceCommands');
  assert.ok(hideAt > 0 && styleAt > hideAt, 'the loader must yield before the HUD boots');
  assert.ok(voiceAt > 0);
  const voiceCall = main.slice(main.indexOf('if (shouldInitVoiceOnPlayStart())'));
  assert.match(voiceCall, /initGevVoiceCommands/);
});

test('FIRMS proxy is installed on preview so live can be a built bundle', () => {
  const vite = fs.readFileSync(new URL('../vite.config.js', import.meta.url), 'utf8');
  const firms = vite.slice(vite.indexOf('function firmsProxy'), vite.indexOf('function firmsProxy') + 8_000);
  assert.match(firms, /configureServer:\s*install/);
  assert.match(firms, /configurePreviewServer:\s*install/);
  assert.doesNotMatch(firms, /FIRMS_MAP_KEY\s*=\s*['"][^'"]+['"]/);
});

test('the repo does not ship Google or FIRMS secrets', () => {
  const ignore = fs.readFileSync(new URL('../.gitignore', import.meta.url), 'utf8');
  assert.match(ignore, /^\.env$/m);
  const trackedEnv = [
    '.env',
    '.env.local',
    '.env.production',
  ].filter((name) => fs.existsSync(new URL(`../${name}`, import.meta.url)));
  assert.deepEqual(trackedEnv, [], 'dotenv files must stay untracked');
  const main = fs.readFileSync(new URL('./main.js', import.meta.url), 'utf8');
  assert.doesNotMatch(main, /AIza[0-9A-Za-z_-]{20,}/);
  assert.doesNotMatch(main, /FIRMS_MAP_KEY\s*=\s*['"][^'"]+['"]/);
});

test('photoreal is opt-in via query, never the play default', () => {
  assert.equal(playAllowPhotorealFromLocation({ search: '' }), false);
  assert.equal(playAllowPhotorealFromLocation({ search: '?welcome=1' }), false);
  assert.equal(playAllowPhotorealFromLocation({ search: '?photoreal=1' }), true);
});
