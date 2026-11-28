// Şövalye Kalesi'nin kuralları. Saf mantık: DOM'a dokunmaz, rastgelelik kullanmaz.
//
// Oyun tur tur ilerler. Her turda önce hırsız bir hamle yapar, sonra kaledeki programlı her şey
// (şövalye, kapı, diken) programından TEK bir hareket yapar. step() yeni durumu ve o turda
// olanların listesini (fx) döndürür; çizim bu listeyi oynatır.
import { parseProg, uid } from './bloklar.js';

export const DX = [0, 1, 0, -1];   // yön: 0 yukarı, 1 sağ, 2 aşağı, 3 sol
export const DY = [-1, 0, 1, 0];
const MOVE = { U: 0, R: 1, D: 2, L: 3 };
const ITEM = { a: 'coin', k: 'key', d: 'plate', F: 'flag' };
const KIND_ACTS = {
  guard: new Set(['fwd', 'dash', 'left', 'right', 'wait', 'call', 'alarm']),
  door: new Set(['open', 'close', 'wait']),
  spikes: new Set(['up', 'down', 'wait']),
};
const key = (x, y) => `${x},${y}`;

function compile(prog) {
  const hats = typeof prog === 'string' || prog == null ? parseProg(prog || '') : prog;
  const nodes = new Map(), byEvent = {};
  const visit = (n) => { if (!n.id) n.id = uid(); nodes.set(n.id, n); (n.b || []).forEach(visit); (n.o || []).forEach(visit); };
  for (const h of hats) { visit(h); if (!byEvent[h.e]) byEvent[h.e] = h; }
  return { hats, nodes, byEvent };
}

/**
 * Tarif → oynanabilir kale.
 *   rows: '.' zemin, '#' duvar, 'S' hırsız, 'H' hazine, 'a' altın, 'k' anahtar, 'd' düğme, 'F' bayrak
 *   ents: [{ kind: 'guard' | 'door' | 'spikes', x, y, dir, on, prog }]   (on: kapı açık / diken yukarıda başlar)
 *   path: derslerde hırsızın yazılı yolu ('RRD.L', nokta beklemektir); yoksa hırsızı oyuncu yürütür
 */
export function buildLevel(spec) {
  const rows = spec.rows, h = rows.length, w = rows[0].length;
  const lv = { name: spec.name || '', w, h, wall: [], item: [], chest: null, start: null, flags: [], path: spec.path || null, ents: [], doorAt: {}, spikesAt: {} };
  for (let y = 0; y < h; y++) {
    lv.wall.push([]); lv.item.push([]);
    for (let x = 0; x < w; x++) {
      const ch = rows[y][x] || '.';
      lv.wall[y].push(ch === '#');
      lv.item[y].push(ITEM[ch] || null);
      if (ch === 'S') lv.start = { x, y };
      if (ch === 'H') lv.chest = { x, y };
      if (ch === 'F') lv.flags.push({ x, y });
    }
  }
  (spec.ents || []).forEach((e, i) => {
    lv.ents.push({ kind: e.kind, x: e.x, y: e.y, dir: e.dir ?? 1, on: !!e.on, name: e.name || null, prog: compile(e.prog) });
    if (e.kind === 'door') lv.doorAt[key(e.x, e.y)] = i;
    if (e.kind === 'spikes') lv.spikesAt[key(e.x, e.y)] = i;
  });
  return lv;
}

export function initState(level) {
  return {
    t: 0,
    status: 'play',            // 'play' | 'won' (hırsız hazineye vardı) | 'caught' (hırsız yakalandı)
    by: null,                  // hırsızı yakalayanın sırası
    intruder: level.start ? { x: level.start.x, y: level.start.y, dir: 2, alive: true, coins: 0, keys: 0 } : null,
    got: {},                   // alınan altın ve anahtarların kareleri
    flags: {},                 // bayraklara kaç kez dokunuldu
    queue: [],                 // bir sonraki turda herkese duyurulacak olaylar
    bumps: 0,
    ents: level.ents.map((e) => {
      const hat = e.prog.byEvent.start;
      return { x: e.x, y: e.y, dir: e.dir, on: e.on, stack: hat ? [{ n: hat.id, br: 'b', i: 0, ev: 'start' }] : [], active: hat ? ['start'] : [], saw: false, cur: null };
    }),
  };
}

