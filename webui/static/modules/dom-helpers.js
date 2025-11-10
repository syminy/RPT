// Wrapper for `dom-helpers` that re-uses the extracted core module when
// running in a CommonJS environment (Node/Jest). In browser environments
// both files may be loaded; both assign to `window.rptDom` for compatibility.
(function (_global) {
  if (typeof module !== 'undefined' && module.exports) {
    // Use the extracted core module in Node/commonjs environments
    const core = require('./dom-helpers.core.js');
    module.exports = core;
    if (typeof window !== 'undefined') window.rptDom = Object.assign(window.rptDom || {}, core);
    return;
  }

  // Fallback: if not running under CommonJS (browser), include a small shim
  // that preserves the original behavior by deferring to window.rptDom when
  // present. This keeps backward compatibility with pages that include the
  // legacy bundle ordering.
  if (typeof window !== 'undefined' && window.rptDom) return;

  // If window.rptDom isn't present, load the core definitions by inlining
  // a minimal copy. This path is seldom used in modern builds but kept for
  // maximum compatibility.
  (function(exports){
    function qs(selector, root=document){ return root.querySelector(selector); }
    function qsa(selector, root=document){ return Array.from(root.querySelectorAll(selector)); }
    function createEl(tag, attrs={}, opts={}){
      const el = document.createElement(tag);
      for (const k in attrs) el.setAttribute(k, attrs[k]);
      if (opts.text) el.textContent = opts.text;
      return el;
    }
    function setText(el, text){ el.textContent = text; }
    function toggleClass(el, cls, force){ el.classList.toggle(cls, force); }

    function on(el, event, handler, opts){ el.addEventListener(event, handler, opts); return () => el.removeEventListener(event, handler, opts); }

    function delegate(root, eventType, selector, handler){
      const listener = function(e){
        let node = e.target;
        while(node && node !== root){
          if (typeof selector === 'function'){
            if (selector(node)) return handler(e, node);
          } else if (node.matches && node.matches(selector)){
            return handler(e, node);
          }
          node = node.parentElement;
        }
      };
      root.addEventListener(eventType, listener);
      return () => root.removeEventListener(eventType, listener);
    }

    function delegateDataActions(root=document){
      const listener = function(e){
        let node = e.target;
        while(node && node !== root){
          const action = node.dataset && node.dataset.action;
          if (action) {
            try {
              let router = null;
              if (typeof require === 'function') {
                try { router = require('./action-router'); } catch(_) { router = null; }
              }
              if (router && router.handleAction) {
                router.handleAction(action, e, node);
              } else if (window && window.rptActions) {
                if (typeof window.rptActions.handleAction === 'function') {
                  window.rptActions.handleAction(action, e, node);
                } else if (typeof window.rptActions[action] === 'function') {
                  window.rptActions[action](e, node);
                }
              }
            } catch(err) {
              // swallow to avoid breaking UI
              // eslint-disable-next-line no-console
              console.error('delegateDataActions handler error', err);
            }
            return;
          }
          node = node.parentElement;
        }
      };
      root.addEventListener('click', listener);
      return () => root.removeEventListener('click', listener);
    }

    function dataAttr(el, name, value){
      if (arguments.length === 3) { el.dataset[name] = value; return; }
      return el.dataset[name];
    }

    const _namespaces = new Map();
    function bindNamespace(el, event, handler, namespace){
      if (!_namespaces.has(namespace)) _namespaces.set(namespace, []);
      el.addEventListener(event, handler);
      _namespaces.get(namespace).push({el, event, handler});
    }
    function unbindNamespace(namespace){
      const arr = _namespaces.get(namespace) || [];
      for (const {el,event,handler} of arr) el.removeEventListener(event, handler);
      _namespaces.delete(namespace);
    }

    exports.qs = qs;
    exports.qsa = qsa;
    exports.createEl = createEl;
    exports.setText = setText;
    exports.toggleClass = toggleClass;
    exports.on = on;
    exports.delegate = delegate;
    exports.dataAttr = dataAttr;
    exports.bindNamespace = bindNamespace;
    exports.unbindNamespace = unbindNamespace;
    exports.delegateDataActions = delegateDataActions;

    if (typeof window !== 'undefined'){
      window.rptDom = Object.assign(window.rptDom || {}, exports);
    }
  })(this);
})(this);
