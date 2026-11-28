// Oyun tahtası: kaleyi ve içindekileri DOM ile çizer. Konumlar CSS değişkenidir (--x, --y);
// hareket CSS geçişiyle canlanır. Durumu motor verir, tahta yalnızca gösterir.
import { sightCells, DX, DY } from './motor.js';
import { usedIn } from './bloklar.js';
import * as art from './cizim.js';

const MOVE = { U: 0, R: 1, D: 2, L: 3 };
const el = (cls, html = '') => { const d = document.createElement('div'); d.className = cls; d.innerHTML = html; return d; };
const at = (node, x, y) => { node.style.setProperty('--x', x); node.style.setProperty('--y', y); return node; };
const SAY = { bump: 'GÜM!', roar: 'BÖÖ!', alarm: 'DAN DAN!', catch: 'HAM!', jam: 'SIKIŞTI!', win: 'HAZİNE!' };

export function createBoard({ onCell } = {}) {
  const root = el('board');
  let level = null, parts = null, timers = [];

  if (onCell) {
    // Dokunulan kare bildirilir; parmak basılıyken başka kareye geçilirse o da (sürükleme) bildirilir.
    let last = null;
    const cellOf = (ev) => {
      const box = root.getBoundingClientRect(), cell = box.width / level.w;
      const x = Math.floor((ev.clientX - box.left) / cell), y = Math.floor((ev.clientY - box.top) / cell);
      return x >= 0 && y >= 0 && x < level.w && y < level.h ? { x, y } : null;
    };
    root.classList.add('live');
    root.addEventListener('pointerdown', (ev) => {
      const c = level && cellOf(ev);
      if (!c) return;
      last = `${c.x},${c.y}`;
      try { root.setPointerCapture(ev.pointerId); } catch (err) { /* yakalanamazsa yalnız dokunma çalışır */ }
      onCell(c.x, c.y, ev, false);
    });
    root.addEventListener('pointermove', (ev) => {
      if (last === null || !level) return;
      const c = cellOf(ev);
      if (!c || last === `${c.x},${c.y}`) return;
      last = `${c.x},${c.y}`;
      onCell(c.x, c.y, ev, true);
    });
    const end = () => { last = null; };
    root.addEventListener('pointerup', end);
    root.addEventListener('pointercancel', end);
  }

  /** Kaleyi baştan kurar. `mini`: liste önizlemesi (etkileşimsiz, küçük). */
  function setLevel(lv, { mini = false } = {}) {
    timers.forEach(clearTimeout); timers = [];
    level = lv;
    root.replaceChildren();
    root.style.setProperty('--w', lv.w); root.style.setProperty('--h', lv.h);
    root.classList.toggle('mini', mini);
    root.classList.remove('alarm');
    parts = { ents: [], items: {}, flags: {}, beams: [], knight: null, chest: null, rot: [] };
    for (let y = 0; y < lv.h; y++) for (let x = 0; x < lv.w; x++) {
      const wall = lv.wall[y][x];
      root.append(at(el(`tile ${wall ? 'wall' : (x + y) % 2 ? 'dark' : ''}`, wall ? art.wall() : ''), x, y));
      const item = lv.item[y][x];
      if (!item) continue;
      const node = at(el(`thing ${item}`, art[item]()), x, y);
      root.append(node);
      (item === 'flag' ? parts.flags : parts.items)[`${x},${y}`] = node;
    }
    if (lv.path && lv.start) {                       // derslerde şövalyenin yolu: ayak izleri
      let { x, y } = lv.start;
      const seen = new Set([`${x},${y}`]);
      for (const m of lv.path) {
        const d = MOVE[m];
        if (d === undefined) continue;
        const nx = x + DX[d], ny = y + DY[d];
        if (nx < 0 || ny < 0 || nx >= lv.w || ny >= lv.h || lv.wall[ny][nx]) continue;
        x = nx; y = ny;
        if (!seen.has(`${x},${y}`)) { seen.add(`${x},${y}`); root.append(at(el('step'), x, y)); }
      }
    }
    if (lv.chest) { parts.chest = at(el('thing chest', art.chest()), lv.chest.x, lv.chest.y); root.append(parts.chest); }
    let colour = 0;
    lv.ents.forEach((e, i) => {
      const node = el(`ent ${e.kind}`);
      node.dataset.i = i;
      const body = e.kind === 'monster' ? art.monster(art.MONSTER_COLORS[colour++ % art.MONSTER_COLORS.length]) : art[e.kind]();
      node.innerHTML = `<div class="hop"><div class="spr">${body}</div></div>`;
      parts.ents.push(node); parts.rot.push(null);
      root.append(node);
    });
    if (lv.start) { parts.knight = el('ent knight', `<div class="hop"><div class="spr">${art.knight()}</div></div>`); root.append(parts.knight); }
  }

  const restart = (node, cls) => { node.classList.remove(cls); void node.offsetWidth; node.classList.add(cls); };
  function bubble(x, y, text, cls = '') {
    const b = at(el(`bub ${cls}`, '<span></span>'), x, y);
    b.firstChild.textContent = text;
    root.append(b);
    timers.push(setTimeout(() => b.remove(), 1100));
  }

  /** Durumu çizer; `fx` o turda olanlardır (toslama, kükreme, yakalama…). `snap`: geçişsiz. */
  function render(state, fx = [], snap = false) {
    if (!level) return;
    if (snap) root.classList.add('snap');
    for (const [k, node] of Object.entries(parts.items)) node.classList.toggle('gone', !!state.got[k]);
    for (const [k, node] of Object.entries(parts.flags)) node.classList.toggle('hit', (state.flags[k] || 0) > 0);
    parts.beams.forEach((b) => b.remove()); parts.beams = [];
    level.ents.forEach((e, i) => {
      const st = state.ents[i], node = parts.ents[i];
      at(node, st.x, st.y);
      node.classList.toggle('on', !!st.on);
      if (e.kind !== 'monster') return;
      // En kısa yoldan dön: 3 → 0 geçişi geriye doğru üç çeyrek tur atmasın.
      const prev = parts.rot[i];
      let turn = st.dir;
      if (prev !== null) { const d = ((st.dir - prev) % 4 + 4) % 4; turn = prev + (d === 3 ? -1 : d); }
      parts.rot[i] = turn;
      node.style.setProperty('--r', turn);
      // Görüşe bakan canavarın baktığı kareler hafifçe aydınlanır: "görmek" ne demek, gözle görülsün.
      const uses = usedIn(e.prog.hats);
      if (state.status === 'play' && (uses.conds.has('see') || uses.events.has('see'))) {
        for (const c of sightCells(level, state, i)) { const b = at(el('beam'), c.x, c.y); parts.beams.push(b); root.append(b); }
      }
    });
    if (parts.knight && state.knight) {
      at(parts.knight, state.knight.x, state.knight.y);
      parts.knight.classList.toggle('gone', state.status === 'caught');
      parts.knight.classList.toggle('won', state.status === 'won');
    }
    if (parts.chest) parts.chest.classList.toggle('open', state.status === 'won');
    if (snap) { void root.offsetWidth; root.classList.remove('snap'); }
    for (const f of fx) {
      const who = f.who === 'knight' ? parts.knight : parts.ents[f.who];
      const ws = f.who === 'knight' ? state.knight : state.ents[f.who];
      if (f.t === 'bump') {
        who.style.setProperty('--bx', DX[f.dir]); who.style.setProperty('--by', DY[f.dir]);
        restart(who, 'bump');
        if (f.who !== 'knight') bubble(ws.x, ws.y, SAY.bump);
      } else if (f.t === 'roar') { restart(who, 'roar'); bubble(ws.x, ws.y, SAY.roar, 'shout'); }
      else if (f.t === 'alarm') { restart(root, 'alarm'); bubble(ws.x, ws.y, SAY.alarm, 'shout'); }
      else if (f.t === 'jam') bubble(ws.x, ws.y, SAY.jam);
      else if (f.t === 'catch') bubble(state.knight.x, state.knight.y, SAY.catch, 'shout');
      else if (f.t === 'win') bubble(level.chest.x, level.chest.y, SAY.win, 'nice');
      else if (f.t === 'pick') bubble(f.x, f.y, '+1', 'nice');
      else if (f.t === 'flag') { const p = parts.flags[`${f.x},${f.y}`]; if (p) restart(p, 'pop'); }
      else if (f.t === 'plate') { const p = parts.items[`${f.x},${f.y}`]; if (p) restart(p, 'pop'); }
    }
  }

  /** Seçili parçanın çevresine halka çizer (null: hiçbiri). */
  function select(i) { parts.ents.forEach((n, k) => n.classList.toggle('sel', k === i)); }

  /** Bir kareyi işaretler (tahmin dersi): cls 'guess' | 'right' | 'wrong'. */
  function mark(x, y, cls) { const m = at(el(`mark ${cls}`), x, y); root.append(m); return m; }
  function clearMarks() { root.querySelectorAll('.mark').forEach((m) => m.remove()); }

  /** Kare boyunu değiştirir. Geçişsiz yapılır: boyut değişince parçalar yeni yerlerine kaymasın, orada dursun. */
  function setCell(px) {
    if (root.style.getPropertyValue('--cell') === `${px}px`) return;
    root.classList.add('snap');
    root.style.setProperty('--cell', `${px}px`);
    void root.offsetWidth;
    root.classList.remove('snap');
  }

  return { el: root, setLevel, render, select, mark, clearMarks, setCell };
}
