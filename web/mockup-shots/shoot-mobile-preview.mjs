import fs from 'node:fs';

const BROWSER_WS = process.argv[2];
const BASE_URL = process.argv[3];
const OUT = process.argv[4];

function rpc(ws, pending) {
  let id = 0;
  return (method, params = {}, sessionId) =>
    new Promise((resolve, reject) => {
      const mid = ++id;
      pending.set(mid, { resolve, reject });
      ws.send(JSON.stringify({ id: mid, method, params, sessionId }));
    });
}
const ws = new WebSocket(BROWSER_WS);
const pending = new Map();
const eventWaiters = [];
ws.addEventListener('message', (ev) => {
  const msg = JSON.parse(ev.data);
  if (msg.id && pending.has(msg.id)) {
    const { resolve, reject } = pending.get(msg.id);
    pending.delete(msg.id);
    if (msg.error) reject(new Error(JSON.stringify(msg.error)));
    else resolve(msg.result);
  } else if (msg.method) {
    for (let i = eventWaiters.length - 1; i >= 0; i--) {
      if (eventWaiters[i].method === msg.method) {
        eventWaiters[i].resolve(msg.params);
        eventWaiters.splice(i, 1);
      }
    }
  }
});
const waitEvent = (method) => new Promise((resolve) => eventWaiters.push({ method, resolve }));
await new Promise((res, rej) => {
  ws.addEventListener('open', res);
  ws.addEventListener('error', rej);
});

const send = rpc(ws, pending);
const { targetInfos } = await send('Target.getTargets');
const page = targetInfos.find((t) => t.type === 'page');
const { sessionId } = await send('Target.attachToTarget', {
  targetId: page.targetId,
  flatten: true,
});
const S = (m, p) => send(m, p, sessionId);
await S('Page.enable');
await S('Runtime.enable');
await S('Emulation.setDeviceMetricsOverride', {
  width: 390,
  height: 844,
  deviceScaleFactor: 3,
  mobile: true,
});
await S('Page.navigate', { url: `${BASE_URL}/mobile-live-fixture-preview.html` });
await waitEvent('Page.loadEventFired');
await new Promise((r) => setTimeout(r, 2000));

const { result } = await S('Runtime.evaluate', {
  returnByValue: true,
  expression: `(() => {
    const el = document.querySelector('.preview-wrap');
    if (!el) return null;
    const r = el.getBoundingClientRect();
    return { x: r.left + window.scrollX, y: r.top + window.scrollY, width: r.width, height: r.height };
  })()`,
});
const box = result.value;
const clip = box
  ? {
      x: Math.max(0, box.x),
      y: Math.max(0, box.y),
      width: box.width,
      height: box.height,
      scale: 1,
    }
  : undefined;
const shot = await S('Page.captureScreenshot', { format: 'png', clip });
fs.writeFileSync(`${OUT}/mobile-live-fixture-preview.png`, Buffer.from(shot.data, 'base64'));
console.log('wrote mobile-live-fixture-preview.png');
ws.close();
process.exit(0);
