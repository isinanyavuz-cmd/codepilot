// Blok kataloğu, program ağacı ve kısa yazım. Saf mantık: DOM'a dokunmaz.
//
// Program bir "şapka" listesidir. Her şapka bir olayı ve o olay olunca çalışacak blokları tutar:
//   [{ t: 'on', e: 'start', b: [{ t: 'forever', b: [{ t: 'fwd' }, …] }] }, { t: 'on', e: 'coin', b: […] }]
// Kısa yazım aynı şeyi tek satırda söyler; kayıtta, paylaşım bağlantısında ve derslerde bu kullanılır:
//   '@s(F(ffrr))@c(b)'  →  başlayınca: sürekli { ileri, ileri, sağ, sağ } · altın alınınca: kükre
//   'R4(ffr)'           →  yalnız "başlayınca" şapkası varsa şapka yazılmaz

let counter = 0;
/** Blok kimliği: editörde seçim ve çalışırken vurgulama için. Kayda yazılmaz. */
export const uid = () => `b${(++counter).toString(36)}`;

const ACT = { f: 'fwd', l: 'left', r: 'right', d: 'dash', w: 'wait', b: 'roar', a: 'alarm', o: 'open', c: 'close', u: 'up', n: 'down' };
const EVT = { s: 'start', e: 'see', c: 'coin', k: 'key', p: 'plate', a: 'alarm' };
const CND = { w: 'wall', e: 'see' };
const flip = (o) => Object.fromEntries(Object.entries(o).map(([k, v]) => [v, k]));
const ACT_CH = flip(ACT), EVT_CH = flip(EVT), CND_CH = flip(CND);

/** Blokların görünen adları. `body`: içine blok alır. */
export const BLOCKS = {
  fwd: { label: 'ileri git', icon: '↑', cls: 'b-move' },
  left: { label: 'sola dön', icon: '↶', cls: 'b-move' },
  right: { label: 'sağa dön', icon: '↷', cls: 'b-move' },
  dash: { label: 'koş', icon: '⇈', cls: 'b-move' },
  wait: { label: 'bekle', icon: '⋯', cls: 'b-calm' },
  roar: { label: 'kükre', icon: '!', cls: 'b-loud' },
  alarm: { label: 'alarm çal', icon: '♪', cls: 'b-loud' },
  open: { label: 'açıl', icon: '◧', cls: 'b-gear' },
  close: { label: 'kapan', icon: '■', cls: 'b-gear' },
  up: { label: 'dikenleri çıkar', icon: '▲', cls: 'b-gear' },
  down: { label: 'dikenleri indir', icon: '▽', cls: 'b-gear' },
  repeat: { label: 'kez tekrarla', icon: '⟳', cls: 'b-loop', body: true },
  forever: { label: 'sürekli tekrarla', icon: '∞', cls: 'b-loop', body: true },
  if: { label: 'eğer', icon: '?', cls: 'b-logic', body: true },
  on: { label: 'olunca', icon: '⚡', cls: 'b-event', body: true },
};
export const CONDS = { wall: 'önüm kapalıysa', see: 'şövalyeyi görüyorsam' };
export const EVENTS = {
  start: 'oyun başlayınca', see: 'şövalyeyi görünce', coin: 'altın alınınca',
  key: 'anahtar alınınca', plate: 'düğmeye basılınca', alarm: 'alarm çalınca',
};

/** Hangi tür neyi yapabilir. Kapı yürüyemez, canavar açılıp kapanamaz. */
export const KIND_BLOCKS = {
  monster: ['fwd', 'left', 'right', 'dash', 'wait', 'roar', 'alarm', 'repeat', 'forever', 'if', 'on'],
  door: ['open', 'close', 'wait', 'repeat', 'forever', 'on'],
  spikes: ['up', 'down', 'wait', 'repeat', 'forever', 'on'],
};
export const KIND_EVENTS = {
  monster: ['start', 'see', 'coin', 'key', 'plate', 'alarm'],
  door: ['start', 'coin', 'key', 'plate', 'alarm'],
  spikes: ['start', 'coin', 'key', 'plate', 'alarm'],
};
export const KIND_NAMES = { monster: 'Canavar', door: 'Kapı', spikes: 'Diken' };

