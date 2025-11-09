// webui/static/utils.js
// Small, dependency-free helpers extracted from app.js
// Exposes a single global: window.rptUtils
// shim to preserve compatibility: re-export from modules/utils.js
try {
  const mod = require('./modules/utils.js');
  if (typeof window !== 'undefined') window.rptUtils = Object.assign(window.rptUtils || {}, mod);
  if (typeof module !== 'undefined' && module.exports) module.exports = mod;
} catch (e) {
  // fallback: keep the legacy implementation if the modules file isn't available
  /* legacy implementation preserved earlier; this fallback will not run in normal dev */
  // eslint-disable-next-line no-console
  console.warn('Could not load modules/utils.js, utils shim falling back (legacy not present)');
}
