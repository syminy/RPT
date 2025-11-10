const core = require('../../webui/static/modules/utils.core.js');

describe('utils.core basic functions', () => {
  test('safeNumber returns numbers and nulls', () => {
    expect(core.safeNumber('123')).toBe(123);
    expect(core.safeNumber('abc')).toBeNull();
    expect(core.safeNumber('')).toBeNull();
    expect(core.safeNumber(null)).toBeNull();
    expect(core.safeNumber(0)).toBe(0);
  });

  test('formatSampleRate formats correctly', () => {
    expect(core.formatSampleRate(1000000)).toMatch(/MSps$/);
    expect(core.formatSampleRate(1500)).toMatch(/kSps$/);
    expect(core.formatSampleRate(1)).toMatch(/Sps$/);
    expect(core.formatSampleRate(null)).toBeNull();
  });

  test('formatResolution formats correctly', () => {
    expect(core.formatResolution(2000000)).toMatch(/MHz$/);
    expect(core.formatResolution(2000)).toMatch(/kHz$/);
    expect(core.formatResolution(50)).toMatch(/Hz$/);
  });

  test('formatFps and formatDwell', () => {
    expect(core.formatFps(30)).toMatch(/fps$/);
    expect(core.formatFps(9.5)).toMatch(/fps$/);
    expect(core.formatDwell(0.1)).toMatch(/ms$/);
  });

  test('formatPresetDescriptor composes parts', () => {
    const s = {
      target_fps: 30,
      sample_rate: 1000000,
      rbw: 2000,
      fft_size: 1024,
      dwell_time: 0.05,
      max_segments: 2,
    };
    const desc = core.formatPresetDescriptor(s);
    expect(desc).toContain('fps');
    expect(desc).toContain('Sample');
    expect(desc).toContain('RBW');
  });
});
