// Blok editörü. Bloklar sürüklenip bırakılır; tek dokunuş da iş görür.
//   - Paletteki bloğu programa sürükle: bırakılacağı yeri sarı çizgi gösterir. Yalnızca dokunursan
//     blok, yanıp sönen sarı çizginin (imleç) durduğu yere eklenir.
//   - Programdaki bloğu sürükle: içindekilerle birlikte taşınır. Aşağıya, palete bırakılırsa silinir.
//   - Programdaki bloğa dokun: seçilir ve üstünde ✕ çıkar; ✕ bloğu siler. İmleç onun altına gelir.
//   - Bir gövdenin sonundaki boşluğa dokun: imleç oraya gider.
import { BLOCKS, CONDS, EVENTS, makeBlock, insertAt, removeNode, moveTo, findNode, countBlocks } from './bloklar.js';
import { h, ic, choose } from './arayuz.js';
import { sfx } from './ses.js';

// Palette yer dar: uzun adlar kısaltılır. Programa konan blok tam adını gösterir.
const PAL_LABEL = { honk: 'korna', alarm: 'alarm', repeat: 'tekrarla', forever: 'sürekli', if: 'eğer', on: 'olunca', up: 'çıkar', down: 'indir' };
const DRAG_START = 8;     // parmak bu kadar piksel oynamadan sürükleme başlamaz: dokunuş dokunuş kalır
const EDGE = 34;          // sürüklerken program alanının bu kadar kenarına gelinince alan kayar
const HEAD = 38;          // bir blok satırının boyu (stil.css ile aynı)
const HANDLE = '.blk-head, .blk.leaf, .blk-mid, .blk-foot';

