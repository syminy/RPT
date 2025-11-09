/** @jest-environment jsdom */
const dh = require('../../webui/static/modules/dom-helpers.js');

describe('dom-helpers', () => {
  beforeEach(() => {
    document.body.innerHTML = '';
  });

  test('qs and qsa and createEl', () => {
    const el = dh.createEl('div', {'id':'foo'}, {text:'hello'});
    document.body.appendChild(el);
    expect(dh.qs('#foo').textContent).toBe('hello');
    const multiple = dh.createEl('span');
    document.body.appendChild(multiple);
    expect(dh.qsa('div,span').length).toBe(2);
  });

  test('setText and toggleClass', () => {
    const el = dh.createEl('p');
    document.body.appendChild(el);
    dh.setText(el, 'x');
    expect(el.textContent).toBe('x');
    dh.toggleClass(el, 'a', true);
    expect(el.classList.contains('a')).toBe(true);
    dh.toggleClass(el, 'a', false);
    expect(el.classList.contains('a')).toBe(false);
  });

  test('on and delegate and dataAttr', () => {
    const root = dh.createEl('div');
    root.innerHTML = '<button class="btn" data-action="x">ok</button>';
    document.body.appendChild(root);
    let clicked = false;
    const rem = dh.on(root.querySelector('.btn'), 'click', () => { clicked = true; });
    root.querySelector('.btn').click();
    expect(clicked).toBe(true);
    rem();
    clicked = false;
    // delegate
    const un = dh.delegate(root, 'click', '.btn', (e, el) => { clicked = el.dataset.action; });
    root.querySelector('.btn').click();
    expect(clicked).toBe('x');
    un();
    // dataAttr
    dh.dataAttr(root, 'foo', 'bar');
    expect(dh.dataAttr(root, 'foo')).toBe('bar');
  });

  test('bindNamespace and unbindNamespace', () => {
    const el = dh.createEl('div');
    document.body.appendChild(el);
    let n = 0;
    dh.bindNamespace(el, 'click', () => { n++; }, 'testns');
    el.click();
    expect(n).toBe(1);
    dh.unbindNamespace('testns');
    el.click();
    expect(n).toBe(1);
  });
});
