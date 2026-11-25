import { writeFileSync } from "node:fs";
const PORT = 9666;
const APP = "http://127.0.0.1:4183/speak";
const tab = await (await fetch(`http://127.0.0.1:${PORT}/json/new?${encodeURIComponent(APP)}`, { method: "PUT" })).json();
const ws = new WebSocket(tab.webSocketDebuggerUrl);
let id = 0; const pending = new Map(); const errs = [];
ws.addEventListener("message", (e) => { const m = JSON.parse(e.data);
  if (m.id && pending.has(m.id)) { const p = pending.get(m.id); pending.delete(m.id); p.resolve(m.result); }
  else if (m.method === "Runtime.exceptionThrown") errs.push(JSON.stringify(m.params).slice(0, 200)); });
await new Promise((r) => ws.addEventListener("open", r, { once: true }));
const send = (m, p = {}) => new Promise((resolve) => { const mid = ++id; pending.set(mid, { resolve }); ws.send(JSON.stringify({ id: mid, method: m, params: p })); });
await send("Page.enable"); await send("Runtime.enable");
await send("Emulation.setDeviceMetricsOverride", { width: 1440, height: 1100, deviceScaleFactor: 1, mobile: false });
await send("Page.navigate", { url: APP });
await new Promise((r) => setTimeout(r, 5000));
const ev = async (expr) => { const r = await send("Runtime.evaluate", { expression: expr, returnByValue: true, awaitPromise: true }); return r.exceptionDetails ? { __err: r.exceptionDetails.exception?.description?.slice(0,150) } : r.result?.value; };
const wait = (ms) => new Promise((r) => setTimeout(r, ms));
const out = {};

out.boot = await ev(`({ title: document.title, h1: (document.querySelector('h1')||{}).innerText, starters: document.querySelectorAll('.starter-grid button').length, voiceOptions: document.querySelectorAll('.voice-settings select option').length, langOptions: [...document.querySelectorAll('.voice-settings select')[1].options].map(o=>o.textContent), voice: document.querySelector('.voice-settings select').value })`);

await ev(`document.querySelector('.starter-grid button').click()`);
await wait(300);
out.starter = await ev(`({ text: document.querySelector('#message').value, meta: document.querySelector('#draft-help').innerText })`);

await ev(`document.querySelector('.voice-audition .button').click()`);
await wait(1200);
out.preview = await ev(`({ speaking: window.speechSynthesis.speaking, label: document.querySelector('.voice-audition .button').innerText.trim() })`);
await ev(`document.querySelector('.voice-audition .button').click()`);

await ev(`document.querySelector('.editor-meta .text-button').click()`);
await wait(300);
out.phrase = await ev(`({ badges: [...document.querySelectorAll('.count-badge')].map(n=>n.textContent.trim()), saved: [...document.querySelectorAll('.saved-phrase')].map(n=>n.innerText.trim()) })`);

// 念一遍
await ev(`document.querySelector('.speak-button').click()`);
let phase = "", mid = null;
for (let i = 0; i < 50; i++) {
  await wait(400);
  const card = await ev(`document.querySelector('.output-card').className`);
  if (!mid && /is-speaking/.test(card)) mid = await ev(`({ played: document.querySelectorAll('.speech-word.has-played').length, total: document.querySelectorAll('.speech-word').length, current: (document.querySelector('.speech-word.current-word')||{}).textContent })`);
  if (/is-complete|is-error|is-stopped/.test(card)) { phase = card; break; }
}
out.run1 = { phase, mid, played: await ev(`document.querySelectorAll('.speech-word.has-played').length`), total: await ev(`document.querySelectorAll('.speech-word').length`), history: await ev(`[...document.querySelectorAll('.history-status')].map(n=>n.innerText.trim())`), notice: await ev(`document.querySelector('.session-notice').innerText.slice(0,60)`) };

// 再念并打断
await ev(`document.querySelector('.speak-button').click()`);
await wait(1500);
await ev(`document.querySelector('.stop-button').click()`);
await wait(700);
out.run2 = { card: await ev(`document.querySelector('.output-card').className`), revise: await ev(`!!document.querySelector('.revise-button') && !document.querySelector('.revise-button').hidden`), history: await ev(`[...document.querySelectorAll('.history-status')].map(n=>n.innerText.trim())`), notice: await ev(`document.querySelector('.session-notice').innerText.slice(0,50)`) };

if (out.run2.revise) await ev(`document.querySelector('.revise-button').click()`);
await wait(500);
out.revise = await ev(`({ draft: document.querySelector('#message').value, previous: (document.querySelector('.previous-thought')||{}).innerText?.replace(/\\s+/g,' ').slice(0,40) })`);

await ev(`document.querySelector('.show-button').click()`);
await wait(400);
out.dialog = await ev(`({ open: document.querySelector('dialog').open, text: (document.querySelector('.listener-message')||{}).innerText?.slice(0,30) })`);
await ev(`document.querySelector('dialog').close()`);

await ev(`document.querySelector('.studio-preferences .icon-button').click()`);
await ev(`document.querySelectorAll('.studio-preferences .icon-button')[1].click()`);
out.toggles = await ev(`document.querySelector('.studio-shell').className`);

// 示例问题 → 建议
await ev(`(() => { const c = document.querySelector('.listening-consent input'); c.click(); return c.checked; })()`);
await ev(`[...document.querySelectorAll('.conversation-controls button')].find(b=>/示例/.test(b.innerText)).click()`);
for (let i = 0; i < 20; i++) { await wait(400); if ((await ev(`document.querySelectorAll('.reply-option').length`)) > 0) break; }
out.listen = await ev(`({ q: (document.querySelector('.heard-question')||{}).innerText, replies: [...document.querySelectorAll('.reply-option p')].map(n=>n.innerText) })`);
if (out.listen.replies.length) {
  await ev(`document.querySelectorAll('.reply-option .reply-speak')[0].click()`);
  await wait(1500);
  out.replySpeak = await ev(`({ card: document.querySelector('.output-card').className, played: document.querySelectorAll('.speech-word.has-played').length, total: document.querySelectorAll('.speech-word').length })`);
  await ev(`document.querySelector('.stop-button').click()`);
}

const shot = await send("Page.captureScreenshot", { format: "png" });
writeFileSync("C:/xuyu/shot-zh.png", Buffer.from(shot.data, "base64"));
console.log(JSON.stringify(out, null, 1));
console.log("EXCEPTIONS", errs.length, errs.slice(0, 3));
process.exit(0);