const MAX_DEPTH = 6, MAX_NODES = 150;

/** Kısa yazım → program ağacı. Bozuk yazımda hata fırlatır. */
export function parseProg(text) {
  const src = String(text ?? '');
  let i = 0, nodes = 0;
  const fail = (what) => { throw new Error(`Program okunamadı: ${what} (konum ${i})`); };
  const eat = (ch) => { if (src[i] !== ch) fail(`"${ch}" bekleniyordu`); i++; };
  const node = (n) => { if (++nodes > MAX_NODES) fail('çok uzun'); return { id: uid(), ...n }; };
  const group = (depth) => { if (depth > MAX_DEPTH) fail('çok derin'); eat('('); const b = seq(depth + 1); eat(')'); return b; };
  function seq(depth) {
    const out = [];
    while (i < src.length && src[i] !== ')' && src[i] !== '@') {
      const ch = src[i++];
      if (ACT[ch]) out.push(node({ t: ACT[ch] }));
      else if (ch === 'R') {
        const n = Number(src[i++]);
        if (!(n >= 1 && n <= 9)) fail('tekrar sayısı 1-9 olmalı');
        out.push(node({ t: 'repeat', n, b: group(depth) }));
      } else if (ch === 'F') out.push(node({ t: 'forever', b: group(depth) }));
      else if (ch === 'I') {
        const c = CND[src[i++]];
        if (!c) fail('bilinmeyen koşul');
        out.push(node({ t: 'if', c, b: group(depth), o: group(depth) }));
      } else fail(`bilinmeyen işaret "${ch}"`);
    }
    return out;
  }
  const hats = [];
  if (src[0] !== '@') hats.push(node({ t: 'on', e: 'start', b: seq(0) }));
  while (i < src.length) {
    eat('@');
    const e = EVT[src[i++]];
    if (!e) fail('bilinmeyen olay');
    const b = group(0);
    if (!hats.some((h) => h.e === e)) hats.push(node({ t: 'on', e, b }));   // aynı olay iki kez yazılmışsa ilki kalır
  }
  if (!hats.some((h) => h.e === 'start')) hats.unshift(node({ t: 'on', e: 'start', b: [] }));
  hats.sort((a, b) => (b.e === 'start') - (a.e === 'start'));
  return hats;
}

/** Program ağacı → kısa yazım. */
export function printProg(prog) {
  const seq = (b) => (b || []).map((n) => {
    if (n.t === 'repeat') return `R${n.n}(${seq(n.b)})`;
    if (n.t === 'forever') return `F(${seq(n.b)})`;
    if (n.t === 'if') return `I${CND_CH[n.c]}(${seq(n.b)})(${seq(n.o)})`;
    return ACT_CH[n.t] || '';
  }).join('');
  if (prog.length === 1 && prog[0].e === 'start') return seq(prog[0].b);
  return prog.map((h) => `@${EVT_CH[h.e]}(${seq(h.b)})`).join('');
}

/** Ağacı gezer: fn(düğüm, içinde durduğu dizi, sırası, sahibi, dal). Şapkaların sahibi yoktur. */
export function walk(prog, fn) {
  const visit = (seq, owner, br) => seq.forEach((n, i) => {
    fn(n, seq, i, owner, br);
    if (n.b) visit(n.b, n, 'b');
    if (n.o) visit(n.o, n, 'o');
  });
  visit(prog, null, null);
}

export function findNode(prog, id) {
  let hit = null;
  walk(prog, (node, seq, index, owner, br) => { if (node.id === id) hit = { node, seq, index, owner, br }; });
  return hit;
}