const inside = (level, x, y) => x >= 0 && y >= 0 && x < level.w && y < level.h;
const doorShut = (level, s, x, y) => { const i = level.doorAt[key(x, y)]; return i !== undefined && !s.ents[i].on; };
/** Hırsız bu kareye giremez: kale dışı, duvar ya da kapalı kapı. */
const solid = (level, s, x, y) => !inside(level, x, y) || level.wall[y][x] || doorShut(level, s, x, y);
const guardAt = (level, s, x, y, except = -1) => s.ents.findIndex((e, i) => i !== except && level.ents[i].kind === 'guard' && e.x === x && e.y === y);
const intruderAt = (s, x, y) => !!s.intruder && s.intruder.alive && s.intruder.x === x && s.intruder.y === y;
/** Şövalye bu kareye giremez: hırsızın giremediği yerler, hazine sandığı ve başka bir şövalye. */
function blocked(level, s, x, y, self) {
  if (solid(level, s, x, y)) return true;
  if (level.chest && level.chest.x === x && level.chest.y === y) return true;
  return guardAt(level, s, x, y, self) >= 0;
}

/** Şövalyenin baktığı yönde, duvara ya da kapalı kapıya kadar gördüğü kareler. */
export function sightCells(level, s, i) {
  const e = s.ents[i], out = [];
  let x = e.x + DX[e.dir], y = e.y + DY[e.dir];
  while (!solid(level, s, x, y)) { out.push({ x, y }); x += DX[e.dir]; y += DY[e.dir]; }
  return out;
}
const canSee = (level, s, i) => sightCells(level, s, i).some((c) => intruderAt(s, c.x, c.y));

function test(level, s, i, cond) {
  const e = s.ents[i];
  if (cond === 'wall') return blocked(level, s, e.x + DX[e.dir], e.y + DY[e.dir], i);
  if (cond === 'see') return canSee(level, s, i);
  return false;
}

function caught(s, fx, by) {
  s.status = 'caught'; s.by = by; s.intruder.alive = false;
  fx.push({ t: 'catch', by });
}

function intruderPhase(level, s, move, fx) {
  const k = s.intruder, d = MOVE[move];
  if (d === undefined) return;                       // bekle
  k.dir = d;
  const x = k.x + DX[d], y = k.y + DY[d];
  if (solid(level, s, x, y)) { fx.push({ t: 'bump', who: 'intruder', dir: d }); return; }
  k.x = x; k.y = y;
  fx.push({ t: 'move', who: 'intruder' });
  const m = guardAt(level, s, x, y);
  if (m >= 0) return caught(s, fx, m);
  const sp = level.spikesAt[key(x, y)];
  if (sp !== undefined && s.ents[sp].on) return caught(s, fx, sp);
  if (level.chest && level.chest.x === x && level.chest.y === y) { s.status = 'won'; fx.push({ t: 'win' }); return; }
  const item = level.item[y][x];
  if ((item === 'coin' || item === 'key') && !s.got[key(x, y)]) {
    s.got[key(x, y)] = true;
    k[item === 'coin' ? 'coins' : 'keys']++;
    s.queue.push(item);
    fx.push({ t: 'pick', item, x, y });
  }
  if (item === 'plate') { s.queue.push('plate'); fx.push({ t: 'plate', x, y }); }
}

/**
 * Programdan sıradaki hareketi çıkarır. Döngü ve "eğer" blokları tur harcamaz; yalnız hareketler harcar.
 * Hareketsiz dönen bir "sürekli tekrarla" o turu bekleyerek geçirir (ör. "sürekli: eğer görüyorsam koş").
 */
