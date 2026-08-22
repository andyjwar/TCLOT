/**
 * A/B shots for the compact fixture-row balance fix at 390px:
 *   A — restored breathing room, names hugging crests (current CSS as-is)
 *   B — A + names anchored beside the to-play pills (teamblock stretched,
 *       space-between) so every row's name starts at the same x.
 */
const BASE = process.argv[2] || 'http://127.0.0.1:5183/';
const OUT = '/Users/andyw/TCLOT/web/mockup-shots';
import fs from 'node:fs';

const { webSocketDebuggerUrl } = await (await fetch('http://127.0.0.1:9333/json/version')).json();
const ws = new WebSocket(webSocketDebuggerUrl);
const pending = new Map();
const eventWaiters = [];
let id = 0;
const rawSend = (method, params = {}, sessionId) =>
  new Promise((resolve, reject) => {
    const mid = ++id;
    pending.set(mid, { resolve, reject });
    ws.send(JSON.stringify({ id: mid, method, params, sessionId }));
  });
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
const waitEvent = (m) => new Promise((r) => eventWaiters.push({ method: m, resolve: r }));
await new Promise((res, rej) => { ws.addEventListener('open', res); ws.addEventListener('error', rej); });
const { targetInfos } = await rawSend('Target.getTargets');
const page = targetInfos.find((t) => t.type === 'page');
const { sessionId } = await rawSend('Target.attachToTarget', { targetId: page.targetId, flatten: true });
const S = (m, p) => rawSend(m, p, sessionId);
await S('Page.enable');
await S('Runtime.enable');

const B_CSS = `
.live-banner-row--compact .live-banner-row__teamblock--home,
.live-banner-row--compact .live-banner-row__teamblock--away {
  flex: 1 1 auto;
  justify-content: space-between;
}
.live-banner-row--compact .live-banner-row__teamblock--home { margin-left: 0; }
.live-banner-row--compact .live-banner-row__teamblock--away { margin-right: 0; }
`;

/* Recreate the live state from the user's screenshot on top of whatever the
   API currently returns (GW may have rolled to pre-kickoff): scores, to-play
   pills, seed + favourite meta strip, then a manual fit pass on names. */
const INJECT = `(${() => {
  const FIX = [
    { h: 6, a: 0, hp: '10', ap: '11', seed: '1st vs 5th', fav: 'Mordor SFG 83%' },
    { h: 15, a: 5, hp: '9', ap: '10', seed: '1st vs 5th', fav: 'Seoul Shire 57%' },
    { h: 0, a: 15, hp: '11', ap: '9', seed: '5th vs 1st', fav: 'Rokesly Regorasu 80%' },
    { h: 14, a: 17, hp: '9', ap: '9', seed: '5th vs 1st', fav: 'Suffolk Sméagol 69%' },
  ];
  // last-word fallback (MSFG → Mordor), mirrors lastWordTeamName()
  const SHORT = {
    'Atlético Bilbo': 'Bilbo', 'Toronto Gimli': 'Gimli',
    'Suffolk Sméagol': 'Sméagol', 'Rokesly Regorasu': 'Regorasu',
    'Hackney Rohirrim': 'Rohirrim', 'Mordor SFG': 'Mordor',
    'Seoul Shire': 'Shire', 'Brampton Balrogs': 'Balrogs',
  };
  const FULL = ['Mordor SFG', 'Atlético Bilbo', 'Seoul Shire', 'Hackney Rohirrim',
    'Brampton Balrogs', 'Rokesly Regorasu', 'Toronto Gimli', 'Suffolk Sméagol'];
  const rows = [...document.querySelectorAll('.live-banner-row')];
  rows.forEach((row, i) => {
    const f = FIX[i % FIX.length];
    const score = row.querySelector('.live-banner-row__score');
    if (score) {
      const hw = f.h > f.a, aw = f.a > f.h;
      score.innerHTML =
        '<span class="live-banner-row__score-cell live-banner-row__score-cell--home">' +
        '<span class="live-banner-row__score-half' + (hw ? ' live-banner-row__score-half--winner' : '') + '">' + f.h + '</span></span>' +
        '<span class="live-banner-row__score-sep" aria-hidden="true">–</span>' +
        '<span class="live-banner-row__score-cell live-banner-row__score-cell--away">' +
        '<span class="live-banner-row__score-half' + (aw ? ' live-banner-row__score-half--winner' : '') + '">' + f.a + '</span></span>';
    }
    const homeSide = row.querySelector('.live-banner-row__side--home');
    const awaySide = row.querySelector('.live-banner-row__side--away');
    if (homeSide && !homeSide.querySelector('.live-banner-row__countdown')) {
      const p = document.createElement('span');
      p.className = 'live-banner-row__countdown';
      p.textContent = f.hp;
      homeSide.prepend(p);
    }
    if (awaySide && !awaySide.querySelector('.live-banner-row__countdown')) {
      const p = document.createElement('span');
      p.className = 'live-banner-row__countdown';
      p.textContent = f.ap;
      awaySide.append(p);
    }
    const meta = row.parentElement.querySelector('.live-banner-group__meta');
    if (meta) {
      meta.innerHTML =
        '<span class="live-banner-group__meta-text">' + f.seed + '</span>' +
        '<span class="live-banner-group__meta-text">' + f.fav + '</span>';
    }
  });
  // Manual FittedTeamName pass: full name, else curated short.
  const names = [...document.querySelectorAll('.live-banner-row__name')];
  const debug = [];
  names.forEach((el, i) => {
    const full = FULL[i] || el.textContent;
    const fits = () => {
      if (el.scrollWidth > el.clientWidth) return false;
      const r = document.createRange();
      r.selectNodeContents(el);
      return r.getBoundingClientRect().width <= el.getBoundingClientRect().width + 0.1;
    };
    el.textContent = full;
    if (!fits()) el.textContent = SHORT[full] || full.split(/\\s+/)[0];
    const side = el.closest('.live-banner-row__side');
    const pill = side.querySelector('.live-banner-row__countdown');
    const crest = side.querySelector('.live-banner-row__crest');
    const block = el.closest('.live-banner-row__teamblock');
    debug.push(
      el.textContent +
      ' side=' + Math.round(side.getBoundingClientRect().width) +
      ' block=' + Math.round(block.getBoundingClientRect().width) +
      ' pill=' + Math.round(pill ? pill.getBoundingClientRect().width : 0) +
      ' crest=' + Math.round(crest.getBoundingClientRect().width) +
      ' names=' + Math.round(el.parentElement.getBoundingClientRect().width) +
      ' font=' + getComputedStyle(el).fontSize,
    );
  });
  return debug;
}})()`;

