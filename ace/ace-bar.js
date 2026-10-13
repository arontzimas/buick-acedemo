/* Buick ACE — floating "Ask me anything" bar for every cloned Buick page.
   Submitting opens the composed chat experience at /chat. */
(function () {
  'use strict';
  if (window.__aceBar) return;
  window.__aceBar = true;

  var LOCAL_ROUTES = ['/', '/suvs', '/suvs/envista', '/suvs/encore-gx', '/suvs/envision', '/suvs/enclave', '/chat'];
  var ICON_UP = '/ace/icons/arrow-up.svg';

  function normPath(p) {
    p = (p || '/').replace(/\/index\.html$/, '').replace(/\/+$/, '');
    return p === '' ? '/' : p;
  }

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
        '<button class="ace-bar__send" type="submit" aria-label="Send" disabled><img src="' + ICON_UP + '" alt="" width="16" height="16"></button>' +
      '</div>';
    var input = form.querySelector('input');
    var send = form.querySelector('button');
    input.addEventListener('input', function () {
      var on = input.value.trim().length > 0;
      form.classList.toggle('is-active', on);
      send.disabled = !on;
    });
    form.addEventListener('submit', function (e) {
      e.preventDefault();
      var q = input.value.trim();
      if (!q) return;
      openChat(q);
    });
    document.body.appendChild(form);
    return form;
  }

  function openChat(q) {
    var from = normPath(location.pathname);
    try {
      sessionStorage.setItem('ace:from', from);
      sessionStorage.setItem('ace:scrollY', String(window.scrollY || 0));
    } catch (e) {}
    var veil = document.createElement('div');
    veil.className = 'ace-veil';
    document.body.appendChild(veil);
    requestAnimationFrame(function () { veil.classList.add('is-on'); });
    setTimeout(function () {
      location.href = '/chat?q=' + encodeURIComponent(q) + '&from=' + encodeURIComponent(from);
    }, 260);
  }

  /* ---------- keep navigation inside the demo where we have pages, else hand off to buick.com ---------- */
  document.addEventListener('click', function (e) {
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

  function init() {
    buildBar();
    // returning from chat: restore scroll position
    try {
      if (sessionStorage.getItem('ace:return') === normPath(location.pathname)) {
        var y = parseInt(sessionStorage.getItem('ace:scrollY') || '0', 10);
        sessionStorage.removeItem('ace:return');
        if (y) window.addEventListener('load', function () { setTimeout(function () { window.scrollTo(0, y); }, 50); });
      }
    } catch (e) {}
  }
  if (document.readyState === 'loading') document.addEventListener('DOMContentLoaded', init); else init();
})();