function nextAction(level, s, i) {
  const e = level.ents[i], st = s.ents[i], spun = new Set();
  for (let budget = 0; budget < 400; budget++) {
    const f = st.stack[st.stack.length - 1];
    if (!f) return null;
    const owner = e.prog.nodes.get(f.n), seq = (owner && owner[f.br]) || [];
    if (f.i >= seq.length) {
      if (f.loop === 'f') {
        if (spun.has(f)) return { t: 'wait', id: f.n, implicit: true };
        spun.add(f); f.i = 0; continue;
      }
      if (f.loop === 'n' && --f.left > 0) { f.i = 0; continue; }
      st.stack.pop();
      if (f.ev) st.active = st.active.filter((x) => x !== f.ev);
      continue;
    }
    const n = seq[f.i++];
    if (n.t === 'repeat') { if (n.n > 0) st.stack.push({ n: n.id, br: 'b', i: 0, loop: 'n', left: n.n }); }
    else if (n.t === 'forever') st.stack.push({ n: n.id, br: 'b', i: 0, loop: 'f' });
    else if (n.t === 'if') st.stack.push({ n: n.id, br: test(level, s, i, n.c) ? 'b' : 'o', i: 0 });
    else if (KIND_ACTS[e.kind].has(n.t)) return n;
    // türüne uymayan blok (elle kurcalanmış bağlantı): atlanır
  }
  return { t: 'wait', id: null, implicit: true };
}

function moveGuard(level, s, i, steps, fx) {
  const st = s.ents[i];
  for (let k = 0; k < steps; k++) {
    const x = st.x + DX[st.dir], y = st.y + DY[st.dir];
    if (blocked(level, s, x, y, i)) { s.bumps++; fx.push({ t: 'bump', who: i, dir: st.dir }); return; }
    st.x = x; st.y = y;
    fx.push({ t: 'move', who: i });
    if (intruderAt(s, x, y)) return caught(s, fx, i);
    const item = level.item[y][x];
    if (item === 'plate') { s.queue.push('plate'); fx.push({ t: 'plate', x, y }); }
    if (item === 'flag') { s.flags[key(x, y)] = (s.flags[key(x, y)] || 0) + 1; fx.push({ t: 'flag', x, y }); }
  }
}

function act(level, s, i, fx) {
  const st = s.ents[i], n = nextAction(level, s, i);
  st.cur = n ? n.id : null;
  if (!n) return;
  switch (n.t) {
    case 'fwd': moveGuard(level, s, i, 1, fx); break;
    case 'dash': moveGuard(level, s, i, 2, fx); break;
    case 'left': st.dir = (st.dir + 3) % 4; fx.push({ t: 'turn', who: i }); break;
    case 'right': st.dir = (st.dir + 1) % 4; fx.push({ t: 'turn', who: i }); break;
    case 'call': fx.push({ t: 'call', who: i }); break;
    case 'alarm': s.queue.push('alarm'); fx.push({ t: 'alarm', who: i }); break;
    case 'open': if (!st.on) { st.on = true; fx.push({ t: 'door', who: i, on: true }); } break;
    case 'close':
      if (!st.on) break;
      if (intruderAt(s, st.x, st.y) || guardAt(level, s, st.x, st.y) >= 0) fx.push({ t: 'jam', who: i });   // kapı arasında biri var
      else { st.on = false; fx.push({ t: 'door', who: i, on: false }); }
      break;
    case 'up':
      if (!st.on) { st.on = true; fx.push({ t: 'spikes', who: i, on: true }); }
      if (intruderAt(s, st.x, st.y)) caught(s, fx, i);
      break;
    case 'down': if (st.on) { st.on = false; fx.push({ t: 'spikes', who: i, on: false }); } break;
    default: break;   // bekle
  }
}

function entityPhase(level, s, fx) {
  const heard = s.queue;
  s.queue = [];
  level.ents.forEach((e, i) => {
    const st = s.ents[i], mine = [...heard];
    if (e.kind === 'guard') {
      const sees = canSee(level, s, i);
      if (sees && !st.saw) mine.push('see');        // "görünce": görmeye başladığı an
      st.saw = sees;
    }
    for (const ev of mine) {
      const hat = e.prog.byEvent[ev];
      // Olay, sürmekte olan işin araya girer; bitince kaldığı yerden devam edilir.
      if (hat && !st.active.includes(ev)) { st.stack.push({ n: hat.id, br: 'b', i: 0, ev }); st.active.push(ev); }
    }
  });
  for (let i = 0; i < level.ents.length && s.status === 'play'; i++) act(level, s, i, fx);
}

