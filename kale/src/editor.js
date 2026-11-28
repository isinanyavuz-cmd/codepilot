// Blok editörü. Telefonda sürüklemeden kullanılır:
//   - Paletteki bloğa dokun: sarı çizginin (imleç) durduğu yere eklenir.
//   - Programdaki bloğa dokun: seçilir, imleç onun altına gelir. Seçili blok silinir ya da ↑ ↓ ile taşınır;
//     taşınan blok döngünün içine girer, sonundan dışarı çıkar.
//   - Bir gövdenin sonundaki boşluğa dokun: imleç oraya gider.
import { BLOCKS, CONDS, EVENTS, makeBlock, insertAt, removeNode, moveNode, findNode, countBlocks } from './bloklar.js';
import { h, choose } from './arayuz.js';

// Palette yer dar: uzun adlar kısaltılır. Programa konan blok tam adını gösterir.
const PAL_LABEL = { alarm: 'alarm', repeat: 'tekrarla', forever: 'sürekli', if: 'eğer', on: 'olunca', up: 'çıkar', down: 'indir' };

export function createEditor({ onChange } = {}) {
  const view = h('div', { class: 'ed-prog' }), bar = h('div', { class: 'ed-bar' }), pal = h('div', { class: 'ed-pal' });
  const root = h('div', { class: 'ed' }, view, bar, pal);
  let prog = [], tools = { blocks: [], conds: [], events: [] }, cap = 0, readonly = false;
  let cursor = null, selected = null, history = [], running = null;

  const endCursor = () => ({ owner: prog[0].id, br: 'b', i: prog[0].b.length });
  const isCursor = (owner, br, i) => !readonly && !!cursor && cursor.owner === owner.id && cursor.br === br && cursor.i === i;
  const icon = (def) => h('span', { class: 'ic', text: def.icon });
  const pill = (text, what) => h('button', { class: 'pill', data: { pick: what }, text, disabled: readonly });

  function drawSeq(owner, br) {
    const seq = owner[br], box = h('div', { class: 'seq' });
    seq.forEach((n, i) => { if (isCursor(owner, br, i)) box.append(h('div', { class: 'ins' })); box.append(drawBlock(n)); });
    const here = isCursor(owner, br, seq.length);
    if (seq.length && here) box.append(h('div', { class: 'ins' }));
    box.append(h('div', { class: `slot ${seq.length ? '' : 'empty'} ${!seq.length && here ? 'here' : ''}`, data: { owner: owner.id, br }, text: seq.length ? '' : readonly ? 'boş' : 'buraya blok koy' }));
    return box;
  }

  function drawBlock(n) {
    const def = BLOCKS[n.t] || { label: n.t, icon: '?', cls: 'b-calm' };
    const state = `${n.id === selected ? 'sel' : ''} ${n.id === running ? 'run' : ''}`;
    if (!def.body) return h('div', { class: `blk leaf ${def.cls} ${state}`, data: { id: n.id } }, icon(def), def.label);
    const head = h('div', { class: 'blk-head', data: { id: n.id } }, icon(def));
    if (n.t === 'repeat') head.append(pill(String(n.n), 'n'), 'kez tekrarla');
    else if (n.t === 'if') head.append('eğer', pill(CONDS[n.c] || n.c, 'c'));
    else head.append(def.label);
    const box = h('div', { class: `blk box ${def.cls} ${state}`, data: { id: n.id } }, head, drawSeq(n, 'b'));
    if (n.t === 'if') box.append(h('div', { class: 'blk-mid', text: 'değilse' }), drawSeq(n, 'o'));
    box.append(h('div', { class: 'blk-foot' }));
    return box;
  }

  function drawHat(hat) {
    const head = h('div', { class: 'hat-head', data: { id: hat.id } });
    if (hat.e === 'start') head.append(h('span', { class: 'ic', text: '▶' }), EVENTS.start);
    else head.append(icon(BLOCKS.on), pill(EVENTS[hat.e] || hat.e, 'e'));
    return h('div', { class: `hat ${hat.id === selected ? 'sel' : ''} ${hat.id === running ? 'run' : ''}`, data: { id: hat.id } }, head, drawSeq(hat, 'b'));
  }

  /** `follow`: imleç görünür kalsın diye program alanını kaydır (yüklerken kaydırılmaz: program baştan okunur). */
  function draw(follow = true) {
    root.classList.toggle('ro', readonly);
    view.replaceChildren(...prog.map(drawHat));
    const sel = selected && findNode(prog, selected);
    const used = countBlocks(prog), full = !!cap && used >= cap;
    const canDelete = !!sel && !(sel.node.t === 'on' && sel.node.e === 'start'), canMove = !!sel && sel.node.t !== 'on';
    bar.replaceChildren(
      h('button', { class: 'btn small', text: '↶ Geri al', disabled: !history.length, onclick: undo }),
      h('button', { class: 'btn small', text: '↑', 'aria-label': 'Yukarı taşı', disabled: !canMove, onclick: () => move(-1) }),
      h('button', { class: 'btn small', text: '↓', 'aria-label': 'Aşağı taşı', disabled: !canMove, onclick: () => move(1) }),
      h('button', { class: 'btn small danger', text: 'Sil', disabled: !canDelete, onclick: del }),
      ...(cap ? [h('span', { class: `cap ${full ? 'full' : ''}`, text: `çanta ${used}/${cap}` })] : []),
    );
    pal.replaceChildren(...tools.blocks.map((t) => {
      const def = BLOCKS[t];
      const off = t === 'on' ? !freeEvents().length : full;
      return h('button', { class: `chip ${def.cls} ${off ? 'off' : ''}`, data: { add: t }, 'aria-label': def.label, onclick: () => add(t) }, icon(def), h('span', { class: 'chip-name', text: PAL_LABEL[t] || def.label }));
    }));
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

  function add(t) {
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
      if (!cursor || !insertAt(prog, cursor, node)) { cursor = endCursor(); insertAt(prog, cursor, node); }
      cursor = BLOCKS[t].body ? { owner: node.id, br: 'b', i: 0 } : { ...cursor, i: cursor.i + 1 };
      selected = null;
    });
  }

  function del() {
    mutate(() => { cursor = removeNode(prog, selected) || endCursor(); selected = null; });
  }

  function move(dir) {
    mutate(() => {
      if (!moveNode(prog, selected, dir)) return false;
      const hit = findNode(prog, selected);
      cursor = { owner: hit.owner.id, br: hit.br, i: hit.index + 1 };
      return true;
    });
    view.querySelector('.sel')?.scrollIntoView({ block: 'nearest' });
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

  view.addEventListener('click', (ev) => {
    if (readonly) return;
    const p = ev.target.closest('[data-pick]');
    if (p) { pick(p.dataset.pick, p.closest('[data-id]').dataset.id); return; }
    const slot = ev.target.closest('.slot');
    if (slot) {
      const owner = findNode(prog, slot.dataset.owner);
      if (owner) { cursor = { owner: slot.dataset.owner, br: slot.dataset.br, i: owner.node[slot.dataset.br].length }; selected = null; draw(); }
      return;
    }
    const b = ev.target.closest('.blk-head, .blk.leaf, .hat-head, .blk-mid, .blk-foot');
    if (!b) return;
    const id = b.dataset.id || b.parentElement.dataset.id, hit = findNode(prog, id);
    if (!hit) return;
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
      if (node) { node.classList.add('run'); (node.querySelector('.blk-head, .hat-head') || node).scrollIntoView({ block: 'nearest' }); }
    },
  };
}
