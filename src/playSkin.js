/**
 * AlsDitDan play skin. Quiet chrome, fill the viewport, resize Cesium
 * when the iframe or the mobile URL bar changes size.
 */
export function installPlaySkin() {
  const root = document.documentElement;
  const body = document.body;
  root.classList.add('play-skin');
  if (body) body.classList.add('play-skin');

  let embedded = false;
  try {
    embedded = window.self !== window.top;
  } catch {
    embedded = true;
  }
  if (embedded) {
    root.classList.add('play-embed');
    if (body) body.classList.add('play-embed');
  }

  document.title = embedded ? 'Wereld' : 'AlsDitDan · Wereld';

  const h1 = document.querySelector('#title-bar h1');
  if (h1) {
    h1.replaceChildren();
    const word = document.createElement('span');
    word.textContent = 'AlsDitDan';
    h1.appendChild(word);
  }
  const sub = document.querySelector('#title-bar .subtitle');
  if (sub) sub.textContent = 'Wereld · aardbevingen en branden';

  const loadLabel = document.getElementById('global-loading-label');
  if (loadLabel) loadLabel.textContent = 'Live data';

  const loaderStatus = document.querySelector('#loading-screen .loader-status');
  if (loaderStatus) loaderStatus.textContent = 'Wereld laden…';
  const loaderTitle = document.querySelector('#loading-screen h2');
  if (loaderTitle) loaderTitle.textContent = 'AlsDitDan';

  const resize = () => {
    const viewer = window.__godsEyeView?.viewer;
    if (viewer && typeof viewer.resize === 'function') {
      try {
        viewer.resize();
      } catch {
        /* viewer not ready */
      }
    }
  };

  window.addEventListener('resize', resize);
  window.visualViewport?.addEventListener('resize', resize);
  const el = document.getElementById('cesiumContainer');
  if (el && typeof ResizeObserver === 'function') {
    new ResizeObserver(resize).observe(el);
  }
  setTimeout(resize, 400);
  setTimeout(resize, 1600);
}