/**
 * Bir tur oynatır. `move`: 'U' 'R' 'D' 'L' ya da başka bir şey (bekle). Yazılı yolu olan
 * hırsız (dersler) kendi yolunu yürür; `move` yok sayılır.
 */
export function step(level, prev, move) {
  const s = structuredClone(prev), fx = [];
  if (s.status !== 'play') return { state: s, fx };
  s.t++;
  if (s.intruder && s.intruder.alive) intruderPhase(level, s, level.path ? level.path[s.t - 1] || '.' : move, fx);
  if (s.status === 'play') entityPhase(level, s, fx);
  return { state: s, fx };
}

const allIdle = (s) => s.ents.every((e) => !e.stack.length) && !s.queue.length;

/**
 * Ders hedefi tuttu mu? Sürüyorsa null; bitince { ok, why }.
 *   flags: şövalyeler her bayrağa `times` kez dokunsun
 *   catch: hırsız kaçmadan yakalansın
 *   trap:  hırsız yolunun sonunda `zone` içinde kalsın (kapı arkasından kapansın)
 *   predict: program bitince şövalye nerede? (cevap `end`)
 */
export function judge(level, s, goal, limit = 80) {
  const pathDone = !!level.path && s.t >= level.path.length;
  if (goal.type === 'flags') {
    const need = goal.times || 1, left = level.flags.filter((f) => (s.flags[key(f.x, f.y)] || 0) < need).length;
    if (!left) return { ok: true };
    if (allIdle(s)) return { ok: false, why: s.t <= 1 ? 'empty' : s.bumps ? 'bump' : 'short', left };
    if (s.t >= limit) return { ok: false, why: 'time', left };
    return null;
  }
  if (goal.type === 'predict') {
    if (allIdle(s) || s.t >= limit) { const m = s.ents[goal.who || 0]; return { ok: true, end: { x: m.x, y: m.y } }; }
    return null;
  }
  if (s.status === 'caught') return { ok: true, why: 'caught' };
  if (goal.type === 'catch') return pathDone ? { ok: false, why: 'escaped' } : null;
  if (goal.type === 'trap') {
    if (!pathDone) return null;
    const z = goal.zone, k = s.intruder;
    if (k.x >= z.x0 && k.x <= z.x1 && k.y >= z.y0 && k.y <= z.y1) return { ok: true, why: 'trapped' };
    return { ok: false, why: level.ents.some((e, i) => e.kind === 'door' && !s.ents[i].on) ? 'early' : 'open' };
  }
  return null;
}

/** Oyuncusuz bir kaleyi (ders dalgası) baştan sona oynatır: bütün kareler ve sonuç. */
export function simulate(level, goal, limit = 80) {
  let state = initState(level), verdict = judge(level, state, goal, limit);
  const frames = [{ state, fx: [] }];
  while (!verdict) {
    const r = step(level, state);
    state = r.state; frames.push(r);
    verdict = judge(level, state, goal, limit);
  }
  return { ...verdict, frames, state };
}

/**
 * Oyunculu bir kale çözülebilir mi? En kısa hamle dizisini arar (genişlik öncelikli).
 * Testlerde örnek kalelerin gerçekten bitirilebildiğini doğrulamak için kullanılır.
 */
export function solve(level, maxMoves = 60, maxStates = 200000) {
  const first = initState(level);
  const sig = (s) => JSON.stringify([s.intruder, s.got, s.queue, s.ents.map((e) => [e.x, e.y, e.dir, e.on, e.stack, e.saw])]);
  let layer = [{ state: first, moves: '' }];
  const seen = new Set([sig(first)]);
  for (let depth = 0; depth < maxMoves && layer.length; depth++) {
    const next = [];
    for (const { state, moves } of layer) {
      for (const m of 'URDL.') {
        const r = step(level, state, m);
        if (r.state.status === 'won') return moves + m;
        if (r.state.status !== 'play') continue;
        const id = sig(r.state);
        if (seen.has(id)) continue;
        seen.add(id);
        if (seen.size > maxStates) return null;
        next.push({ state: r.state, moves: moves + m });
      }
    }
    layer = next;
  }
  return null;
}