async function load(width) {
  await S('Emulation.setDeviceMetricsOverride', { width, height: 1600, deviceScaleFactor: 2, mobile: true });
  await S('Runtime.evaluate', {
    expression: `localStorage.setItem('tclot:settings:default-tab','fplLive'); localStorage.setItem('tclot-theme','light');`,
  });
  await S('Page.navigate', { url: BASE });
  await waitEvent('Page.loadEventFired');
  for (let i = 0; i < 50; i++) {
    const { result } = await S('Runtime.evaluate', {
      returnByValue: true,
      expression: `document.querySelectorAll('.live-banner-row').length`,
    });
    if (result.value > 0) break;
    await new Promise((r) => setTimeout(r, 400));
  }
  await new Promise((r) => setTimeout(r, 1200));
}

async function shootTile(name) {
  await S('Runtime.evaluate', {
    expression: `document.querySelector('.live-banner-group-tile').scrollIntoView({ block: 'start' }); window.scrollBy(0, -6);`,
  });
  await new Promise((r) => setTimeout(r, 400));
  const { result } = await S('Runtime.evaluate', {
    returnByValue: true,
    expression: `(() => { const r = document.querySelector('.live-banner-group-tile').getBoundingClientRect(); return { x: r.x + window.scrollX, y: r.y + window.scrollY, w: r.width, h: Math.min(r.height, 1500) }; })()`,
  });
  const { x, y, w, h } = result.value;
  const shot = await S('Page.captureScreenshot', {
    format: 'png',
    captureBeyondViewport: true,
    clip: { x, y, width: w, height: h, scale: 2 },
  });
  fs.writeFileSync(`${OUT}/${name}.png`, Buffer.from(shot.data, 'base64'));
  console.log('wrote', name);
}

for (const width of [390, 430]) {
  await load(width);
  let r = await S('Runtime.evaluate', { returnByValue: true, expression: INJECT });
  // Nudge the viewport so the app's ResizeObserver re-fits names with the
  // injected pills in the layout, then re-run the fit pass one more time.
  await S('Emulation.setDeviceMetricsOverride', { width: width + 1, height: 1600, deviceScaleFactor: 2, mobile: true });
  await new Promise((res) => setTimeout(res, 600));
  r = await S('Runtime.evaluate', { returnByValue: true, expression: INJECT });
  console.log(width, JSON.stringify(r.result.value));
  await new Promise((res) => setTimeout(res, 300));
  await shootTile(`rowbal-final-${width}`);
}

ws.close();
process.exit(0);
