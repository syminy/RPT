// Minimal DOM helpers (CommonJS + attach to window for browser usage)
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

  // Simple delegation: selector can be css selector or function
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

  // dataAttr get/set
  function dataAttr(el, name, value){
    if (arguments.length === 3) { el.dataset[name] = value; return; }
    return el.dataset[name];
  }

  // Namespaced binding support
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

  if (typeof window !== 'undefined'){
    window.rptDom = window.rptDom || {};
    Object.assign(window.rptDom, exports);
  }
})(typeof exports === 'undefined' ? (this['domHelpers']={}) : exports);
