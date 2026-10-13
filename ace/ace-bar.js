/* Buick ACE — floating "Ask me anything" bar for every cloned Buick page.
   Submitting (or picking a suggested question) opens the composed chat experience at /chat.
   Also exposes window.ACEBar so the chat page can reuse the suggestions panel. */
(function () {
  'use strict';
  if (window.__aceBar) return;
  window.__aceBar = true;

  var LOCAL_ROUTES = ['/', '/suvs', '/suvs/envista', '/suvs/encore-gx', '/suvs/envision', '/suvs/enclave', '/chat'];
  var ICON = '/ace/icons/';
  var IS_CHAT = normPath(location.pathname) === '/chat';
  var docEl = document.documentElement;

  /* suggested questions, by the vehicle the visitor is looking at */
  var SUGGEST = {
    home: [
      'What is the best Buick model for me?',
      'What’s the smallest SUV in the lineup?',
      'Is Buick considered a luxury or premium brand?',
      'Which Buick SUV is right for a family of 7?'
    ],
    envista: [
      'Tell me about safety features',
      'What are the Envista trims?',
      'How does the Envista compare to the Encore GX?',
      'What colors does the Envista come in?'
    ],
    'encore-gx': [
      'What’s the smallest SUV in the lineup?',
      'What are the Encore GX trims?',
      'How does the Encore GX compare to the Envista?',
      'What’s the Encore GX gas mileage?'
    ],
    envision: [
      'What’s the difference between the Envision Preferred and the Avenir?',
      'Tell me about Envision safety features',
      'What tech comes with the Envision?',
      'How much is the Envision?'
    ],
    enclave: [
      'Can I talk to someone about the Enclave?',
      'Does the Enclave have a third row?',
      'Is Buick considered a luxury or premium brand?',
      'How much is the Enclave?'
    ]
  };
  function vehicleFromPath(p) { var m = /\/suvs\/(envista|encore-gx|envision|enclave)/.exec(p || ''); return m ? m[1] : null; }
  function suggestionsFor(v) { return (SUGGEST[v] || SUGGEST.home).slice(); }

  function normPath(p) {
    p = (p || '/').replace(/\/index\.html$/, '').replace(/\/+$/, '');
    return p === '' ? '/' : p;
  }
  function esc(s) { return String(s).replace(/[&<>"]/g, function (c) { return { '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;' }[c]; }); }

  /* ---------- the bar ---------- */
  function buildBar() {
    var form = document.createElement('form');
    form.className = 'ace-bar';
    form.setAttribute('role', 'search');
    form.setAttribute('aria-label', 'Ask Buick');
    form.innerHTML =
      '<div class="ace-bar__row">' +
        '<label class="ace-visually-hidden" for="ace-bar-input">Ask me anything</label>' +
        '<input id="ace-bar-input" class="ace-bar__input" type="text" name="q" placeholder="Ask me anything" autocomplete="off" enterkeyhint="send" maxlength="300">' +
        '<button class="ace-bar__send" type="submit" aria-label="Send" disabled><img src="' + ICON + 'arrow-up.svg" alt="" width="16" height="16"></button>' +
      '</div>';
    document.body.appendChild(form);
    return form;
  }

  /* ---------- suggestions panel: opens on hover (with a little intent) or when the field is clicked/tabbed into ---------- */
  function attachSuggest(form, opts) {
    var input = form.querySelector('input');
    var wrap = document.createElement('div');
    wrap.className = 'ace-bar__suggest';
    wrap.innerHTML = '<div class="ace-bar__suggest-inner"><div class="ace-bar__list" role="group" aria-label="Suggested questions"></div></div>';
    form.insertBefore(wrap, form.firstChild);
    var list = wrap.querySelector('.ace-bar__list');
    var listId = 'ace-suggest-' + Math.random().toString(36).slice(2, 7);
    list.id = listId;
    input.setAttribute('aria-controls', listId);
    input.setAttribute('aria-expanded', 'false');

    var open = false, hoverT = null, leaveT = null, pd = 0, kb = 0;
    var canHover = window.matchMedia('(hover: hover) and (pointer: fine)').matches;

    function render() {
      var items = (opts.items() || []).slice(0, 4);
      list.innerHTML = items.map(function (q) {
        return '<button type="button" class="ace-bar__sugg" tabindex="-1"><img src="' + ICON + 'return.svg" alt=""><span>' + esc(q) + '</span></button>';
      }).join('');
      return items.length;
    }
    function setOpen(on) {
      clearTimeout(hoverT); clearTimeout(leaveT);
      if (on && (input.value.trim() || form.classList.contains('is-launching') || (opts.blocked && opts.blocked()))) on = false;
      if (on === open) return;
      if (on && !render()) return;
      open = on;
      form.classList.toggle('is-open', on);
      input.setAttribute('aria-expanded', on ? 'true' : 'false');
      Array.prototype.forEach.call(list.children, function (b) { b.tabIndex = on ? 0 : -1; });
    }
    function focusInside() { return form.contains(document.activeElement); }

    if (canHover) {
      form.addEventListener('mouseenter', function () { clearTimeout(leaveT); if (!open) hoverT = setTimeout(function () { setOpen(true); }, 140); });
      form.addEventListener('mouseleave', function () { clearTimeout(hoverT); if (!focusInside()) leaveT = setTimeout(function () { setOpen(false); }, 260); });
    }
    form.addEventListener('pointerdown', function () { pd = Date.now(); });
    document.addEventListener('keydown', function (e) { if (e.key === 'Tab') kb = Date.now(); }, true);
    // only a person clicking or tabbing in opens it (the chat page re-focuses the field after every answer)
    input.addEventListener('focus', function () { if (Date.now() - pd < 1000 || Date.now() - kb < 1000) setOpen(true); });
    input.addEventListener('click', function () { if (!open) setOpen(true); });
    input.addEventListener('input', function () { if (input.value.trim()) setOpen(false); else if (document.activeElement === input) setOpen(true); });
    form.addEventListener('focusout', function () {
      setTimeout(function () { if (!focusInside() && !(canHover && form.matches(':hover'))) setOpen(false); }, 120);
    });
    document.addEventListener('pointerdown', function (e) { if (open && !form.contains(e.target)) setOpen(false); });

    // keep focus in the field while picking (stops the mobile keyboard from bouncing)
    list.addEventListener('mousedown', function (e) { e.preventDefault(); });
    list.addEventListener('click', function (e) {
      var b = e.target.closest('.ace-bar__sugg');
      if (!b) return;
      var q = b.querySelector('span').textContent;
      setOpen(false);
      opts.onPick(q);
    });

    // keyboard: arrows move between the field and the suggestions, Escape closes
    form.addEventListener('keydown', function (e) {
      var btns = Array.prototype.slice.call(list.children);
      var i = btns.indexOf(document.activeElement);
      if (e.key === 'Escape' && open) { e.stopPropagation(); setOpen(false); input.focus(); return; }
      if (e.key === 'ArrowUp') {
        if (!open && document.activeElement === input) setOpen(true);
        btns = Array.prototype.slice.call(list.children);
        if (!btns.length) return;
        e.preventDefault();
        if (document.activeElement === input) btns[btns.length - 1].focus();
        else if (i > 0) btns[i - 1].focus();
      } else if (e.key === 'ArrowDown' && i !== -1) {
        e.preventDefault();
        if (i < btns.length - 1) btns[i + 1].focus(); else input.focus();
      }
    });
    return { close: function () { setOpen(false); }, isOpen: function () { return open; } };
  }

  /* ---------- page -> chat ---------- */
  var launching = false;
  function openChat(q, form) {
    if (launching) return;
    launching = true;
    var from = normPath(location.pathname);
    try {
      sessionStorage.setItem('ace:from', from);
      sessionStorage.setItem('ace:scrollY', String(window.scrollY || 0));
    } catch (e) {}
    var input = form.querySelector('input');
    input.value = '';
    form.classList.remove('is-active');
    form.querySelector('button.ace-bar__send').disabled = true;
    input.blur();
    form.classList.add('is-launching');
    var veil = document.createElement('div');
    veil.className = 'ace-veil';
    document.body.appendChild(veil);
    veil.getBoundingClientRect();
    requestAnimationFrame(function () { veil.classList.add('is-on'); });
    var reduce = window.matchMedia('(prefers-reduced-motion: reduce)').matches;
    setTimeout(function () {
      location.href = '/chat?q=' + encodeURIComponent(q) + '&from=' + encodeURIComponent(from);
    }, reduce ? 220 : 640);
  }

  /* ---------- chat -> page: clear the haze once the page has settled at the old scroll position ---------- */
  function arrive() {
    if (!docEl.classList.contains('ace-returning')) return;
    var y = 0;
    try { y = parseInt(sessionStorage.getItem('ace:scrollY') || '0', 10) || 0; } catch (e) {}
    var done = false;
    function clear() {
      if (done) return; done = true;
      if (y) window.scrollTo(0, y);
      requestAnimationFrame(function () {
        docEl.classList.add('ace-clearing');
        setTimeout(function () { docEl.classList.remove('ace-returning', 'ace-clearing'); }, 1000);
      });
    }
    if (y) window.scrollTo(0, y);
    if (document.readyState === 'complete') setTimeout(clear, 60);
    else {
      window.addEventListener('load', function () { setTimeout(clear, 60); });
      setTimeout(clear, 1400); // don't wait on slow third-party assets
    }
  }

  /* back/forward cache: never come back to a page that is still veiled */
  window.addEventListener('pageshow', function (e) {
    if (!e.persisted) return;
    launching = false;
    Array.prototype.forEach.call(document.querySelectorAll('.ace-veil'), function (v) { v.remove(); });
    var f = document.querySelector('form.ace-bar');
    if (f) f.classList.remove('is-launching');
    docEl.classList.remove('ace-returning', 'ace-clearing');
  });

  /* ---------- keep navigation inside the demo where we have pages, else hand off to buick.com ---------- */
  if (!IS_CHAT) document.addEventListener('click', function (e) {
    if (e.defaultPrevented || e.button !== 0 || e.metaKey || e.ctrlKey || e.shiftKey || e.altKey) return;
    var path = e.composedPath ? e.composedPath() : [e.target];
    var a = null;
    for (var i = 0; i < path.length; i++) {
      var n = path[i];
      if (n && n.tagName === 'A' && n.getAttribute && n.getAttribute('href')) { a = n; break; }
    }
    if (!a) return;
    var href = a.getAttribute('href');
    if (!href || href.charAt(0) === '#' || /^(javascript|mailto|tel):/i.test(href)) return;
    var url;
    try { url = new URL(href, location.href); } catch (err) { return; }
    var isBuick = /(^|\.)buick\.com$/.test(url.hostname);
    var sameOrigin = url.origin === location.origin;
    if (!isBuick && !sameOrigin) return;
    var p = normPath(url.pathname);
    if (LOCAL_ROUTES.indexOf(p) !== -1 && (sameOrigin || url.hostname === 'www.buick.com')) {
      if (!sameOrigin) { e.preventDefault(); location.href = p + url.search + url.hash; }
      return;
    }
    if (sameOrigin) {
      e.preventDefault();
      var dest = 'https://www.buick.com' + url.pathname + url.search + url.hash;
      if (a.target === '_blank') window.open(dest, '_blank', 'noopener'); else location.href = dest;
    }
  }, true);

  /* iOS: avoid input auto-zoom on focus (14px type per design) */
  if (/iP(hone|od|ad)/.test(navigator.userAgent)) {
    var vp = document.querySelector('meta[name=viewport]');
    if (vp && !/maximum-scale/.test(vp.content)) vp.content += ', maximum-scale=1';
  }

  window.ACEBar = { attachSuggest: attachSuggest, suggestionsFor: suggestionsFor, vehicleFromPath: vehicleFromPath };

  function init() {
    if (IS_CHAT) return; // the chat page wires its own bar (chat.js)
    var form = document.querySelector('form.ace-bar') || buildBar();
    var input = form.querySelector('input');
    var send = form.querySelector('button.ace-bar__send');
    input.addEventListener('input', function () {
      var on = input.value.trim().length > 0;
      form.classList.toggle('is-active', on);
      send.disabled = !on;
    });
    form.addEventListener('submit', function (e) {
      e.preventDefault();
      var q = input.value.trim();
      if (q) openChat(q, form);
    });
    var v = vehicleFromPath(location.pathname);
    attachSuggest(form, {
      items: function () { return suggestionsFor(v); },
      onPick: function (q) { openChat(q, form); }
    });
    try { if (sessionStorage.getItem('ace:return') === normPath(location.pathname)) sessionStorage.removeItem('ace:return'); } catch (e) {}
    arrive();
  }
  if (document.readyState === 'loading') document.addEventListener('DOMContentLoaded', init); else init();
})();