export function createEditor({ onChange } = {}) {
  const view = h('div', { class: 'ed-prog' }), bar = h('div', { class: 'ed-bar' }), pal = h('div', { class: 'ed-pal' });
  const dropLine = h('div', { class: 'drop', hidden: true });
  const bin = h('div', { class: 'bin' }, ic('trash'), h('span', { text: 'Silmek için buraya bırak' }));
  const root = h('div', { class: 'ed' }, view, bar, pal);
  let prog = [], tools = { blocks: [], conds: [], events: [] }, cap = 0, readonly = false;
  let cursor = null, selected = null, history = [], running = null;
  let drag = null, lastDrag = 0;

  const endCursor = () => ({ owner: prog[0].id, br: 'b', i: prog[0].b.length });
  const isCursor = (owner, br, i) => !readonly && !!cursor && cursor.owner === owner.id && cursor.br === br && cursor.i === i;
  const pill = (text, what) => h('button', { class: 'pill', data: { pick: what }, text, disabled: readonly });
  const delBtn = (id) => h('button', { class: 'del', 'aria-label': 'Sil', data: { del: id } }, ic('x'));
  const stateOf = (n) => `${n.id === selected && !readonly ? 'sel' : ''} ${n.id === running ? 'run' : ''}`;

  function drawSeq(owner, br) {
    const seq = owner[br], box = h('div', { class: 'seq', data: { owner: owner.id, br } });
    seq.forEach((n, i) => { if (isCursor(owner, br, i)) box.append(h('div', { class: 'ins' })); box.append(drawBlock(n)); });
    const here = isCursor(owner, br, seq.length);
    if (seq.length && here) box.append(h('div', { class: 'ins' }));
    box.append(h('div', { class: `slot ${seq.length ? '' : 'empty'} ${!seq.length && here ? 'here' : ''}`, data: { owner: owner.id, br }, text: seq.length ? '' : readonly ? 'boş' : 'bloğu buraya sürükle' }));
    return box;
  }

  function drawBlock(n) {
    const def = BLOCKS[n.t] || { label: n.t, icon: '', cls: 'b-calm' };
    const sel = n.id === selected && !readonly;
    if (!def.body) return h('div', { class: `blk leaf ${def.cls} ${stateOf(n)}`, data: { id: n.id } }, ic(def.icon), def.label, sel && delBtn(n.id));
    const head = h('div', { class: 'blk-head', data: { id: n.id } }, ic(def.icon));
    if (n.t === 'repeat') head.append(pill(String(n.n), 'n'), 'kez tekrarla');
    else if (n.t === 'if') head.append('eğer', pill(CONDS[n.c] || n.c, 'c'));
    else head.append(def.label);
    if (sel) head.append(delBtn(n.id));
    const box = h('div', { class: `blk box ${def.cls} ${stateOf(n)}`, data: { id: n.id } }, head, drawSeq(n, 'b'));
    if (n.t === 'if') box.append(h('div', { class: 'blk-mid', text: 'değilse' }), drawSeq(n, 'o'));
    box.append(h('div', { class: 'blk-foot' }));
    return box;
  }

  function drawHat(hat) {
    const head = h('div', { class: 'hat-head', data: { id: hat.id } });
    if (hat.e === 'start') head.append(ic('play'), EVENTS.start);
    else head.append(ic(BLOCKS.on.icon), pill(EVENTS[hat.e] || hat.e, 'e'));
    if (hat.e !== 'start' && hat.id === selected && !readonly) head.append(delBtn(hat.id));
    return h('div', { class: `hat ${stateOf(hat)}`, data: { id: hat.id } }, head, drawSeq(hat, 'b'));
  }

  /** `follow`: imleç görünür kalsın diye program alanını kaydır (yüklerken kaydırılmaz: program baştan okunur). */
  function draw(follow = true) {
    root.classList.toggle('ro', readonly);
    view.replaceChildren(dropLine, ...prog.map(drawHat));   // çizgi mutlak konumludur; başta durur ki son şapka :last-child kalsın
    const used = countBlocks(prog), full = !!cap && used >= cap;
    bar.replaceChildren(
      h('button', { class: 'btn small', disabled: !history.length, onclick: undo }, ic('undo'), 'Geri al'),
      ...(cap ? [h('span', { class: `cap ${full ? 'full' : ''}`, text: `çanta ${used}/${cap}` })] : []),
    );
    pal.replaceChildren(...tools.blocks.map((t) => {
      const def = BLOCKS[t];
      const off = t === 'on' ? !freeEvents().length : full;
      return h('button', { class: `chip ${def.cls} ${off ? 'off' : ''}`, data: { add: t }, 'aria-label': def.label, onclick: () => add(t) }, ic(def.icon), h('span', { class: 'chip-name', text: PAL_LABEL[t] || def.label }));
    }), bin);
    if (!readonly && follow) view.querySelector('.ins, .slot.here')?.scrollIntoView({ block: 'nearest' });
  }

  const freeEvents = () => tools.events.filter((e) => e !== 'start' && !prog.some((hat) => hat.e === e));
  const nudge = (node) => { if (!node) return; node.classList.remove('nudge'); void node.offsetWidth; node.classList.add('nudge'); };

  /** Değişikliği yapar; yapılmadan önceki hali "geri al" için saklar. */
  function mutate(fn) {
    history.push({ prog: JSON.stringify(prog), cursor });
    if (history.length > 60) history.shift();
    if (fn() === false) history.pop();
    else if (onChange) onChange(prog);
    draw();
  }

  function undo() {
    const last = history.pop();
    if (!last) return;
    prog = JSON.parse(last.prog); cursor = last.cursor; selected = null;
    if (onChange) onChange(prog);
    draw();
  }

  /** Yeni blok ekler. `at`: bırakıldığı yer; verilmezse (dokunuşta) imlecin durduğu yere konur. */
  function add(t, at = null) {
    if (readonly) return;
    if (t === 'on') {
      const free = freeEvents();
      if (!free.length) return nudge(pal.querySelector('[data-add="on"]'));
      mutate(() => { const hat = makeBlock('on', { e: free[0] }); prog.push(hat); cursor = { owner: hat.id, br: 'b', i: 0 }; selected = null; });
      view.scrollTop = view.scrollHeight;
      return;
    }
    if (cap && countBlocks(prog) >= cap) return nudge(bar.querySelector('.cap'));
    mutate(() => {
      const node = makeBlock(t, t === 'if' ? { c: tools.conds[0] || 'wall' } : {});
      let cur = at || cursor;
      if (!cur || !insertAt(prog, cur, node)) { cur = endCursor(); insertAt(prog, cur, node); }
      cursor = BLOCKS[t].body ? { owner: node.id, br: 'b', i: 0 } : { ...cur, i: cur.i + 1 };
      selected = null;
    });
  }

  function del(id) {
    mutate(() => { cursor = removeNode(prog, id) || endCursor(); selected = null; });
  }

  async function pick(what, id) {
    const hit = findNode(prog, id);
    if (!hit) return;
    const n = hit.node;
    let options, title;
    if (what === 'n') { title = 'Kaç kez?'; options = [2, 3, 4, 5, 6, 7, 8, 9].map((v) => ({ value: v, label: String(v) })); }
    else if (what === 'c') { title = 'Neye baksın?'; options = [...new Set([...tools.conds, n.c])].map((v) => ({ value: v, label: CONDS[v] || v })); }
    else { title = 'Ne olunca?'; options = [...new Set([n.e, ...freeEvents()])].map((v) => ({ value: v, label: EVENTS[v] || v })); }
    const value = await choose(title, options, n[what]);
    if (value === undefined || value === n[what]) return;
    mutate(() => { const again = findNode(prog, id); if (!again) return false; again.node[what] = value; return true; });
  }

  // ── sürükle-bırak ──
  // Parmak basılınca hemen sürükleme başlamaz; biraz oynayınca başlar. Sürüklenen bloğun kopyası
  // parmağı izler, program yerinde durur: bırakılacak yeri yalnızca sarı çizgi gösterir, bloklar
  // parmağın altında zıplayıp durmaz.

  function grab(ev) {
    if (readonly || drag || (ev.pointerType === 'mouse' && ev.button !== 0) || ev.target.closest('[data-del]')) return;
    const tile = ev.target.closest('[data-add]');
    if (tile) {
      if (tile.classList.contains('off')) return;
      drag = { type: tile.dataset.add };
    } else {
      const part = ev.target.closest(HANDLE);
      if (!part || !view.contains(part)) return;
      drag = { id: part.dataset.id || part.parentElement.dataset.id, el: part.closest('.blk') };
    }
    Object.assign(drag, { pid: ev.pointerId, x0: ev.clientX, y0: ev.clientY, x: ev.clientX, y: ev.clientY, live: false });
    window.addEventListener('pointermove', onMove);
    window.addEventListener('pointerup', onUp);
    window.addEventListener('pointercancel', onUp);
  }

  /** Sürükleme başlar: bloğun kopyası parmağa yapışır. */
  function lift() {
    drag.live = true;
    // Olaylar bundan sonra editöre gelsin: parmağın altındaki düğüm değişse de sürükleme kopmasın.
    try { root.setPointerCapture(drag.pid); } catch (err) { /* yakalanamazsa pencere dinleyicileri yeter */ }
    selected = null;
    view.querySelectorAll('.sel').forEach((n) => n.classList.remove('sel'));
    view.querySelectorAll('.del').forEach((n) => n.remove());
    let ghost;
    if (drag.id) {
      const box = drag.el.getBoundingClientRect();
      ghost = drag.el.cloneNode(true);
      ghost.style.width = `${box.width}px`;
      drag.dx = drag.x0 - box.left; drag.dy = drag.y0 - box.top;
      drag.el.classList.add('lift');
    } else {
      ghost = drag.type === 'on' ? drawHat(makeBlock('on', { e: freeEvents()[0] })) : drawBlock(makeBlock(drag.type, drag.type === 'if' ? { c: tools.conds[0] || 'wall' } : {}));
      drag.dx = 30; drag.dy = HEAD / 2;
    }
    ghost.classList.remove('run');
    ghost.classList.add('held');
    document.body.append(ghost);
    drag.ghost = ghost;
    root.classList.add('dragging');
    root.classList.toggle('moving', !!drag.id);
    drag.timer = setInterval(autoScroll, 30);
    if (navigator.vibrate) navigator.vibrate(8);          // "tuttun" hissi (destekleyen telefonlarda)
  }

  const inside = (box, x, y, pad = 0) => x >= box.left - pad && x <= box.right + pad && y >= box.top - pad && y <= box.bottom + pad;

  /**
   * Şimdi bırakılırsa ne olur? { bin } çöpe gider · { hat } yeni olay şapkası · { cur, … } programda bir yer · null vazgeçilir.
   * Yer, sürüklenen kopyanın ilk satırının ortasına en yakın blok arasıdır (sıralanan listelerdeki gibi:
   * kopya bir bloğun üst yarısındaysa önüne, alt yarısındaysa arkasına girer); iç içe gövdelerde kopyanın sol kenarı da sayılır.
   */
  function aim() {
    const vb = view.getBoundingClientRect();
    if (drag.y > vb.bottom) return drag.id && inside(root.getBoundingClientRect(), drag.x, drag.y, 12) ? { bin: true } : null;
    if (!inside(vb, drag.x, drag.y, 40)) return null;
    if (drag.type === 'on') return { hat: true };
    const px = drag.x - drag.dx + 12, py = drag.y - drag.dy + HEAD / 2;
    let best = null;
    for (const seq of view.querySelectorAll('.seq')) {
      if (drag.el && drag.el.contains(seq)) continue;            // blok kendi içine bırakılamaz
      const kids = [...seq.children].filter((k) => k.classList.contains('blk'));
      const slot = kids.length ? null : seq.querySelector(':scope > .slot');
      const left = (kids[0] || slot).getBoundingClientRect().left;
      const tops = kids.map((k) => k.getBoundingClientRect().top - 3);
      const ys = kids.length ? [...tops, kids[kids.length - 1].getBoundingClientRect().bottom + 3] : [slot.getBoundingClientRect().top + slot.offsetHeight / 2];
      ys.forEach((y, i) => {
        const d = Math.abs(py - y) + (px < left - 14 ? 40 : 0);    // kopya gövdenin solunda duruyorsa içine girmek zorlaşır
        if (!best || d < best.d) best = { d, cur: { owner: seq.dataset.owner, br: seq.dataset.br, i }, x: left, y, slot };
      });
    }
    return best;
  }

  function showAim(a) {
    view.querySelectorAll('.slot.here').forEach((n) => n.classList.remove('here'));
    const line = !!(a && a.cur && !a.slot);
    dropLine.hidden = !line;
    if (line) {
      const vb = view.getBoundingClientRect();
      dropLine.style.transform = `translate(${Math.round(a.x - vb.left + view.scrollLeft)}px, ${Math.round(a.y - vb.top + view.scrollTop - 3)}px)`;
    }
    if (a && a.slot) a.slot.classList.add('here');
    view.classList.toggle('hat-here', !!(a && a.hat));
    pal.classList.toggle('hot', !!(a && a.bin));
  }

  function place() {
    drag.ghost.style.transform = `translate(${Math.round(drag.x - drag.dx)}px, ${Math.round(drag.y - drag.dy)}px) rotate(-1.5deg)`;
    showAim(aim());
  }

  function autoScroll() {
    if (!drag || !drag.live) return;
    const vb = view.getBoundingClientRect();
    const dir = drag.y > vb.top - 40 && drag.y < vb.top + EDGE ? -1 : drag.y < vb.bottom && drag.y > vb.bottom - EDGE ? 1 : 0;
    const before = view.scrollTop;
    if (dir) view.scrollTop += dir * 9;
    if (view.scrollTop !== before) showAim(aim());
  }

  function onMove(ev) {
    if (!drag || ev.pointerId !== drag.pid) return;
    drag.x = ev.clientX; drag.y = ev.clientY;
    if (!drag.live) {
      if (Math.hypot(drag.x - drag.x0, drag.y - drag.y0) < DRAG_START) return;
      lift();
    }
    place();
  }

  function onUp(ev) {
    if (!drag || ev.pointerId !== drag.pid) return;
    const d = drag;
    let a = null;
    if (d.live && ev.type === 'pointerup') { d.x = ev.clientX; d.y = ev.clientY; a = aim(); }
    drag = null;
    window.removeEventListener('pointermove', onMove);
    window.removeEventListener('pointerup', onUp);
    window.removeEventListener('pointercancel', onUp);
    if (!d.live) return;                       // sürüklenmedi: bu bir dokunuştu, tıklama kendi işini yapar
    clearInterval(d.timer);
    d.ghost.remove();
    try { root.releasePointerCapture(d.pid); } catch (err) { /* zaten bırakılmış */ }
    root.classList.remove('dragging', 'moving');
    pal.classList.remove('hot');
    view.classList.remove('hat-here');
    dropLine.hidden = true;
    lastDrag = performance.now();
    if (!a) return draw(false);                // dışarı bırakıldı ya da yarıda kesildi: hiçbir şey değişmez
    sfx(a.bin ? 'bump' : 'tap');
    if (a.bin) return del(d.id);
    if (a.hat) return add('on');
    if (!d.id) return add(d.type, a.cur);
    mutate(() => {
      if (!moveTo(prog, d.id, a.cur)) return false;
      const hit = findNode(prog, d.id);
      cursor = { owner: hit.owner.id, br: hit.br, i: hit.index + 1 };
      return true;
    });
  }

  root.addEventListener('pointerdown', grab);
  // Sürüklemenin sonunda parmak kalkınca tarayıcı bir de "tıklama" üretebilir: o tıklama yutulur.
  root.addEventListener('click', (ev) => { if (performance.now() - lastDrag < 80) { ev.stopPropagation(); ev.preventDefault(); } }, true);

  view.addEventListener('click', (ev) => {
    if (readonly) return;
    const x = ev.target.closest('[data-del]');
    if (x) { sfx('bump'); del(x.dataset.del); return; }
    const p = ev.target.closest('[data-pick]');
    if (p) { pick(p.dataset.pick, p.closest('[data-id]').dataset.id); return; }
    const slot = ev.target.closest('.slot');
    if (slot) {
      const owner = findNode(prog, slot.dataset.owner);
      if (owner) { cursor = { owner: slot.dataset.owner, br: slot.dataset.br, i: owner.node[slot.dataset.br].length }; selected = null; draw(); }
      return;
    }
    const b = ev.target.closest(`${HANDLE}, .hat-head`);
    const id = b && (b.dataset.id || b.parentElement.dataset.id), hit = id && findNode(prog, id);
    if (!hit) { if (selected) { selected = null; draw(false); } return; }     // boşluğa dokunmak seçimi bırakır
    if (selected === id) selected = null;
    else {
      selected = id;
      cursor = hit.node.t === 'on' ? { owner: id, br: 'b', i: hit.node.b.length } : { owner: hit.owner.id, br: hit.br, i: hit.index + 1 };
    }
    draw();
  });

  return {
    el: root,
    /** Programı yükler. Ağacın sahibi editördür; güncel hali getProg() verir. */
    load(opts) {
      prog = opts.prog; tools = { blocks: [], conds: [], events: [], ...opts.tools }; cap = opts.cap || 0; readonly = !!opts.readonly;
      history = []; selected = null; running = null; cursor = endCursor();
      draw(false);
      view.scrollTop = 0;
    },
    getProg: () => prog,
    /** Çalışan bloğu vurgular (null: hiçbiri). */
    highlight(id) {
      if (running === id) return;
      running = id;
      view.querySelectorAll('.run').forEach((n) => n.classList.remove('run'));
      if (!id) return;
      const node = [...view.querySelectorAll('.blk, .hat')].find((n) => n.dataset.id === id);
      if (node) { node.classList.add('run'); if (!drag) (node.querySelector('.blk-head, .hat-head') || node).scrollIntoView({ block: 'nearest' }); }
    },
  };
}