/** Şapkalar dışındaki blok sayısı ("çantan 4 blok alıyor" sınırı bunu sayar). */
export function countBlocks(prog) {
  let n = 0;
  walk(prog, (node) => { if (node.t !== 'on') n++; });
  return n;
}

/** Programda adı geçen blok türleri, koşullar ve olaylar. */
export function usedIn(prog) {
  const blocks = new Set(), conds = new Set(), events = new Set();
  walk(prog, (n) => { if (n.t === 'on') events.add(n.e); else blocks.add(n.t); if (n.t === 'if') conds.add(n.c); });
  return { blocks, conds, events };
}

export const cloneProg = (prog) => JSON.parse(JSON.stringify(prog));

/** Yeni blok. Gövdeli bloklar boş gövdeyle doğar. */
export function makeBlock(t, extra = {}) {
  const n = { id: uid(), t };
  if (t === 'repeat') Object.assign(n, { n: 2, b: [] });
  if (t === 'forever') n.b = [];
  if (t === 'if') Object.assign(n, { c: 'wall', b: [], o: [] });
  if (t === 'on') Object.assign(n, { e: 'start', b: [] });
  return Object.assign(n, extra);
}

const seqOf = (prog, cur) => { const hit = findNode(prog, cur.owner); return hit ? hit.node[cur.br] : null; };

/**
 * Blok konabilecek bütün yerler, yukarıdan aşağı okuma sırasıyla: { owner, br, i }.
 * Bir bloğu "aşağı taşı" demek, onu çıkarıp bu listede bir sonraki yere koymaktır; böylece
 * sürüklemeden döngünün içine girer, sonundan dışarı çıkar.
 */
export function cursors(prog) {
  const out = [];
  const visit = (seq, owner, br) => {
    for (let i = 0; i <= seq.length; i++) {
      out.push({ owner: owner.id, br, i });
      const n = seq[i];
      if (n && n.b) visit(n.b, n, 'b');
      if (n && n.o) visit(n.o, n, 'o');
    }
  };
  for (const hat of prog) visit(hat.b, hat, 'b');
  return out;
}

export const sameCursor = (a, b) => !!a && !!b && a.owner === b.owner && a.br === b.br && a.i === b.i;

/** Bloğu imlecin gösterdiği yere koyar (programı yerinde değiştirir). */
export function insertAt(prog, cur, node) {
  const seq = seqOf(prog, cur);
  if (!seq) return false;
  seq.splice(Math.min(cur.i, seq.length), 0, node);
  return true;
}

/** Bloğu çıkarır; çıktığı yeri imleç olarak döndürür. "Başlayınca" şapkası silinmez. */
export function removeNode(prog, id) {
  const hit = findNode(prog, id);
  if (!hit || (hit.node.t === 'on' && hit.node.e === 'start')) return null;
  hit.seq.splice(hit.index, 1);
  return hit.owner ? { owner: hit.owner.id, br: hit.br, i: hit.index } : null;
}

/** Bloğu okuma sırasında bir yer yukarı (-1) ya da aşağı (+1) taşır. Taşınamıyorsa false. */
export function moveNode(prog, id, dir) {
  const hit = findNode(prog, id);
  if (!hit || hit.node.t === 'on') return false;
  const from = { owner: hit.owner.id, br: hit.br, i: hit.index };
  hit.seq.splice(hit.index, 1);
  const list = cursors(prog), at = list.findIndex((c) => sameCursor(c, from)), to = list[at + dir];
  insertAt(prog, to || from, hit.node);
  return !!to;
}

/** Türüne uymayan ya da tanınmayan blok var mı? (Bağlantıdan gelen programı süzmek için.) */
export function progFits(prog, kind) {
  const okBlocks = new Set(KIND_BLOCKS[kind]), okEvents = new Set(KIND_EVENTS[kind]);
  let ok = true;
  walk(prog, (n) => {
    if (!okBlocks.has(n.t)) ok = false;
    if (n.t === 'on' && !okEvents.has(n.e)) ok = false;
    if (n.t === 'if' && !CONDS[n.c]) ok = false;
  });
  return ok;
}

