/** @jest-environment jsdom */
const core = require('../../webui/static/modules/action-handlers.core.js');

describe('action-handlers.core', () => {
  beforeEach(() => {
    // reset window helpers
    global.window = global.window || {};
    window.rptUI = {};
    // mock router
    this.registered = {};
    this.router = { registerAction: (name, fn) => { this.registered[name] = fn; } };
  });

  test('register registers expected actions', () => {
    core.register(this.router);
    // expect some keys to be registered
    expect(typeof this.registered['download-file']).toBe('function');
    expect(typeof this.registered['select-file']).toBe('function');
    expect(typeof this.registered['start-stream']).toBe('function');
  });

  test('download-file handler calls window.rptUI.downloadFile or window.downloadFile', () => {
    let called = false;
    window.downloadFile = (f) => { called = f; };
    core.register(this.router);
    const handler = this.registered['download-file'];
    const el = document.createElement('a'); el.dataset.file = 'file1.h5';
    handler(null, el);
    expect(called).toBe('file1.h5');
  });
});
