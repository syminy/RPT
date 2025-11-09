const rptUtils = require('../../webui/static/utils.js');

describe('rptUtils basic helpers', () => {
  test('safeNumber and formatSampleRate', () => {
    expect(rptUtils.safeNumber('123.5')).toBeCloseTo(123.5);
    expect(rptUtils.safeNumber('abc')).toBeNull();
    const s = rptUtils.formatSampleRate(2.01613e6);
    expect(typeof s).toBe('string');
    expect(s).toMatch(/MSps|kSps|Sps/);
  });

  test('formatResolution and formatFps and formatDwell', () => {
    expect(rptUtils.formatResolution(2500)).toMatch(/kHz|Hz/);
    expect(rptUtils.formatFps(15)).toMatch(/fps/);
    expect(rptUtils.formatDwell(0.005)).toMatch(/ms/);
  });

  test('normalizePresetKey and formatPresetDescriptor', () => {
    expect(rptUtils.normalizePresetKey('  balanced ')).toBe('BALANCED');
    const desc = rptUtils.formatPresetDescriptor({ target_fps: 10, sample_rate: 2e6, rbw: 50000, fft_size: 512, dwell_time: 0.005, max_segments: 4 });
    expect(typeof desc).toBe('string');
    expect(desc.length).toBeGreaterThan(0);
  });
});