/**
 * Derslerle açılanlar. Atölyede yalnız açılmış parçalar ve bloklar görünür; her ders bir şey açar.
 * Kapının ve dikenin kendi blokları (açıl, kapan, çıkar, indir) parça açılınca gelir.
 */
export const GIVES = {
  3: { tag: 'atölye', title: 'Atölye açıldı!', text: 'Artık kendi kaleni kurabilirsin.', pieces: ['wall', 'knight', 'chest', 'monster'], blocks: ['fwd', 'left', 'right', 'wait', 'roar'] },
  4: { tag: 'tekrarla', title: 'Yeni blok: tekrarla', text: 'Atölyede canavarların artık döngü kurabilir.', blocks: ['repeat'] },
  5: { tag: 'altın', title: 'Yeni parça: altın', text: 'Kalene altın serpiştirebilirsin.', pieces: ['coin'] },
  6: { tag: 'sürekli tekrarla, diken', title: 'Yeni blok: sürekli tekrarla', text: 'Yeni parça da var: inip çıkan dikenler.', blocks: ['forever'], pieces: ['spikes'] },
  7: { tag: 'kapı', title: 'Yeni parça: kapı', text: 'Kapıya da program yazılır: ne zaman açılsın, ne zaman kapansın?', pieces: ['door'] },
  8: { tag: 'eğer / değilse', title: 'Yeni blok: eğer / değilse', text: 'Canavarların artık önüne bakıp karar verebilir.', blocks: ['if'], conds: ['wall'] },
  9: { tag: 'koş, görüş', title: 'Yeni bloklar: koş ve "görüyorsam"', text: 'Canavarların şövalyeyi görünce koşabilir.', blocks: ['dash'], conds: ['see'] },
  10: { tag: 'olaylar, anahtar, düğme', title: 'Yeni blok: olunca', text: 'Yeni parçalar: anahtar ve düğme. Bir şey olunca ne olacağını sen yaz.', blocks: ['on'], events: ['coin', 'key', 'plate', 'see'], pieces: ['key', 'plate'] },
  11: { tag: 'alarm', title: 'Yeni blok: alarm çal', text: 'Kalendeki her şey artık birbirine haber verebilir.', blocks: ['alarm'], events: ['alarm'] },
};
const ALWAYS = ['open', 'close', 'up', 'down'];

/** Geçilen derslere göre açık olanlar. `done`: ders numaraları ya da 'all'. */
export function unlocks(done) {
  const out = { pieces: new Set(), blocks: new Set(ALWAYS), conds: new Set(), events: new Set(['start']), workshop: false };
  for (const [id, g] of Object.entries(GIVES)) {
    if (done !== 'all' && !done.includes(Number(id))) continue;
    for (const k of ['pieces', 'blocks', 'conds', 'events']) for (const v of g[k] || []) out[k].add(v);
  }
  out.workshop = out.pieces.has('monster');
  return out;
}

/** Bir parçayı ya da bloğu hangi ders açar? (Kilitli düğmenin üstüne yazılır.) */
export function lessonFor(group, name) {
  for (const [id, g] of Object.entries(GIVES)) if ((g[group] || []).includes(name)) return Number(id);
  return null;
}

/** Atölyede bir tür için görünecek araçlar. */
export function toolsFor(kind, open) {
  const blocks = KIND_BLOCKS[kind].filter((b) => open.blocks.has(b));
  const conds = Object.keys(CONDS).filter((c) => open.conds.has(c));
  const events = KIND_EVENTS[kind].filter((e) => open.events.has(e));
  return { blocks: blocks.filter((b) => (b !== 'if' || conds.length) && (b !== 'on' || events.length > 1)), conds, events };
}
