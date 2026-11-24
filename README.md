# Buick × ACE demo

Static copy of buick.com (home, /suvs and the Envista, Encore GX, Envision and Enclave pages) with a floating
"Ask me anything" bar on every page. Submitting opens `/chat`, the composed ACE experience built from the
Buick ACE Demo Figma (Foundations / Components / Templates).

- `index.html` – the current buick.com home page (the "sky" / `gmx-*` design), rebuilt with `tools/build_home.mjs`
- `suvs/**/index.html` – buick.com SUV pages as captured earlier (previous design)
- both: analytics, bot-manager, sign-in and vendor chat scripts removed; lead-form buttons hand off to buick.com
- `content/`, `etc.clientlibs/`, `_gbpe/`, `_ext/`, `_api/` – mirrored buick.com assets and data; anything missing is proxied to buick.com (see `vercel.json`)
- `ace/ace-bar.*` – floating AI Chat bar injected into every buick.com page
- `chat/index.html`, `ace/chat.*`, `ace/engine.js` – chat experience + scripted composition engine
- `ace/data/vehicles.json` – facts and FAQs pulled from the buick.com vehicle pages
- `ace/data/images.json`, `ace/img/<vehicle>/…` – image library pulled from buick.com per vehicle (jellybeans for every trim and color, spec diagrams, gallery, safety, features)
- `ace/img/figma/` – the exact imagery used in the six Figma templates

No build step: deploy the folder as-is.

## Refreshing the home page from buick.com

```
NODE_USE_ENV_PROXY=1 node tools/build_home.mjs          # re-download the page + assets and rewrite index.html
NODE_USE_ENV_PROXY=1 node tools/capture.mjs /tmp/ref /  # reference screenshots of the live page
node tools/shoot-local.mjs /tmp/loc /                   # same screenshots of the local copy, to compare
```

`tools/` is not deployed (`.vercelignore`).
