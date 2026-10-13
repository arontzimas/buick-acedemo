# Buick × ACE demo

Static copy of buick.com (home, /suvs and the Envista, Encore GX, Envision and Enclave pages) with a floating
"Ask me anything" bar on every page. Submitting opens `/chat`, the composed ACE experience built from the
Buick ACE Demo Figma (Foundations / Components / Templates).

- `index.html`, `suvs/**/index.html` – captured buick.com pages (analytics, bot-manager and vendor chat scripts removed)
- `content/`, `etc.clientlibs/`, `_gbpe/`, `_ext/` – mirrored buick.com assets; anything missing is proxied to buick.com (see `vercel.json`)
- `ace/ace-bar.*` – floating AI Chat bar injected into every buick.com page
- `chat/index.html`, `ace/chat.*`, `ace/engine.js` – chat experience + scripted composition engine
- `ace/data/vehicles.json` – facts and FAQs pulled from the buick.com vehicle pages
- `ace/data/images.json`, `ace/img/<vehicle>/…` – image library pulled from buick.com per vehicle (jellybeans for every trim and color, spec diagrams, gallery, safety, features)
- `ace/img/figma/` – the exact imagery used in the six Figma templates

No build step: deploy the folder as-is.
