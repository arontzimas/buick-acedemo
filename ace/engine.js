/* Buick ACE — scripted composition engine.
   Turns a question into an ordered list of component blocks (Figma: Components page).
   The six Figma templates are reproduced verbatim; everything else is composed from
   buick.com content (vehicles.json) and buick.com imagery (images.json). */
(function (global) {
  'use strict';

  var IMG = '/ace/img/';
  var FIG = IMG + 'figma/';
  var VIDEO = {
    enclaveHighlight: '6399108686112',
    masthead: { 'envista': '6373867925112', 'encore-gx': '6371222418112', 'envision': '6375637483112', 'enclave': '6399107685112' },
    quietTuning: '6391552433112'
  };
  var ORDER = ['envista', 'encore-gx', 'envision', 'enclave'];
  var NAME = { 'envista': 'Envista', 'encore-gx': 'Encore GX', 'envision': 'Envision', 'enclave': 'Enclave' };
  var VEH_RX = {
    'envista': /\benvista\b/i,
    'encore-gx': /\bencore(\s*-?\s*gx)?\b|\bgx\b/i,
    'envision': /\benvision\b/i,
    'enclave': /\benclave\b/i
  };
  var TRIMS = ['Preferred', 'Sport Touring', 'Avenir'];
  var TRIM_RX = { 'Preferred': /\bpreferred\b/i, 'Sport Touring': /\bsport\s*touring\b|\bst\b/i, 'Avenir': /\bavenir\b/i };
  var TRIM_COLORS = { 'Preferred': ['gzb', 'gza', 'gxd'], 'Sport Touring': ['gk9', 'gkt', 'gfr', 'g42'], 'Avenir': ['gas', 'gnt'] };
  var DEFAULT_JELLY = { 'envista': ['Sport Touring', 'gk9'], 'encore-gx': ['Avenir', 'gzb'], 'envision': ['Sport Touring', 'gas'], 'enclave': ['Avenir', 'g4j'] };

  // curated buick.com photography per vehicle (see images.json for the full library)
  var PHOTO = {
    'envista': {
      hero: 'envista/gallery/envista-gallery-exterior-12.jpg', alt: 'A blue 2026 Buick Envista parked outside a storefront at night',
      exterior: ['envista/gallery/envista-gallery-exterior-8.jpg', 'envista/gallery/envista-gallery-exterior-18.jpg', 'envista/gallery/envista-gallery-final.jpg'],
      interior: ['envista/gallery/envista-gallery-interior-19.jpg', 'envista/gallery/envista-gallery-interior-12.jpg', 'envista/gallery/envista-gallery-interior-14.jpg'],
      trims: { 'Preferred': 'envista/trims/envista-trim-walk-preferred-flatbottom-steering-wheel.jpg', 'Sport Touring': 'envista/trims/envista-trim-walk-sport-touring-ss.jpg', 'Avenir': 'envista/trims/envista-avenir-trim-walk.jpg' },
      tech: 'envista/features/envista-design-infotainment.jpg', moonroof: 'envista/gallery/envista-gallery-interior-14.jpg', cargo: 'envista/gallery/envista-gallery-exterior-17.jpg'
    },
    'encore-gx': {
      hero: 'encore-gx/gallery/encore-gx-gallery-exterior-ss.jpg', alt: 'A 2026 Buick Encore GX Sport Touring on a city street',
      exterior: ['encore-gx/gallery/encore-gx-gallery-exterior-2.jpg', 'encore-gx/gallery/encore-gx-gallery-exterior-14.jpg', 'encore-gx/gallery/encore-gx-gallery-exterior-12.jpg'],
      interior: ['encore-gx/gallery/encore-gx-gallery-interior-2.jpg', 'encore-gx/gallery/encore-gx-gallery-interior-3.jpg', 'encore-gx/gallery/encore-gx-gallery-interior-5.jpg'],
      trims: { 'Preferred': 'encore-gx/trims/encore-gx-trim-walk-preferred-infotainment-display.jpg', 'Sport Touring': 'encore-gx/trims/encore-gx-trim-walk-st-ss.jpg', 'Avenir': 'encore-gx/trims/encore-gx-trim-walk-avenir-grille-front-fascia.jpg' },
      tech: 'encore-gx/features/encore-gx-design-infotainment-display.jpg', moonroof: 'encore-gx/gallery/encore-gx-gallery-interior-5.jpg', cargo: 'encore-gx/gallery/encore-gx-gallery-interior-ss.jpg',
      parking: 'encore-gx/gallery/encore-gx-gallery-interior-6.jpg'
    },
    'envision': {
      hero: 'envision/gallery/envision-gallery-exterior-25buev95058.jpg', alt: 'A red 2026 Buick Envision on a tree-lined street',
      exterior: ['envision/gallery/envision-gallery-exterior-25buev95007.jpg', 'envision/gallery/envision-gallery-exterior-25buev95061.jpg', 'envision/gallery/envision-gallery-exterior.jpg'],
      interior: ['envision/gallery/envision-gallery-interior.jpg', 'envision/gallery/envision-gallery-interior-25buev95062.jpg', 'envision/gallery/envision-gallery-interior-25buev95069.jpg'],
      trims: { 'Preferred': 'envision/trims/envision-trim-walk-preferred-grille.jpg', 'Sport Touring': 'envision/trims/envision-trim-walk-st-grille.jpg', 'Avenir': 'envision/trims/envision-trim-walk-avenir-grille.jpg' },
      tech: 'envision/gallery/envision-gallery-interior.jpg', moonroof: 'envision/gallery/envision-gallery-interior-25buev95069.jpg', cargo: 'envision/gallery/envision-gallery-exterior-25buev95061.jpg'
    },
    'enclave': {
      hero: 'enclave/gallery/enclave-landing-page-gallery-26buencl140292.jpg', alt: 'A white Buick Enclave driving on a coastal road',
      exterior: ['enclave/gallery/enclave-gallery-27buencl100122.jpg', 'enclave/gallery/enclave-landing-page-gallery-26buencl140296.jpg', 'enclave/gallery/enclave-landing-page-gallery-25buen00074.jpg'],
      interior: ['enclave/gallery/enclave-landing-page-gallery-26buen_int_suv_studio_01_v3_4ld56_1sm_h7d.jpg', 'enclave/gallery/enclave-landing-page-gallery-25buen00077.jpg', 'enclave/gallery/enclave-landing-page-gallery-27buencl100119.jpg'],
      trims: { 'Preferred': 'enclave/gallery/enclave-gallery-27buencl100122.jpg', 'Sport Touring': 'enclave/gallery/enclave-landing-page-gallery-25buen00074.jpg', 'Avenir': 'enclave/gallery/enclave-landing-page-gallery-26buencl140296.jpg' },
      tech: 'enclave/gallery/enclave-landing-page-gallery-27buencl100119.jpg', moonroof: 'enclave/gallery/enclave-gallery.jpg', cargo: 'enclave/gallery/enclave-landing-page-gallery-25buen00068.jpg'
    }
  };
  var SAFETY_IMG = {
    'envista': [['Automatic Emergency Braking', 'envista-safety-automatic-emergency-braking'], ['Front Pedestrian Braking', 'envista-safety-front-pedestrian-braking'], ['Forward Collision Alert', 'envista-safety-forward-collision-alert'], ['Following Distance Indicator', 'envista-safety-following-distance-indicator'], ['Lane Keep Assist with Lane Departure Warning', 'envista-safety-lane-keep-assist'], ['IntelliBeam Auto High Beams', 'envista-safety-intellibeam']],
    'encore-gx': [['Automatic Emergency Braking', 'encore-gx-safety-automatic-emergency-braking'], ['Front Pedestrian Braking', 'encore-gx-safety-front-pedestrian-braking'], ['Forward Collision Alert', 'encore-gx-safety-forward-collision-alert'], ['Following Distance Indicator', 'encore-gx-safety-following-distance-indicator'], ['Lane Keep Assist with Lane Departure Warning', 'encore-gx-safety-lane-keep-assist'], ['IntelliBeam Auto High Beams', 'encore-gx-safety-intellibeam']],
    'envision': [['Blind Zone Steering Assist', 'envision-safety-BZSA'], ['Front Pedestrian and Bicyclist Braking', 'envision-safety-Front-Ped-Braking'], ['Rear Cross Traffic Braking', 'envision-safety-Rear-Cross-Traffic'], ['Intersection Automatic Emergency Braking', 'envision-safety-AEB'], ['Side Bicyclist Alert', 'envision-safety-Side-Bike-Alert']],
    'enclave': [['Front Pedestrian and Bicyclist Braking', 'enclave-safety-front-pedestrian-braking', '6400668406112'], ['Blind Zone Steering Assist', 'enclave-safety-blind-zone-steering-assist', '6400669012112'], ['Intersection Automatic Emergency Braking', 'enclave-safety-intersection-braking', '6400669288112'], ['Rear Cross Traffic Braking', 'enclave-safety-rear-cross-traffic-braking', '6400668206112'], ['Side Bicyclist Alert', 'enclave-safety-side-bicyclist-alert', '6400667627112']]
  };

  var D = null, L = null; // vehicles.json, images.json

  /* ---------------- helpers ---------------- */
  function V(id) { return D[id]; }
  function img(p) { return p.charAt(0) === '/' ? p : IMG + p; }
  function full(id) { var v = V(id); return v.year + ' ' + v.name; }
  function lower(s) { return (s || '').toLowerCase(); }
  function esc(s) { return String(s).replace(/[&<>"]/g, function (c) { return { '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;' }[c]; }); }
  function firstSentences(s, n) {
    if (!s) return '';
    var parts = String(s).split(/(?<=[.!?])\s+(?=[A-Z\u201C"(])/);
    return parts.slice(0, n || 1).join(' ').trim();
  }
  function priceNum(p) { return parseInt(String(p).replace(/[^0-9]/g, ''), 10) || 0; }
  function trimOf(id, name) { var t = V(id).trims; for (var i = 0; i < t.length; i++) if (t[i].name === name) return t[i]; return t[0]; }

  function jelly(id, trim, colorPrefs) {
    var list = (L[id] && L[id].jelly) || [];
    var pick = null;
    var prefs = colorPrefs || TRIM_COLORS[trim] || [];
    for (var i = 0; i < prefs.length && !pick; i++) {
      for (var j = 0; j < list.length; j++) if (list[j].trim === trim && list[j].colorCode === prefs[i]) { pick = list[j]; break; }
    }
    if (!pick) for (var k = 0; k < list.length; k++) if (list[k].trim === trim) { pick = list[k]; break; }
    return pick || list[0];
  }
  function specsImg(id, trim) {
    var key = trim === 'Sport Touring' ? '-st-' : trim === 'Avenir' ? '-avenir-' : '-preferred-';
    var list = (L[id] && L[id].specs) || [];
    for (var i = 0; i < list.length; i++) if (list[i].src.indexOf(key) !== -1) return list[i].src;
    return list[0] && list[0].src;
  }
  function libImg(id, cat, name) {
    var list = (L[id] && L[id][cat]) || [];
    for (var i = 0; i < list.length; i++) if (list[i].name === name) return list[i].src;
    return null;
  }

  /* ---------------- entity detection ---------------- */
  function detect(q) {
    var vs = [];
    ORDER.forEach(function (id) {
      var m = q.match(VEH_RX[id]);
      if (m) vs.push({ id: id, at: m.index });
    });
    vs.sort(function (a, b) { return a.at - b.at; });
    var ts = [];
    TRIMS.forEach(function (t) { var m = q.match(TRIM_RX[t]); if (m) ts.push({ t: t, at: m.index }); });
    ts.sort(function (a, b) { return a.at - b.at; });
    return { vehicles: vs.map(function (x) { return x.id; }), trims: ts.map(function (x) { return x.t; }) };
  }

  function words(s) { return lower(s).replace(/[’']/g, '').replace(/[^a-z0-9 ]+/g, ' ').split(/\s+/).filter(Boolean); }
  var STOP = { the: 1, a: 1, an: 1, is: 1, are: 1, of: 1, to: 1, in: 1, on: 1, for: 1, and: 1, or: 1, me: 1, my: 1, i: 1, you: 1, it: 1, its: 1, does: 1, do: 1, can: 1, what: 1, whats: 1, how: 1, buick: 1, tell: 1, about: 1, with: 1, this: 1, that: 1, be: 1, have: 1, has: 1 };
  var SYN = { mpg: 'fuel', mileage: 'fuel', economy: 'fuel', efficient: 'fuel', sunroof: 'moonroof', roof: 'moonroof', price: 'much', cost: 'much', msrp: 'much', tow: 'towing', trailer: 'towing', hitch: 'towing', allwheel: 'awd', seats: 'seat', seating: 'seat', passengers: 'seat', passenger: 'seat', rows: 'row', third: 'row', long: 'length', big: 'size', size: 'length', dimensions: 'length', electric: 'electric', ev: 'electric', hp: 'horsepower', motor: 'engine' };
  function keyset(s) {
    var out = {};
    words(s).forEach(function (w) { if (STOP[w]) return; out[SYN[w] || w] = 1; });
    return out;
  }
  function findFaq(q, ids) {
    var qk = keyset(q), best = null, bestScore = 0;
    ids.forEach(function (id, rank) {
      (V(id).faqs || []).forEach(function (f) {
        var fk = keyset(f.q), s = 0;
        for (var k in qk) if (fk[k] && !(k in NAME_WORDS)) s += 1;
        s -= rank * 0.01;
        if (s > bestScore) { bestScore = s; best = { id: id, faq: f, score: s }; }
      });
    });
    return bestScore >= 1 ? best : null;
  }
  var NAME_WORDS = { envista: 1, encore: 1, gx: 1, envision: 1, enclave: 1 };

  function findFeature(q, ids) {
    var qk = keyset(q), best = null, bestScore = 0;
    ids.forEach(function (id, rank) {
      (V(id).features || []).forEach(function (f) {
        var fk = keyset(f.title + ' ' + f.description), s = 0;
        for (var k in qk) if (fk[k] && !(k in NAME_WORDS)) s += (keyset(f.title)[k] ? 1.5 : 0.5);
        s -= rank * 0.01;
        if (s > bestScore) { bestScore = s; best = { id: id, feature: f, score: s }; }
      });
    });
    return bestScore >= 1.5 ? best : null;
  }

  /* ---------------- block builders ---------------- */
  function T(text) { return { type: 'text', text: text }; }
  function H(html) { return { type: 'text', html: html }; }
  function follow(items, loose) { return { type: 'follow', items: items.filter(Boolean).slice(0, 4), loose: !!loose }; }
  function headline(id, opts) {
    opts = opts || {};
    var v = V(id);
    return { type: 'headline', title: opts.title || v.name, sub: opts.sub || ('Starting at ' + v.startingPrice + '*'), cta: { label: 'Shop', href: v.url }, divider: opts.divider !== false, tight: !!opts.tight };
  }
  function media(src, alt, extra) { var b = { type: 'media', img: img(src), alt: alt || '' }; for (var k in extra || {}) b[k] = extra[k]; return b; }

  /* ---------------- the six Figma templates (verbatim) ---------------- */
  var FIGMA = {
    compareEnvision: function () {
      return {
        display: 'What’s the difference between the Envision Preferred and the Avenir?',
        vehicle: 'envision',
        blocks: [
          T('The biggest differences between the Preferred and Avenir trims come down to luxury, comfort, and premium features. Mechanically, they\'re nearly identical.'),
          { type: 'compare', cols: [
            { title: 'Envision Preferred', img: FIG + 't1-envision-preferred.webp', alt: 'Moonstone Gray Buick Envision Preferred', price: '$41,000',
              listTitle: 'Trim Highlights', items: ['Engine - 2.0L Turbo (228 hp)', 'Drivetrain - 9-speed automatic, AWD', 'Safety features - Same comprehensive suite ', 'Seat material - Perforated leatherette', 'Suspension - Standard', 'Wheels - 18-inch'] },
            { title: 'Envision Avenir', img: FIG + 't1-envision-avenir.webp', alt: 'Brilliant Red Buick Envision Avenir', alt2: true, price: '$50,700',
              listTitle: 'Trim Highlights', items: ['Engine - 2.0L Turbo (228 hp)', 'Drivetrain - 9-speed automatic, AWD', 'Safety features - Same comprehensive suite ', 'Seat material - Quilted perforated leather', 'Suspension - Adaptive', 'Wheels - 20-inch'] }
          ] },
          follow(['Tell me more about the Envision Preferred', 'Tell me more about the Envision Avenir', 'Tell me about the Envision Sport Touring', 'Find dealerships near me'], true)
        ]
      };
    },
    smallest: function () {
      return {
        display: 'What’s the smallest SUV in the lineup?',
        vehicle: 'encore-gx',
        blocks: [
          T('That’s the Encore GX, at just over 14 feet (4.35 m). The Envista sits lowest, but it\'s nearly a foot longer.'),
          headline('encore-gx', { sub: 'Starting at $26,200*' }),
          { type: 'specs', title: 'Specs', desc: 'That’s the Encore GX, at just over 14 feet (4.35 m).', img: FIG + 't2-specs-encore-gx.jpg', alt: 'Buick Encore GX side and rear views: 171.1 inches long, 71.3 inches wide, 64.1 inches tall' },
          headline('envista', { sub: 'Starting at $24,600*' }),
          { type: 'specs', title: 'Specs', desc: 'The Envista sits lowest, but it\'s nearly a foot longer.', img: FIG + 't2-specs-envista.jpg', alt: 'Buick Envista side and rear views: 182.6 inches long, 71.5 inches wide, 61.2 inches tall' },
          T('Compact cars offer major practical and financial benefits.'),
          { type: 'cards', items: [
            { img: FIG + 't2-card-parking.jpg', alt: 'Encore GX infotainment screen showing the rear camera', text: 'What are the parking assistance features for the Encore GX parking?' },
            { img: FIG + 'seats-interior.jpg', alt: 'Light interior seating', text: 'How many passengers can the Encore GX hold?' },
            { img: FIG + 't2-card-encore-gx-st.jpg', alt: 'Buick Encore GX parked on a city street', text: 'How fuel-efficient is the Encore GX?' }
          ] },
          follow(['Tell me more about the Encore GX', 'Tell me more about the Envista'])
        ]
      };
    },
    safetyEnvista: function () {
      var extra = SAFETY_IMG.envista.filter(function (s) { return !/Forward Collision|IntelliBeam/.test(s[0]); }).map(function (s) {
        return { img: libImg('envista', 'safety', s[1]), title: s[0], sub: 'Included in Buick Driver Confidence' };
      });
      return {
        display: 'Tell me about safety features',
        vehicle: 'envista',
        blocks: [
          T('The 2026 Buick Envista comes with a solid set of standard driver-assistance features, especially considering its starting price of around $26,000. Every trim (Preferred, Sport Touring, and Avenir) includes Buick\'s Buick Driver Confidence safety suite as standard.'),
          { type: 'carousel', items: [
            { img: FIG + 'rear-park-assist.jpg', title: 'Rear Park Assist ', sub: 'Guides your parking effortlessly', alt: 'A blue Envista reversing past a parked car' },
            { img: FIG + 'forward-collision-alert.jpg', title: 'Forward Collision Alerts ', sub: 'Automatic Emergency Braking detects objects in front of you', alt: 'Envista driver information center at 40 mph' }
          ].concat(extra) },
          follow(['What is included in the Buick Driver Confidence safety suite?', 'Show me safety upgrades'])
        ]
      };
    },
    premiumBrand: function () {
      return {
        display: 'Is Buick considered a luxury or\npremium brand?',
        vehicle: null,
        blocks: [
          T('Buick is a premium brand that combines refined design, elevated comfort, and advanced technology in a more accessible package.'),
          media(FIG + 'enclave-highlight.jpg', 'A white Buick Enclave driving on a road beside snowy dunes', { video: VIDEO.enclaveHighlight }),
          { type: 'headline', title: '2026 Premium SUVs ', cta: { label: 'Shop', href: '/suvs' }, divider: false, tight: true },
          follow(['Show me the most advanced technology', 'Tell me about the QuietTuning™', 'Which Buick models offer the most premium features?'])
        ]
      };
    },
    bestForMe: function () {
      return {
        display: 'What is the best Buick model for\nme?',
        vehicle: null,
        blocks: [
          T('It depends on what you need.'),
          { type: 'cta', step: 'budget', question: 'Choose a budget range', options: ['20K-30K', '30K-50K', '50K+'] }
        ]
      };
    },
    dealer: function (id) {
      var name = id ? NAME[id] : 'Enclave';
      return {
        display: id && id !== 'enclave' ? null : 'Can I talk to someone about the\nEnclave?',
        vehicle: id || null,
        blocks: [
          H('Of course. Below is a local dealership in your area, representative and answer your questions. You can also use the <a href="https://www.buick.com/locate-buick-dealer" target="_blank" rel="noopener">dealer locator</a> for other locations.'),
          { type: 'text', lines: ['Empire Buick GMC of Long Island City', '45-02 Northern Blvd', 'Long Island City, NY 11101'] },
          { type: 'text', lines: ['Sales: 866-590-2588', 'Service: 866-590-2589', 'Parts: 833-590-2589'] },
          follow(['Contact Buick', 'Show me dealers', 'Report an issue'])
        ],
        _name: name
      };
    }
  };

  /* ---------------- quiz (Conversation / AI CTA) ---------------- */
  var QUIZ = {
    budget: { next: 'size', question: 'Choose a size', options: ['Compact', 'Large', 'Any+'] },
    size: { next: 'priority', question: 'What matters most to you?', options: ['Everyday needs', 'Premium luxury', 'Any'] }
  };
  var BEST_FOR = { 'envista': 'Style and value', 'encore-gx': 'Everyday versatility', 'envision': 'Premium comfort and technology', 'enclave': 'Space for the whole family' };
  var RECO_COPY = {
    'envista': 'The Envista is Buick\'s entry-level crossover with a sleek, coupe-like design. It\'s designed more for city driving than performance and offers a premium feel at an affordable price.'
  };
  function recommend(ans) {
    var budget = { '20K-30K': ['envista', 'encore-gx'], '30K-50K': ['envision', 'enclave'], '50K+': ['enclave', 'envision'] }[ans.budget] || ORDER;
    var size = { 'Compact': ['envista', 'encore-gx', 'envision'], 'Large': ['enclave'], 'Any+': ORDER }[ans.size] || ORDER;
    var pref = { 'Everyday needs': ['encore-gx', 'envista', 'envision', 'enclave'], 'Premium luxury': ['enclave', 'envision', 'encore-gx', 'envista'], 'Any': ['envista', 'encore-gx', 'envision', 'enclave'] }[ans.priority] || ORDER;
    var cands = budget.filter(function (v) { return size.indexOf(v) !== -1; });
    if (!cands.length) cands = size;
    cands.sort(function (a, b) { return pref.indexOf(a) - pref.indexOf(b); });
    return cands[0];
  }
  function quizStep(step, answer, state) {
    state.quiz = state.quiz || {};
    state.quiz[step] = answer;
    if (QUIZ[step]) {
      var n = QUIZ[step];
      return { blocks: [{ type: 'cta', step: n.next, question: n.question, options: n.options }] };
    }
    var id = recommend(state.quiz);
    state.vehicle = id;
    var v = V(id);
    var desc = RECO_COPY[id] || firstSentences(whatIs(id), 2);
    var blocks = [
      { type: 'text', lines: ['Buick ' + v.name, 'Best for: ' + BEST_FOR[id], '', desc] },
      id === 'envista'
        ? media(FIG + 't5-envista-mural.jpg', 'A Buick Envista in front of a blue mural', { kenburns: true })
        : media(PHOTO[id].hero, PHOTO[id].alt, { video: VIDEO.masthead[id] })
    ];
    if (id !== 'envista') blocks.push(follow(['Tell me more about the ' + v.name, 'How much is a Buick ' + v.name + '?', 'Find dealerships near me']));
    return { blocks: blocks, vehicle: id };
  }

  /* ---------------- composed answers ---------------- */
  function whatIs(id) {
    var v = V(id);
    var f = (v.faqs || []).filter(function (x) { return /^(what is a|is the buick .* a car)/i.test(x.q); })[0];
    return f ? f.a : v.tagline;
  }

  function overview(id, trim) {
    var v = V(id), P = PHOTO[id];
    if (trim) {
      var t = trimOf(id, trim);
      var hl = (t.highlights || []).slice(0, 3);
      return { vehicle: id, trim: trim, blocks: [
        T('The ' + v.name + ' ' + t.name + ': ' + (t.descriptor || '').replace(/\.$/, '') + '. Highlights include ' + hl.slice(0, -1).map(decap).join(', ') + (hl.length > 1 ? ' and ' : '') + decap(hl[hl.length - 1]) + '.'),
        headline(id, { title: v.name + ' ' + t.name, sub: 'Starting at ' + t.startingPrice + '*' }),
        media(P.trims[t.name] || P.hero, v.name + ' ' + t.name),
        { type: 'compare', single: true, cols: [{ title: 'Trim Highlights', hideImage: true, items: t.highlights }] },
        follow(otherTrims(id, trim).map(function (o) { return 'Tell me about the ' + v.name + ' ' + o; }).concat(['Compare ' + v.name + ' trims', 'Find dealerships near me']))
      ] };
    }
    var faqs = (v.faqs || []).filter(function (f) { return !/^(what is a|how much)/i.test(f.q); });
    return { vehicle: id, blocks: [
      T(firstSentences(whatIs(id), 2) + ' It starts at ' + v.startingPrice + ' and seats up to ' + v.seats + '.'),
      headline(id, { title: full(id) }),
      media(P.hero, P.alt, { video: VIDEO.masthead[id], poster: true }),
      T('Explore the ' + v.name + ' by trim.'),
      { type: 'cards', items: v.trims.map(function (t) {
        return { img: img(P.trims[t.name] || P.hero), alt: v.name + ' ' + t.name, text: 'Tell me about the ' + v.name + ' ' + t.name };
      }) },
      follow([faqs[0] && faqs[0].q, faqs[1] && faqs[1].q, 'Compare ' + v.name + ' trims', 'Find dealerships near me'])
    ] };
  }
  function decap(x) { x = String(x || ''); if (/^(Google|Apple|Android|Buick|Bose|QuietTuning|Super Cruise|Avenir|Wireless Apple)/.test(x)) return x; return x.length > 1 && /[a-z]/.test(x.charAt(1)) ? x.charAt(0).toLowerCase() + x.slice(1) : x; }
  function parkingAnswer(id) {
    id = id || 'encore-gx';
    var v = V(id);
    if (id === 'encore-gx') {
      return { vehicle: id, blocks: [
        T('The Encore GX is easy to park and navigate tight streets, and it fits in most residential garages and parking spaces. The available Advanced Technology Package adds Rear Park Assist, HD Surround Vision and Adaptive Cruise Control.'),
        media(PHOTO['encore-gx'].parking, 'Close-up interior view of the infotainment display in the Buick 2026 Encore GX'),
        headline('encore-gx', { divider: false, tight: true }),
        follow(['How many passengers can the Encore GX hold?', 'How fuel-efficient is the Encore GX?', 'Tell me about safety features'])
      ] };
    }
    return safetyAnswer(id);
  }
  function otherTrims(id, trim) { return V(id).trims.map(function (t) { return t.name; }).filter(function (n) { return n !== trim; }); }

  function compareTrims(id, names) {
    var v = V(id);
    names = names && names.length >= 2 ? names : v.trims.map(function (t) { return t.name; });
    var ts = names.map(function (n) { return trimOf(id, n); });
    var a = ts[0], b = ts[ts.length - 1];
    var lead = ts.length === 2
      ? 'The ' + v.name + ' ' + a.name + ' starts at ' + a.startingPrice + ', while the ' + b.name + ' starts at ' + b.startingPrice + '. Here’s what each trim brings.'
      : 'The ' + full(id) + ' comes in ' + ts.length + ' trims, starting at ' + a.startingPrice + '. Here’s what each one brings.';
    return { vehicle: id, blocks: [
      T(lead),
      { type: 'compare', cols: ts.map(function (t, i) {
        var j = jelly(id, t.name);
        return { title: v.name + ' ' + t.name, img: j && j.src, alt: (j ? j.color + ' ' : '') + 'Buick ' + v.name + ' ' + t.name, price: t.startingPrice, listTitle: 'Trim Highlights', items: t.highlights, alt2: i > 0 };
      }) },
      follow(ts.map(function (t) { return 'Tell me more about the ' + v.name + ' ' + t.name; }).slice(0, 2).concat(['Find dealerships near me']), true)
    ] };
  }

  function compareVehicles(ids) {
    ids = ids.slice(0, 3);
    var vs = ids.map(V);
    var byPrice = vs.slice().sort(function (a, b) { return a.startingPriceNum - b.startingPriceNum; });
    var lead = 'The ' + byPrice[0].name + ' starts at ' + byPrice[0].startingPrice + (byPrice.length === 2
      ? ' and the ' + byPrice[1].name + ' at ' + byPrice[1].startingPrice + '.'
      : ', the ' + byPrice[1].name + ' at ' + byPrice[1].startingPrice + ' and the ' + byPrice[2].name + ' at ' + byPrice[2].startingPrice + '.');
    var bySeats = vs.slice().sort(function (a, b) { return b.seats - a.seats; });
    if (bySeats[0].seats !== bySeats[bySeats.length - 1].seats) lead += ' The ' + bySeats[0].name + ' seats up to ' + bySeats[0].seats + '.';
    else {
      var byLen = vs.slice().sort(function (a, b) { return a.dimensions.lengthIn - b.dimensions.lengthIn; });
      lead += ' The ' + byLen[0].name + ' is the more compact of the ' + (vs.length === 2 ? 'two' : 'group') + ' at ' + byLen[0].dimensions.lengthIn + '" long.';
    }
    return { vehicle: ids[0], blocks: [
      T(lead),
      { type: 'compare', cols: ids.map(function (id, i) {
        var v = V(id), dj = DEFAULT_JELLY[id], j = jelly(id, dj[0], [dj[1]]);
        return { title: full(id), img: j && j.src, alt: (j ? j.color + ' ' : '') + 'Buick ' + v.name, price: v.startingPrice, listTitle: 'Highlights', alt2: i > 0, items: [
          'Body style - ' + v.segment,
          'Seating - Up to ' + v.seats,
          'Engine - ' + shortEngine(v.engine),
          'Drivetrain - ' + v.drivetrain,
          'GM-est. MPG - ' + v.mpg,
          'Length - ' + v.dimensions.lengthIn + '"'
        ] };
      }) },
      follow(ids.map(function (id) { return 'Tell me more about the ' + NAME[id]; }).concat(['Find dealerships near me']), true)
    ] };
  }
  function shortEngine(e) { return String(e || '').replace(/\s*\(.*$/, '').replace(/ with a .*$/, ''); }

  function sizeAnswer(q, ids) {
    var all = !ids.length;
    if (/\b(largest|biggest|most (room|space)|third|3rd|three.?row|7|seven)\b/i.test(q) && all) ids = ['enclave'];
    if (all && !ids.length) ids = ORDER.slice();
    if (ids.length > 2) {
      return { vehicle: null, blocks: [
        T('From most compact to largest: Encore GX (' + V('encore-gx').dimensions.lengthIn + '"), Envista (' + V('envista').dimensions.lengthIn + '"), Envision (' + V('envision').dimensions.lengthIn + '") and Enclave (' + V('enclave').dimensions.lengthIn + '"). Only the Enclave offers three rows.'),
        { type: 'carousel', items: ['encore-gx', 'envista', 'envision', 'enclave'].map(function (id) {
          var v = V(id);
          return { img: specsImg(id), title: v.name, sub: v.dimensions.lengthIn + '" L × ' + v.dimensions.widthIn + '" W × ' + v.dimensions.heightIn + '" H', jelly: true, q: 'How big is the ' + v.name + '?' };
        }) },
        follow(['What’s the smallest SUV in the lineup?', 'Which Buick has third-row seating?', 'Compare the Envista and the Encore GX'])
      ] };
    }
    var blocks = [];
    var lead = ids.map(function (id) {
      var v = V(id), dm = v.dimensions;
      return 'The ' + full(id) + ' is ' + dm.lengthIn + '" long, ' + dm.widthIn + '" wide and ' + dm.heightIn + '" tall' + (id === 'enclave' ? ', the largest SUV in the Buick lineup with three rows of seating.' : '.');
    }).join(' ');
    if (/seat|passenger|row|people/i.test(q)) {
      lead = ids.map(function (id) {
        var v = V(id);
        var f = (v.faqs || []).filter(function (x) { return /seat|third-row/i.test(x.q); })[0];
        return f ? f.a : 'The ' + v.name + ' seats up to ' + v.seats + '.';
      }).join(' ');
    }
    blocks.push(T(lead));
    ids.forEach(function (id) {
      var v = V(id), dm = v.dimensions;
      blocks.push(headline(id));
      blocks.push({ type: 'specs', title: 'Specs', desc: dm.lengthIn + '" long, ' + dm.widthIn + '" wide and ' + dm.heightIn + '" tall' + (v.cargo ? ', with ' + v.cargo + '.' : '.'), img: specsImg(id), alt: 'Buick ' + v.name + ' side and rear dimensions' });
    });
    blocks.push(follow(['How much is a Buick ' + V(ids[0]).name + '?', 'What’s the smallest SUV in the lineup?', 'Compare ' + V(ids[0]).name + ' trims']));
    return { vehicle: ids[0], blocks: blocks };
  }

  function priceAnswer(id) {
    if (!id) {
      return { vehicle: null, blocks: [
        T('The 2026 Buick SUV lineup starts at ' + V('envista').startingPrice + ' with the Envista. Here’s where each model begins.'),
        lineupCarousel(function (v) { return 'Starting at ' + v.startingPrice; }),
        follow(['What is the best Buick model for me?', 'Compare the Envista and the Encore GX', 'Find dealerships near me'])
      ] };
    }
    var v = V(id);
    var f = (v.faqs || []).filter(function (x) { return /^how much is/i.test(x.q); })[0];
    var out = compareTrims(id);
    out.blocks[0] = T(f ? f.a : ('The ' + full(id) + ' starts at ' + v.startingPrice + '.'));
    if (v.offer) out.blocks.splice(2, 0, T('Current offer: ' + v.offer));
    return out;
  }

  function lineupCarousel(subFn) {
    return { type: 'carousel', items: ORDER.map(function (id) {
      var v = V(id);
      return { img: img(PHOTO[id].hero), alt: PHOTO[id].alt, title: v.year + ' ' + v.name, sub: subFn(v), q: 'Tell me more about the ' + v.name };
    }) };
  }

  function mpgAnswer(id) {
    if (!id) {
      return { vehicle: null, blocks: [
        T('The Envista leads the lineup at ' + V('envista').mpg + ' GM-est. MPG city/hwy, with the Encore GX close behind at ' + V('encore-gx').mpg.split(';')[0] + '.'),
        lineupCarousel(function (v) { return 'GM-est. MPG ' + v.mpg; }),
        follow(['What’s the smallest SUV in the lineup?', 'How much is a Buick Envista?'])
      ] };
    }
    var v = V(id);
    return { vehicle: id, blocks: [
      T('The ' + full(id) + ' is rated at ' + v.mpg + ' GM-est. MPG city/hwy with its ' + shortEngine(v.engine) + ' engine.'),
      headline(id),
      media(PHOTO[id].exterior[0], 'Buick ' + v.name),
      follow(['How much is a Buick ' + v.name + '?', 'Compare ' + v.name + ' trims', id === 'envista' ? 'Compare the Envista and the Encore GX' : 'Compare the ' + v.name + ' and the Envista'])
    ] };
  }

  function colorsAnswer(id) {
    id = id || 'envista';
    var v = V(id), dj = DEFAULT_JELLY[id];
    var list = (L[id].jelly || []).filter(function (j) { return j.trim === dj[0]; });
    return { vehicle: id, blocks: [
      T('The ' + full(id) + ' ' + dj[0] + ' comes in ' + list.length + ' exterior colors. Here’s each one.'),
      { type: 'carousel', items: list.map(function (j) { return { img: j.src, alt: j.color + ' Buick ' + v.name, title: j.color, sub: v.name + ' ' + j.trim, jelly: true }; }) },
      headline(id),
      follow(otherTrims(id, dj[0]).map(function (t) { return 'Tell me about the ' + v.name + ' ' + t; }).concat(['Find dealerships near me']))
    ] };
  }

  function safetyAnswer(id) {
    var v = V(id), list = SAFETY_IMG[id];
    var branded = v.safety && v.safety.suite && /^Buick /.test(v.safety.suite);
    var items0 = (v.safety && v.safety.items) || [];
    var lead = branded
      ? 'Every ' + full(id) + ' includes ' + v.safety.suite + ', a standard suite of advanced safety and driver assistance features.'
      : v.safety && v.safety.suite && items0.length >= 2
      ? 'Every ' + full(id) + ' comes standard with a suite of advanced safety and driver assistance technologies, including ' + items0[0] + ' and ' + items0[3 % items0.length] + '.'
      : 'The ' + full(id) + ' offers a suite of advanced safety and driver assistance technologies, including available Super Cruise® hands-free driver assistance.';
    return { vehicle: id, blocks: [
      T(lead),
      { type: 'carousel', items: list.map(function (s) {
        return { img: libImg(id, 'safety', s[1]) || img(PHOTO[id].hero), title: s[0], sub: v.name, alt: s[0], video: s[2] || null };
      }) },
      follow(['Tell me more about the ' + v.name, 'Compare ' + v.name + ' trims', 'Find dealerships near me'])
    ] };
  }

  function driverConfidence(id) {
    id = id || 'envista';
    var v = V(id);
    var items = (v.safety && v.safety.items) || [];
    return { vehicle: id, blocks: [
      T('Buick Driver Confidence includes ' + items.slice(0, -1).join(', ') + ' and ' + items[items.length - 1] + '.'),
      { type: 'carousel', items: SAFETY_IMG[id].map(function (s) { return { img: libImg(id, 'safety', s[1]), title: s[0], sub: 'Standard on every ' + v.name + ' trim', alt: s[0] }; }) },
      T('Safety or driver assistance features are no substitute for the driver’s responsibility to operate the vehicle in a safe manner.'),
      follow(['Show me safety upgrades', 'Tell me more about the ' + v.name])
    ] };
  }

  function safetyUpgrades() {
    return { vehicle: 'envision', blocks: [
      T('For more advanced assistance, the Envision and Enclave add technologies like Blind Zone Steering Assist and Rear Cross Traffic Braking, and the Enclave offers available Super Cruise® hands-free driver assistance.'),
      { type: 'carousel', items: SAFETY_IMG.enclave.map(function (s) { return { img: libImg('enclave', 'safety', s[1]), title: s[0], sub: 'Enclave', alt: s[0], video: s[2] }; })
        .concat(SAFETY_IMG.envision.slice(0, 2).map(function (s) { return { img: libImg('envision', 'safety', s[1]), title: s[0], sub: 'Envision', alt: s[0] }; })) },
      follow(['Tell me more about the Enclave', 'Tell me more about the Envision', 'Find dealerships near me'])
    ] };
  }

  function techAnswer() {
    return { vehicle: 'enclave', blocks: [
      T('The Envision and Enclave feature an Ultrawide 30" diagonal screen, the largest in its class, and the Enclave offers available Super Cruise® hands-free driver assistance technology.'),
      { type: 'carousel', items: [
        { img: img(PHOTO.enclave.tech), title: 'Ultrawide 30" diagonal screen', sub: 'Enclave', alt: 'Enclave Ultrawide 30-inch diagonal screen', video: '6403161249112' },
        { img: img(PHOTO.enclave.interior[0]), title: 'Available Super Cruise®', sub: 'Hands-free driver assistance technology, Enclave', alt: 'Enclave cockpit', video: '6399108686112' },
        { img: img(PHOTO.envision.tech), title: 'Google built-in compatibility', sub: 'Envision', alt: 'Envision interior with 30-inch diagonal screen', video: '6375641220112' },
        { img: img(PHOTO.envista.tech), title: 'Ultrawide 11" diagonal HD color touchscreen', sub: 'Envista', alt: 'Envista interior at night', video: '6391193395112' }
      ] },
      follow(['Tell me about the QuietTuning™', 'Which Buick models offer the most premium features?', 'Tell me more about the Enclave'])
    ] };
  }

  function quietTuning() {
    var f = findFeature('QuietTuning Active Noise Cancellation', ['envision', 'enclave', 'envista']);
    return { vehicle: f ? f.id : 'envision', blocks: [
      T(f ? firstSentences(f.feature.description, 1) : 'QuietTuning® with Active Noise Cancellation helps keep the cabin calm and quiet.'),
      media(PHOTO.envision.interior[1], 'Buick Envision interior'),
      follow(['Show me the most advanced technology', 'Which Buick models offer the most premium features?'])
    ] };
  }

  function premiumFeatures() {
    return { vehicle: null, blocks: [
      T('Avenir is the highest expression of Buick luxury, and it’s available across the SUV lineup.'),
      { type: 'carousel', items: ORDER.map(function (id) {
        var t = trimOf(id, 'Avenir'), j = jelly(id, 'Avenir', ['gas', 'gnt', 'g4j']);
        return { img: j.src, title: V(id).name + ' Avenir', sub: 'Starting at ' + t.startingPrice, alt: j.color + ' ' + V(id).name + ' Avenir', jelly: true, q: 'Tell me about the ' + V(id).name + ' Avenir' };
      }) },
      follow(['What’s the difference between the Envision Preferred and the Avenir?', 'Show me the most advanced technology'])
    ] };
  }

  function lineup() {
    return { vehicle: null, blocks: [
      T('Buick’s 2026 lineup is all SUVs, from the compact Envista and Encore GX to the three-row Enclave.'),
      lineupCarousel(function (v) { return v.segment + ' · Starting at ' + v.startingPrice; }),
      follow(['What is the best Buick model for me?', 'What’s the smallest SUV in the lineup?', 'Is Buick considered a luxury or premium brand?'])
    ] };
  }

  function faqAnswer(hit) {
    var id = hit.id, v = V(id), f = hit.faq;
    var P = PHOTO[id];
    var pic = /moonroof|sunroof/i.test(f.q) ? P.moonroof : /seat|heated/i.test(f.q) ? P.interior[1] : /remote|app/i.test(f.q) ? P.interior[0] : /cargo|tow|trailer|hitch/i.test(f.q) ? P.cargo : P.exterior[0];
    var detail = f.detail ? firstSentences(f.detail, 1) : '';
    if (detail && (lower(detail).indexOf(lower(f.a).slice(0, 30)) === 0 || f.a.length > 90)) detail = '';
    var others = (v.faqs || []).filter(function (x) { return x !== f; });
    return { vehicle: id, blocks: [
      T(f.a + (detail && detail.length < 220 ? ' ' + detail : '')),
      media(pic, 'Buick ' + v.name),
      headline(id, { divider: false, tight: true }),
      follow([others[0] && others[0].q, others[1] && others[1].q, 'Tell me more about the ' + v.name])
    ] };
  }

  function featureAnswer(hit) {
    var id = hit.id, v = V(id), f = hit.feature;
    return { vehicle: id, blocks: [
      T(firstSentences(f.description, 2)),
      media(/screen|display|touchscreen|google/i.test(f.title) ? PHOTO[id].tech : /moonroof|sunroof/i.test(f.title) ? PHOTO[id].moonroof : /liftgate|cargo|configur/i.test(f.title) ? PHOTO[id].cargo : PHOTO[id].interior[0], f.title),
      headline(id, { divider: false, tight: true }),
      follow(['Tell me more about the ' + v.name, 'Compare ' + v.name + ' trims'])
    ] };
  }

  function contactBuick() {
    return { vehicle: null, blocks: [
      H('You can reach Buick Customer Assistance through the <a href="https://www.buick.com/contact-us" target="_blank" rel="noopener">Contact Us</a> page, or connect with a local dealer for sales and service questions.'),
      follow(['Show me dealers', 'Find dealerships near me'])
    ] };
  }
  function showDealers() {
    return { vehicle: null, blocks: [
      H('Use the <a href="https://www.buick.com/locate-buick-dealer" target="_blank" rel="noopener">dealer locator</a> to find Buick dealers near you, check hours and request a test drive.'),
      { type: 'text', lines: ['Empire Buick GMC of Long Island City', '45-02 Northern Blvd', 'Long Island City, NY 11101'] },
      follow(['Contact Buick', 'What is the best Buick model for me?'])
    ] };
  }
  function reportIssue() {
    return { vehicle: null, blocks: [
      H('Thanks for flagging it. You can share feedback or report an issue with Buick Customer Assistance on the <a href="https://www.buick.com/contact-us" target="_blank" rel="noopener">Contact Us</a> page.'),
      follow(['Contact Buick', 'Show me dealers'])
    ] };
  }
  function fallback() {
    return { vehicle: null, blocks: [
      T('Here’s a look at the Buick SUV lineup to help you get started.'),
      lineupCarousel(function (v) { return v.segment + ' · Starting at ' + v.startingPrice; }),
      follow(['What is the best Buick model for me?', 'What’s the smallest SUV in the lineup?', 'Tell me about safety features', 'Is Buick considered a luxury or premium brand?'])
    ] };
  }

  /* ---------------- router ---------------- */
  function respond(query, state) {
    var q = query.trim();
    var ql = lower(q).replace(/[’]/g, '\'');
    var ent = detect(q);
    var ctx = ent.vehicles[0] || state.vehicle || state.pageVehicle || null;
    var explicit = ent.vehicles[0] || null;
    var r;

    var isCompare = /\b(differen\w*|differ|compare|comparison|vs\.?|versus|between|better than|or the)\b/.test(ql);

    // Figma templates
    if (isCompare && (explicit === 'envision' || (!explicit && ctx === 'envision')) && ent.trims.indexOf('Preferred') !== -1 && ent.trims.indexOf('Avenir') !== -1 && ent.trims.length === 2) r = FIGMA.compareEnvision();
    else if (/\b(smallest|most compact|tiniest)\b/.test(ql) || (/\bsmall(est)?\b/.test(ql) && /\b(suv|lineup|vehicle|model|buick)\b/.test(ql) && !explicit)) r = FIGMA.smallest();
    else if (/\bdriver confidence\b/.test(ql)) r = driverConfidence(explicit || (ctx === 'envista' || ctx === 'encore-gx' ? ctx : 'envista'));
    else if (/\bsafety upgrade|more safety|advanced safety\b/.test(ql)) r = safetyUpgrades();
    else if (/\b(park|parking|parks)\b/.test(ql)) r = parkingAnswer(explicit || ctx);
    else if (/\b(safe|safety|driver.assist\w*|collision|braking|lane keep|crash)\b/.test(ql)) { var sv = explicit || ctx; r = (!sv || sv === 'envista') ? FIGMA.safetyEnvista() : safetyAnswer(sv); }
    else if (/\b(luxury|premium)\b/.test(ql) && /\b(brand|buick|considered)\b/.test(ql) && !explicit && !/feature/.test(ql)) r = FIGMA.premiumBrand();
    else if (/\b(third.?row|3rd.?row|three.?row|7.?seat\w*|seven.?seat\w*|family of [5-9]|large family|big family)\b/.test(ql) && !(explicit && explicit !== 'enclave')) r = sizeAnswer('third row seats', ['enclave']);
    else if (/\b(best|right|ideal|recommend\w*|suggest)\b/.test(ql) && /\b(model|buick|suv|car|vehicle|for me|me)\b/.test(ql) && !isCompare && !explicit) { r = FIGMA.bestForMe(); state.quiz = {}; }
    else if (/\b(which|what) (buick|suv|model|one) should i\b|help me (choose|pick|decide|find)\b/.test(ql)) { r = FIGMA.bestForMe(); state.quiz = {}; }
    else if (/\b(talk|speak|chat|connect)\b.*\b(someone|somebody|person|human|sales\w*|dealer\w*|expert|representative|rep)\b|\b(dealer|dealership)s? (near|close)\b|\bnear me\b|\btest.?drive\b|\bfind (a )?dealer/.test(ql)) r = FIGMA.dealer(explicit || (/near me/.test(ql) ? null : ctx));
    else if (/\bcontact buick\b|\bcustomer (service|assistance|care)\b/.test(ql)) r = contactBuick();
    else if (/\bshow me (the )?dealers\b|\bdealer locator\b/.test(ql)) r = showDealers();
    else if (/\breport (an )?issue\b|\bproblem with (the )?(site|chat)\b/.test(ql)) r = reportIssue();
    else if (/quiet\s*tuning|noise cancel/.test(ql)) r = quietTuning();
    else if (/\b(most )?(advanced|latest|best) (tech|technology)\b|\bshow me .*technology\b/.test(ql)) r = techAnswer();
    else if (/\bpremium features\b|\bmost premium\b|\bmost luxurious\b/.test(ql)) r = premiumFeatures();
    // comparisons
    else if (isCompare && ent.vehicles.length >= 2) r = compareVehicles(ent.vehicles);
    else if (isCompare && ent.trims.length >= 2 && ctx) r = compareTrims(ctx, ent.trims);
    else if ((isCompare || /\btrims?\b/.test(ql)) && ctx && /\btrims?\b|\bmodels?\b|\bversions?\b/.test(ql)) r = compareTrims(ctx);
    else if (isCompare && explicit && ent.trims.length < 2 && state.vehicle && state.vehicle !== explicit) r = compareVehicles([state.vehicle, explicit]);
    // facts
    else if (/\b(third.?row|3rd.?row|three.?row|7.?seat|seven|how many (people|passengers|seats)|seat(s|ing)? (how many|up to)|passengers?)\b/.test(ql)) r = sizeAnswer(ql, explicit ? [explicit] : (/third|3rd|three|7|seven/.test(ql) ? ['enclave'] : (ctx ? [ctx] : [])));
    else if (/\b(dimension\w*|how (long|big|wide|tall|large)|length|width|height|largest|biggest|size)\b/.test(ql)) r = sizeAnswer(ql, ent.vehicles.length ? ent.vehicles : (/\b(largest|biggest)\b/.test(ql) ? [] : (ctx ? [ctx] : [])));
    else if (/\b(mpg|fuel|gas mileage|mileage|efficien\w*|economy|miles per)\b/.test(ql)) r = mpgAnswer(explicit || ctx);
    else if (/\b(colou?rs?|paint)\b/.test(ql)) r = colorsAnswer(explicit || ctx);
    else if (/\b(prices?|costs?|how much|msrp|afford\w*|cheap\w*|expensive|budget|pay)\b/.test(ql) && !/\b(tow|towing)\b/.test(ql)) r = priceAnswer(explicit || (ent.trims.length ? ctx : null) || (/\b(it|this|the suv)\b/.test(ql) ? ctx : null));
    else if (/\b(lineup|all (the )?(suvs|models|vehicles)|what (suvs|models|vehicles)|options)\b/.test(ql)) r = lineup();
    else if (/\b(tell me|more about|what is|what's|whats|overview|details|show me|learn)\b/.test(ql) && explicit) r = overview(explicit, ent.trims[0] || null);
    else if (/\b(tell me|more about|show me)\b/.test(ql) && ent.trims.length && ctx) r = overview(ctx, ent.trims[0]);

    if (!r) {
      var ids = explicit ? [explicit] : (ctx ? [ctx].concat(ORDER.filter(function (x) { return x !== ctx; })) : ORDER);
      var hit = findFaq(q, ids);
      var feat = findFeature(q, ids);
      if (hit && (!feat || hit.score >= feat.score / 1.5)) r = faqAnswer(hit);
      else if (feat) r = featureAnswer(feat);
      else if (explicit) r = overview(explicit, ent.trims[0] || null);
      else r = fallback();
    }
    if (r.vehicle !== undefined && r.vehicle) state.vehicle = r.vehicle;
    return r;
  }

  global.ACEEngine = {
    init: function (vehicles, images) { D = vehicles; L = images; },
    respond: respond,
    quizStep: quizStep,
    NAME: NAME,
    SUGGESTIONS: [
      'What’s the difference between the Envision Preferred and the Avenir?',
      'What’s the smallest SUV in the lineup?',
      'Tell me about safety features',
      'Is Buick considered a luxury or premium brand?',
      'What is the best Buick model for me?',
      'Can I talk to someone about the Enclave?'
    ],
    displayFor: function (q) {
      // the Figma conversation bubbles break these prompts onto two lines
      var map = {
        'is buick considered a luxury or premium brand?': 'Is Buick considered a luxury or\npremium brand?',
        'what is the best buick model for me?': 'What is the best Buick model for\nme?',
        'can i talk to someone about the enclave?': 'Can I talk to someone about the\nEnclave?'
      };
      return map[lower(q).replace(/[’]/g, '\'').trim()] || q;
    }
  };
})(window);
