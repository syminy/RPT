// Wrapper for legacy `utils.js` that re-uses the extracted core module when
// running in a CommonJS environment (Node/Jest). In browser environments
// both files may be loaded; both assign to `window.rptUtils` for compatibility.
(function (_global) {
  if (typeof module !== 'undefined' && module.exports) {
    // Use the extracted core module in Node/commonjs environments
    const core = require('./utils.core.js');
    module.exports = core;
    if (typeof window !== 'undefined') window.rptUtils = Object.assign(window.rptUtils || {}, core);
    return;
  }

  // Fallback: if not running under CommonJS (browser), include a small shim
  // that preserves the original behavior by deferring to window.rptUtils when
  // present. This keeps backward compatibility with pages that include the
  // legacy bundle ordering.
  if (typeof window !== 'undefined' && window.rptUtils) return;

  // If window.rptUtils isn't present, load the core definitions by inlining
  // a minimal copy. This path is seldom used in modern builds but kept for
  // maximum compatibility.
  const n310SampleRatesHz = [
    250000,
    500000,
    748503,
    1e6,
    1.25e6,
    1.50602e6,
    2.01613e6,
    2.5e6,
    3.125e6,
    4.03226e6,
    5e6,
    7.8125e6,
    1.04167e7,
    2.08333e7,
    2.5e7,
    3.125e7,
  ];

  function formatSampleRateOptionText(rateHz) {
    const rateKHz = rateHz / 1e3;
    if (rateKHz >= 1000) {
      const decimals = Number.isInteger(rateKHz) ? 0 : 1;
      return `${rateKHz.toFixed(decimals).replace(/\.0$/, '')} kHz`;
    }
    return `${rateKHz.toFixed(3).replace(/0+$/, '').replace(/\.$/, '')} kHz`;
  }

  function safeNumber(value) {
    if (value === null || value === undefined || value === '') return null;
    const num = Number(value);
    return Number.isFinite(num) ? num : null;
  }

  function formatSampleRate(valueHz) {
    const num = safeNumber(valueHz);
    if (!num && num !== 0) return null;
    if (Math.abs(num) >= 1e6) return `${(num / 1e6).toFixed(2).replace(/\.00$/, '')} MSps`;
    if (Math.abs(num) >= 1e3) return `${(num / 1e3).toFixed(1).replace(/\.0$/, '')} kSps`;
    return `${num.toFixed(0)} Sps`;
  }

  function formatResolution(valueHz) {
    const num = safeNumber(valueHz);
    if (!num && num !== 0) return null;
    if (Math.abs(num) >= 1e6) return `${(num / 1e6).toFixed(2).replace(/\.00$/, '')} MHz`;
    if (Math.abs(num) >= 1e3) return `${(num / 1e3).toFixed(0)} kHz`;
    return `${num.toFixed(0)} Hz`;
  }

  function formatFps(value) {
    const num = safeNumber(value);
    if (!num && num !== 0) return null;
    return `${num.toFixed(num >= 10 ? 0 : 1).replace(/\.0$/, '')} fps`;
  }

  function formatDwell(valueSeconds) {
    const num = safeNumber(valueSeconds);
    if (!num && num !== 0) return null;
    return `${(num * 1000).toFixed(1).replace(/\.0$/, '')} ms`;
  }

  function normalizePresetKey(value) {
    return (value || '').toString().trim().toUpperCase();
  }

  function formatPresetDescriptor(settings = {}, _presets = {}) {
    const parts = [];
    const fps = formatFps(settings.target_fps);
    if (fps) parts.push(fps);
    const sample = formatSampleRate(settings.sample_rate);
    if (sample) parts.push(`Sample ${sample}`);
    const rbw = formatResolution(settings.rbw);
    if (rbw) parts.push(`RBW ${rbw}`);
    const fft = safeNumber(settings.fft_size);
    if (fft) parts.push(`FFT ${Math.round(fft)}`);
    const dwell = formatDwell(settings.dwell_time);
    if (dwell) parts.push(`Dwell ${dwell}`);
    const segments = safeNumber(settings.max_segments);
    if (segments) parts.push(`≤${Math.round(segments)} segments`);
    return parts.join(' • ');
  }

  const api = {
    n310SampleRatesHz,
    formatSampleRateOptionText,
    safeNumber,
    formatSampleRate,
    formatResolution,
    formatFps,
    formatDwell,
    normalizePresetKey,
    formatPresetDescriptor,
  };

  if (typeof window !== 'undefined') {
    window.rptUtils = Object.assign(window.rptUtils || {}, api);
  }
})(this);
