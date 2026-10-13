/* Buick ACE — chat experience renderer. Renders engine blocks with the Figma components. */
(function () {
  'use strict';
  var E = window.ACEEngine;
  var ICON = '/ace/icons/';
  var BC = { account: '1274068600', pk: 'BCpkADawqM1W1Wn4XzGat-KcQoWRC1z3KKs1MDIhP-eWFmK05t4evNBgt9nATNdsjmjq4ABOnn0pZJU43QaqGmqcVRFGwjTx0G_V1Lbmck0Z7F3RaSHLOPKXcKc' };
  var HLS_SRC = 'https://cdnjs.cloudflare.com/ajax/libs/hls.js/1.5.15/hls.min.js';

  var params = new URLSearchParams(location.search);
  var from = params.get('from') || safeGet('ace:from') || '/';
  var state = { vehicle: null, pageVehicle: vehicleFromPath(from), quiz: {} };
  var thread = document.getElementById('ace-thread');
  var busy = false;

  function safeGet(k) { try { return sessionStorage.getItem(k); } catch (e) { return null; } }
  function vehicleFromPath(p) { var m = /\/suvs\/(envista|encore-gx|envision|enclave)/.exec(p || ''); return m ? m[1] : null; }
  function el(tag, cls, html) { var n = document.createElement(tag); if (cls) n.className = cls; if (html != null) n.innerHTML = html; return n; }
  function esc(s) { return String(s == null ? '' : s).replace(/[&<>"]/g, function (c) { return { '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;' }[c]; }); }
  function isMobile() { return window.matchMedia('(max-width: 767px)').matches; }

  /* ---------------- components ---------------- */
  function cUser(text) {
    var w = el('div', 'ace-block ace-user');
    var b = el('div', 'ace-user__bubble ace-t-para');
    b.textContent = text;
    w.appendChild(b);
    return w;
  }
  function cText(block) {
    var w = el('div', 'ace-block ace-ai');
    var t = el('div', 'ace-ai__text ace-t-d5');
    if (block.html) t.innerHTML = '<p>' + block.html + '</p>';
    else if (block.lines) t.innerHTML = block.lines.map(function (l) { return l === '' ? '<div class="ace-gap"></div>' : '<p>' + esc(l) + '</p>'; }).join('');
    else t.innerHTML = '<p>' + esc(block.text) + '</p>';
    w.appendChild(t);
    return w;
  }
  function cTyping() {
    var w = el('div', 'ace-block ace-ai is-in ace-typing-row');
    w.innerHTML = '<div class="ace-ai__text"><span class="ace-typing" aria-label="Composing"><i></i><i></i><i></i></span></div>';
    return w;
  }
  function cCta(block) {
    var w = el('div', 'ace-block ace-cta');
    w.appendChild(el('p', 'ace-t-d5', esc(block.question)));
    var row = el('div', 'ace-chips');
    row.setAttribute('role', 'group');
    row.setAttribute('aria-label', block.question);
    block.options.forEach(function (o) {
      var b = el('button', 'ace-chip ace-t-label', esc(o));
      b.type = 'button';
      b.addEventListener('click', function () {
        if (row.classList.contains('is-answered') || busy) return;
        row.classList.add('is-answered');
        b.classList.add('is-selected');
        b.setAttribute('aria-pressed', 'true');
        answerQuiz(block.step, o);
      });
      row.appendChild(b);
    });
    w.appendChild(row);
    return w;
  }
  function cCompare(block) {
    if (block.single) {
      var s = el('div', 'ace-block ace-compare ace-compare--single');
      s.style.display = 'block';
      var c = block.cols[0];
      s.innerHTML = '<div class="ace-compare__list"><p class="ace-t-d5">' + esc(c.title) + '</p><ul class="ace-t-para">' +
        c.items.map(function (i) { return '<li>' + esc(i) + '</li>'; }).join('') + '</ul></div>';
      return s;
    }
    var n = block.cols.length;
    var w = el('div', 'ace-block ace-compare ace-compare--' + (n >= 3 ? 3 : 2));
    block.cols.forEach(function (c, i) {
      if (i > 0) w.appendChild(el('div', 'ace-compare__rule'));
      var col = el('div', 'ace-compare__col');
      col.innerHTML =
        '<div class="ace-compare__top">' +
          '<p class="ace-t-d5">' + esc(c.title) + '</p>' +
          '<div class="ace-compare__media">' +
            '<div class="ace-compare__img' + (c.alt2 ? ' is-alt' : '') + '"><img src="' + esc(c.img) + '" alt="' + esc(c.alt || c.title) + '" loading="lazy"></div>' +
            '<div class="ace-compare__price"><p class="lbl ace-t-para">Starting at</p><p class="ace-t-d5">' + esc(c.price) + '</p></div>' +
          '</div>' +
        '</div>' +
        '<div class="ace-compare__list"><p class="ace-t-d5">' + esc(c.listTitle || 'Trim Highlights') + '</p><ul class="ace-t-para">' +
          c.items.map(function (i) { return '<li>' + esc(i) + '</li>'; }).join('') +
        '</ul></div>';
      w.appendChild(col);
    });
    return w;
  }
  function cHeadline(block) {
    var w = el('div', 'ace-block ace-headline' + (block.tight ? ' ace-headline--tight' : ''));
    if (block.divider) w.appendChild(el('div', 'ace-divider'));
    var row = el('div', 'ace-headline__row');
    row.innerHTML = '<div class="ace-headline__text"><p class="ace-t-d3">' + esc(block.title) + '</p>' +
      (block.sub ? '<p class="ace-headline__sub ace-t-d5">' + esc(block.sub) + '</p>' : '') + '</div>' +
      '<a class="ace-btn-primary ace-t-label" href="' + esc(block.cta.href) + '">' + esc(block.cta.label) + '</a>';
    w.appendChild(row);
    return w;
  }
  function cSpecs(block) {
    var w = el('div', 'ace-block ace-specs');
    w.innerHTML =
      '<div class="ace-specs__head"><p class="ace-t-d5">' + esc(block.title) + '</p><p class="ace-specs__desc ace-t-d5">' + esc(block.desc) + '</p></div>' +
      '<div class="ace-specs__imgs" role="img" aria-label="' + esc(block.alt || '') + '">' +
        '<div class="ace-specs__box ace-specs__box--side"><img src="' + esc(block.img) + '" alt="" loading="lazy"></div>' +
        '<div class="ace-specs__box ace-specs__box--rear"><img src="' + esc(block.img) + '" alt="" loading="lazy"></div>' +
      '</div>';
    return w;
  }
  function cCards(block) {
    var w = el('div', 'ace-block ace-cards');
    var nav = el('div', 'ace-cards__nav');
    nav.innerHTML = '<button type="button" aria-label="Previous"><img src="' + ICON + 'arrow-left-dark.svg" alt=""></button><button type="button" aria-label="Next"><img src="' + ICON + 'arrow-right-dark.svg" alt=""></button>';
    var track = el('div', 'ace-cards__track');
    block.items.forEach(function (c, i) {
      if (i > 0) track.appendChild(el('div', 'ace-card__rule'));
      var b = el('button', 'ace-card');
      b.type = 'button';
      b.innerHTML = '<div class="ace-card__img"><img src="' + esc(c.img) + '" alt="' + esc(c.alt || '') + '" loading="lazy"></div><p class="ace-t-d5">' + esc(c.text) + '</p>';
      b.addEventListener('click', function () { ask(c.q || c.text); });
      track.appendChild(b);
    });
    var btns = nav.querySelectorAll('button');
    function step(dir) { var card = track.querySelector('.ace-card'); track.scrollBy({ left: dir * ((card ? card.offsetWidth : 263) + 33), behavior: 'smooth' }); }
    btns[0].addEventListener('click', function () { step(-1); });
    btns[1].addEventListener('click', function () { step(1); });
    function sync() { btns[0].disabled = track.scrollLeft < 4; btns[1].disabled = track.scrollLeft + track.clientWidth >= track.scrollWidth - 4; }
    track.addEventListener('scroll', sync, { passive: true });
    setTimeout(sync, 50);
    w.appendChild(nav);
    w.appendChild(track);
    return w;
  }
  function mediaControl(box, opts) {
    var ctl = el('div', 'ace-mediactl');
    var btn = el('button');
    btn.type = 'button';
    btn.setAttribute('aria-label', 'Pause');
    btn.innerHTML = '<img class="ace-pause" src="' + ICON + 'pause.svg" alt=""><img class="ace-play" src="' + ICON + 'play.svg" alt="">';
    btn.addEventListener('click', function (e) {
      e.stopPropagation();
      var paused = !btn.classList.contains('is-paused');
      btn.classList.toggle('is-paused', paused);
      btn.setAttribute('aria-label', paused ? 'Play' : 'Pause');
      opts.toggle(paused);
    });
    ctl.appendChild(btn);
    box.appendChild(ctl);
    return btn;
  }
  function attachMotion(box, video) {
    var v = null;
    var reduce = window.matchMedia('(prefers-reduced-motion: reduce)').matches;
    box.classList.add('ace-kenburns');
    if (reduce) box.classList.add('is-paused');
    var btn = mediaControl(box, {
      toggle: function (paused) {
        box.classList.toggle('is-paused', paused);
        if (v) { if (paused) v.pause(); else v.play().catch(function () {}); }
      }
    });
    if (reduce) { btn.classList.add('is-paused'); btn.setAttribute('aria-label', 'Play'); }
    if (video) {
      playBrightcove(box, video, function (videoEl) {
        v = videoEl;
        if (btn.classList.contains('is-paused')) v.pause();
      });
    }
  }
  function cMedia(block) {
    var w = el('div', 'ace-block ace-media');
    var box = el('div', 'ace-media__box');
    box.innerHTML = '<img src="' + esc(block.img) + '" alt="' + esc(block.alt || '') + '" loading="lazy">';
    w.appendChild(box);
    attachMotion(box, block.video);
    return w;
  }
  function cCarousel(block) {
    var w = el('div', 'ace-block ace-carousel');
    var vp = el('div', 'ace-carousel__viewport');
    var track = el('div', 'ace-carousel__track');
    block.items.forEach(function (it, idx) {
      var item = el('div', 'ace-carousel__item');
      var box = el('div', 'ace-carousel__box' + (it.jelly ? ' is-jelly' : ''));
      box.innerHTML = '<img src="' + esc(it.img) + '" alt="' + esc(it.alt || it.title) + '" loading="lazy">';
      item.appendChild(box);
      if (!it.jelly) {
        // media items: the first one shows the "playing" control like the Figma, others show it too
        attachMotion(box, it.video && idx === 0 ? it.video : null);
        if (it.video && idx !== 0) box.dataset.video = it.video;
      }
      var desc = el('div', 'ace-carousel__desc ace-t-d5', '<p>' + esc(it.title) + '</p>' + (it.sub ? '<p class="sub">' + esc(it.sub) + '</p>' : ''));
      item.appendChild(desc);
      if (it.q) { item.classList.add('is-link'); item.addEventListener('click', function () { ask(it.q); }); }
      track.appendChild(item);
    });
    vp.appendChild(track);
    w.appendChild(vp);
    var nav = el('div', 'ace-carousel__nav');
    nav.innerHTML = '<button type="button" aria-label="Previous"><img class="ace-caret ace-caret--left" src="' + ICON + 'caret-up.svg" alt=""></button>' +
                    '<button type="button" aria-label="Next"><img class="ace-caret ace-caret--right" src="' + ICON + 'caret-up.svg" alt=""></button>';
    w.appendChild(nav);
    var i = 0;
    var btns = nav.querySelectorAll('button');
    function maxIndex() {
      var items = track.children; if (!items.length) return 0;
      var itemW = items[0].getBoundingClientRect().width + parseFloat(getComputedStyle(track).columnGap || getComputedStyle(track).gap || 24);
      var visible = Math.max(1, Math.floor((vp.clientWidth + 1) / itemW));
      return Math.max(0, items.length - visible);
    }
    function go(n) {
      i = Math.max(0, Math.min(n, maxIndex()));
      var items = track.children;
      var off = items[i] ? items[i].offsetLeft : 0;
      track.style.transform = 'translateX(' + (-off) + 'px)';
      btns[0].disabled = i === 0;
      btns[1].disabled = i >= maxIndex();
      // lazily start a video when its slide comes into view
      var box = items[i] && items[i].querySelector('.ace-carousel__box[data-video]');
      if (box && !box.dataset.started) { box.dataset.started = '1'; playBrightcove(box, box.dataset.video, function () {}); }
    }
    btns[0].addEventListener('click', function () { go(i - 1); });
    btns[1].addEventListener('click', function () { go(i + 1); });
    window.addEventListener('resize', function () { go(i); });
    // swipe
    var sx = null;
    vp.addEventListener('touchstart', function (e) { sx = e.touches[0].clientX; }, { passive: true });
    vp.addEventListener('touchend', function (e) {
      if (sx == null) return;
      var dx = e.changedTouches[0].clientX - sx; sx = null;
      if (Math.abs(dx) > 40) go(i + (dx < 0 ? 1 : -1));
    });
    setTimeout(function () { go(0); }, 0);
    return w;
  }
  function cFollow(block) {
    var w = el('div', 'ace-block ace-follow' + (block.loose ? ' ace-follow--loose' : ''));
    block.items.forEach(function (q, i) {
      if (i > 0) w.appendChild(el('div', 'ace-divider'));
      var b = el('button', 'ace-follow__item');
      b.type = 'button';
      b.innerHTML = '<img src="' + ICON + 'return.svg" alt=""><span class="ace-t-para">' + esc(q) + '</span>';
      b.addEventListener('click', function () { ask(q); });
      w.appendChild(b);
    });
    return w;
  }
  var RENDER = { text: cText, cta: cCta, compare: cCompare, headline: cHeadline, specs: cSpecs, cards: cCards, media: cMedia, carousel: cCarousel, follow: cFollow };

  /* ---------------- Brightcove (HLS) ---------------- */
  var hlsLoading = null;
  function loadHls() {
    if (window.Hls) return Promise.resolve(window.Hls);
    if (hlsLoading) return hlsLoading;
    hlsLoading = new Promise(function (res, rej) {
      var s = document.createElement('script'); s.src = HLS_SRC; s.async = true;
      s.onload = function () { res(window.Hls); }; s.onerror = rej;
      document.head.appendChild(s);
    });
    return hlsLoading;
  }
  function playBrightcove(box, id, cb) {
    fetch('https://edge.api.brightcove.com/playback/v1/accounts/' + BC.account + '/videos/' + id, { headers: { Accept: 'application/json;pk=' + BC.pk } })
      .then(function (r) { return r.json(); })
      .then(function (d) {
        var src = null;
        (d.sources || []).forEach(function (s) { if (!src && s.type === 'application/x-mpegURL' && /^https:/.test(s.src)) src = s.src; });
        if (!src) return;
        var v = document.createElement('video');
        v.muted = true; v.loop = true; v.playsInline = true; v.autoplay = true;
        v.setAttribute('muted', ''); v.setAttribute('playsinline', ''); v.setAttribute('aria-hidden', 'true');
        box.insertBefore(v, box.querySelector('.ace-mediactl'));
        function start() {
          v.play().then(function () { v.addEventListener('playing', function () { box.classList.add('is-playing-video'); }); box.classList.add('is-playing-video'); cb(v); }).catch(function () { cb(v); });
        }
        v.addEventListener('error', function () { v.remove(); box.classList.remove('is-playing-video'); });
        function native() { if (v.canPlayType('application/vnd.apple.mpegurl')) { v.src = src; start(); } else v.remove(); }
        loadHls().then(function (Hls) {
          if (!Hls || !Hls.isSupported()) return native();
          var h = new Hls({ capLevelToPlayerSize: true, maxBufferLength: 10 });
          h.on(Hls.Events.ERROR, function (ev, data) { if (data && data.fatal) { h.destroy(); v.remove(); box.classList.remove('is-playing-video'); } });
          h.loadSource(src); h.attachMedia(v);
          h.on(Hls.Events.MANIFEST_PARSED, start);
        }).catch(native);
      }).catch(function () {});
  }

  /* ---------------- conversation flow ---------------- */
  function newTurn() { var t = el('section', 'ace-turn'); thread.appendChild(t); return t; }
  function reveal(turn, nodes, done) {
    var k = 0;
    (function next() {
      if (k >= nodes.length) { if (done) done(); return; }
      var n = nodes[k++];
      turn.appendChild(n);
      requestAnimationFrame(function () { requestAnimationFrame(function () { n.classList.add('is-in'); }); });
      setTimeout(next, 130);
    })();
  }
  function scrollToNode(n) {
    var header = document.querySelector('.ace-header');
    var y = n.getBoundingClientRect().top + window.scrollY - (header ? header.offsetHeight : 0) - 8;
    window.scrollTo({ top: Math.max(0, y), behavior: 'smooth' });
  }
  function respondInto(turn, result) {
    var typing = cTyping();
    turn.appendChild(typing);
    var delay = 650 + Math.random() * 350;
    setTimeout(function () {
      typing.remove();
      var nodes = result.blocks.map(function (b) { return (RENDER[b.type] || cText)(b); });
      reveal(turn, nodes, function () { busy = false; bar.input.focus({ preventScroll: true }); });
    }, delay);
  }
  function ask(q) {
    q = (q || '').trim();
    if (!q || busy) return;
    busy = true;
    var empty = document.querySelector('.ace-empty-wrap'); if (empty) empty.remove();
    var turn = newTurn();
    var u = cUser(E.displayFor(q));
    turn.appendChild(u);
    requestAnimationFrame(function () { u.classList.add('is-in'); });
    if (thread.children.length > 1) setTimeout(function () { scrollToNode(turn); }, 30);
    var result = E.respond(q, state);
    respondInto(turn, result);
  }
  function answerQuiz(step, answer) {
    busy = true;
    var turn = newTurn();
    var u = cUser(answer);
    turn.appendChild(u);
    requestAnimationFrame(function () { u.classList.add('is-in'); });
    setTimeout(function () { scrollToNode(turn); }, 30);
    respondInto(turn, E.quizStep(step, answer, state));
  }

  /* ---------------- bar (same AI Chat component as the site pages) ---------------- */
  var bar = (function () {
    var form = document.querySelector('.ace-bar');
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
      if (!q || busy) return;
      input.value = ''; form.classList.remove('is-active'); send.disabled = true;
      ask(q);
    });
    return { input: input };
  })();

  /* ---------------- header ---------------- */
  var closeBtn = document.querySelector('.ace-close');
  closeBtn.addEventListener('click', function () {
    try { sessionStorage.setItem('ace:return', from); } catch (e) {}
    document.body.classList.add('is-leaving');
    setTimeout(function () { location.href = from; }, 200);
  });
  var header = document.querySelector('.ace-header');
  window.addEventListener('scroll', function () { header.classList.toggle('is-scrolled', window.scrollY > 4); }, { passive: true });
  document.addEventListener('keydown', function (e) { if (e.key === 'Escape' && !document.activeElement.closest('.ace-bar')) closeBtn.click(); });

  /* ---------------- boot ---------------- */
  function emptyState() {
    var w = el('div', 'ace-empty-wrap');
    var t = el('div', 'ace-block ace-ai is-in');
    t.innerHTML = '<div class="ace-ai__text ace-t-d5"><p>Ask me anything about the Buick SUV lineup.</p></div>';
    w.appendChild(t);
    var f = cFollow({ items: E.SUGGESTIONS });
    f.classList.add('is-in');
    w.appendChild(f);
    thread.appendChild(w);
  }
  Promise.all([
    fetch('/ace/data/vehicles.json').then(function (r) { return r.json(); }),
    fetch('/ace/data/images.json').then(function (r) { return r.json(); })
  ]).then(function (res) {
    E.init(res[0], res[1]);
    document.body.classList.add('is-ready');
    var q = params.get('q');
    if (q) {
      // keep the URL clean so a refresh doesn't re-ask
      history.replaceState(null, '', '/chat?from=' + encodeURIComponent(from));
      ask(q);
    } else emptyState();
  });
})();
