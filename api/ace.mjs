// Buick ACE — Claude-composed answers.
// POST { q, history, page, vehicle, pageVehicle } -> application/x-ndjson stream:
//   {"v":"envista"}            the model the answer is about
//   {"b":{...component...}}    one component, emitted as soon as Claude finishes writing it
//   {"done":true}              end of answer   |   {"error":"..."} on failure
// The key stays here (ANTHROPIC_API_KEY env var); the browser never sees it.
import { MODEL, SYSTEM, SCHEMA } from './_lib/knowledge.mjs';

const NAMES = { envista: 'Envista', 'encore-gx': 'Encore GX', envision: 'Envision', enclave: 'Enclave' };
const PAGES = { '/': 'the Buick home page', '/suvs': 'the Buick SUVs page', '/chat': 'the chat page' };
const WINDOW_MS = 10 * 60 * 1000, MAX_PER_WINDOW = 40;
const hits = new Map();

function limited(ip) {
  const now = Date.now();
  const list = (hits.get(ip) || []).filter((t) => now - t < WINDOW_MS);
  list.push(now);
  hits.set(ip, list);
  if (hits.size > 5000) hits.clear();
  return list.length > MAX_PER_WINDOW;
}
const str = (s, n) => String(s == null ? '' : s).replace(/[\u0000-\u001f]+/g, ' ').trim().slice(0, n);
const json = (obj, status = 200) => new Response(JSON.stringify(obj), { status, headers: { 'content-type': 'application/json', 'cache-control': 'no-store' } });

function userPrompt({ q, history, page, vehicle, pageVehicle }) {
  const where = NAMES[pageVehicle] ? `the Buick ${NAMES[pageVehicle]} page (${page})` : (PAGES[page] || `a Buick page (${page})`);
  const lines = [`Visitor came from: ${where}.`, `Model this conversation is about: ${NAMES[vehicle] || 'none yet'}.`];
  if (history.length) {
    lines.push('', 'Conversation so far (oldest first):');
    for (const h of history) lines.push(`${h.role === 'user' ? 'Visitor' : 'You showed'}: ${h.text}`);
  }
  lines.push('', `Visitor’s question: ${q}`);
  return lines.join('\n');
}

// Pull complete component objects out of the streamed JSON text: {"vehicle":"…","blocks":[{…},{…}]}
function extractor(onVehicle, onBlock) {
  let buf = '', i = 0, depth = 0, inStr = false, esc = false, start = -1, vehicleSent = false;
  return (chunk) => {
    buf += chunk;
    for (; i < buf.length; i++) {
      const c = buf[i];
      if (inStr) { if (esc) esc = false; else if (c === '\\') esc = true; else if (c === '"') inStr = false; continue; }
      if (c === '"') { inStr = true; continue; }
      if (c === '{' || c === '[') { if (c === '{' && depth === 2) start = i; depth++; }
      else if (c === '}' || c === ']') {
        depth--;
        if (c === '}' && depth === 2 && start >= 0) {
          const text = buf.slice(start, i + 1); start = -1;
          try { onBlock(JSON.parse(text)); } catch (e) { /* skip malformed component */ }
        }
      }
    }
    if (!vehicleSent) {
      const b = buf.indexOf('"blocks"');
      const m = /"vehicle"\s*:\s*"([^"]*)"/.exec(buf);
      if (m && (b === -1 || m.index < b)) { vehicleSent = true; onVehicle(m[1]); }
    }
  };
}

async function handlePost(request) {
  const key = process.env.ANTHROPIC_API_KEY;
  if (!key) return json({ error: 'not_configured' }, 503);
  const ip = (request.headers.get('x-forwarded-for') || '').split(',')[0].trim() || 'anon';
  if (limited(ip)) return json({ error: 'rate_limited' }, 429);

  let body;
  try { body = await request.json(); } catch { return json({ error: 'bad_request' }, 400); }
  const q = str(body.q, 400);
  if (!q) return json({ error: 'empty' }, 400);
  const history = (Array.isArray(body.history) ? body.history : []).slice(-8)
    .map((h) => ({ role: h && h.role === 'user' ? 'user' : 'assistant', text: str(h && h.text, 700) }))
    .filter((h) => h.text);
  const page = str(body.page, 80) || '/';
  const vehicle = NAMES[body.vehicle] ? body.vehicle : null;
  const pageVehicle = NAMES[body.pageVehicle] ? body.pageVehicle : null;

  const payload = {
    model: MODEL,
    max_tokens: 3000,
    stream: true,
    thinking: { type: 'between_tools' },
    output_config: { effort: 'low', format: { type: 'json_schema', schema: SCHEMA } },
    system: [{ type: 'text', text: SYSTEM, cache_control: { type: 'ephemeral', ttl: '1h' } }],
    messages: [{ role: 'user', content: userPrompt({ q, history, page, vehicle, pageVehicle }) }],
  };
  const call = (p) => fetch('https://api.anthropic.com/v1/messages', {
    method: 'POST',
    headers: { 'x-api-key': key, 'anthropic-version': '2023-06-01', 'content-type': 'application/json' },
    body: JSON.stringify(p),
    signal: AbortSignal.timeout(55000),
  }).catch((e) => ({ ok: false, status: 0, text: async () => String(e) }));

  let upstream = await call(payload);
  if (upstream.status === 400) {
    // if a tuning option isn't accepted, retry once with the plain structured-output request
    const detail = await upstream.text().catch(() => '');
    console.error('anthropic_400_retry', detail.slice(0, 400));
    const { thinking, ...rest } = payload;
    upstream = await call({ ...rest, output_config: { format: payload.output_config.format } });
  }
  if (!upstream.ok) {
    const detail = await upstream.text().catch(() => '');
    console.error('anthropic_error', upstream.status, detail.slice(0, 600));
    return json({ error: 'upstream', status: upstream.status }, 502);
  }

  const enc = new TextEncoder();
  const t0 = Date.now();
  const stream = new ReadableStream({
    async start(controller) {
      const send = (o) => controller.enqueue(enc.encode(JSON.stringify(o) + '\n'));
      let blocks = 0, usage = {}, stop = null, firstAt = null;
      const feed = extractor((v) => send({ v }), (b) => { blocks++; if (!firstAt) firstAt = Date.now() - t0; send({ b }); });
      const reader = upstream.body.getReader();
      const dec = new TextDecoder();
      let pending = '';
      try {
        for (;;) {
          const { value, done } = await reader.read();
          if (done) break;
          pending += dec.decode(value, { stream: true });
          let cut;
          while ((cut = pending.indexOf('\n\n')) !== -1) {
            const event = pending.slice(0, cut); pending = pending.slice(cut + 2);
            const data = event.split('\n').filter((l) => l.startsWith('data:')).map((l) => l.slice(5).trim()).join('');
            if (!data) continue;
            let ev; try { ev = JSON.parse(data); } catch { continue; }
            if (ev.type === 'content_block_delta' && ev.delta && ev.delta.type === 'text_delta') feed(ev.delta.text);
            else if (ev.type === 'message_start' && ev.message) usage = { ...ev.message.usage };
            else if (ev.type === 'message_delta') { stop = ev.delta && ev.delta.stop_reason; Object.assign(usage, ev.usage || {}); }
            else if (ev.type === 'error') throw new Error((ev.error && ev.error.message) || 'stream_error');
          }
        }
        send({ done: true, stop });
      } catch (e) {
        console.error('stream_error', String(e).slice(0, 300));
        send({ error: 'stream' });
      } finally {
        console.log(JSON.stringify({ ace: 'answer', q: q.slice(0, 120), blocks, first_ms: firstAt, total_ms: Date.now() - t0, stop, usage }));
        controller.close();
      }
    },
  });
  return new Response(stream, { headers: { 'content-type': 'application/x-ndjson; charset=utf-8', 'cache-control': 'no-store', 'x-accel-buffering': 'no' } });
}

export default {
  async fetch(request) {
    if (request.method === 'POST') return handlePost(request);
    if (request.method === 'GET') return json({ ok: !!process.env.ANTHROPIC_API_KEY, model: MODEL });
    return json({ error: 'method_not_allowed' }, 405);
  },
};
