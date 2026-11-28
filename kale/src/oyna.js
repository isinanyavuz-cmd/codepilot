// Oynama ekranı: hırsızı oyuncu yürütür. Her hamleden sonra kaledeki her şey programından bir
// hareket yapar. Bir şövalyeye, kapıya ya da dikene dokununca programı okunur: kaleyi yenmenin
// yolu, onu kuranın yazdığı kodu okumaktır.
import { buildLevel, initState, step } from './motor.js';
import { KIND_NAMES } from './bloklar.js';
import { createBoard } from './tahta.js';
import { createEditor } from './editor.js';
import { h, ic, sheet, topbar } from './arayuz.js';
import { sfx, sfxFor } from './ses.js';

const KEYS = { ArrowUp: 'U', ArrowRight: 'R', ArrowDown: 'D', ArrowLeft: 'L', w: 'U', d: 'R', s: 'D', a: 'L', ' ': '.' };

/**
 * `source`: 'own' (atölyeden deneme; kazanınca kale kanıtlanır), 'sample' (örnek kale), 'shared' (bağlantıyla gelen).
 */
export function playScreen(ctx, { castle, source, back, sampleIndex }) {
  const level = buildLevel(castle);
  const coins = level.item.flat().filter((it) => it === 'coin').length;
  let state = initState(level), busy = false, queued = null, peek = null, resultTimer = 0;

  const msg = h('div', { class: 'msg' });
  const board = createBoard({ onCell });
  const stage = h('div', { class: 'stage' }, msg, h('div', { class: 'boardbox' }, board.el));
  const stats = h('span', { class: 'stats' });
  const key = (m, face, name) => h('button', { class: `btn key k${m === '.' ? 'w' : m}`, 'aria-label': name, onclick: () => move(m) }, m === '.' ? face : ic(face));
  const pad = h('div', { class: 'dpad' }, key('U', 'arrowU', 'Yukarı'), key('L', 'arrowL', 'Sol'), key('.', 'bekle', 'Bekle'), key('R', 'arrowR', 'Sağ'), key('D', 'arrowD', 'Aşağı'));
  const panel = h('div', { class: 'panel play' }, pad);
  const el = h('div', { class: 'screen' },
    topbar(castle.name, { onBack: () => ctx.back(back), right: [stats, h('button', { class: 'btn small', onclick: restart }, ic('reset'), 'Baştan')] }),
    h('div', { class: 'game' }, stage, panel));

  function draw(fx = [], snap = false) {
    board.render(state, fx, snap);
    stats.textContent = `Hamle ${state.t}${coins ? ` · Altın ${state.intruder.coins}/${coins}` : ''}`;
  }

  function restart() {
    clearTimeout(resultTimer);
    state = initState(level); busy = false; queued = null;
    msg.className = 'msg'; msg.textContent = 'Hazineye ulaş! Bir şövalyeye dokunursan programını okursun.';
    board.setLevel(level);
    draw([], true);
    fit();
  }

  function move(m) {
    if (state.status !== 'play') return;
    if (busy) { queued = m; return; }
    const r = step(level, state, m);
    state = r.state;
    draw(r.fx);
    sfxFor(r.fx.length ? r.fx : [{ t: 'turn' }]);
    if (peek) peek.editor.highlight(state.ents[peek.i].cur);
    if (state.status !== 'play') { resultTimer = setTimeout(result, 700); return; }
    busy = true;
    setTimeout(() => { busy = false; if (queued) { const q = queued; queued = null; move(q); } }, 190);
  }

  function result() {
    const won = state.status === 'won';
    sfx(won ? 'win' : 'fail');
    msg.className = `msg ${won ? 'good' : 'bad'}`;
    msg.textContent = won ? `Hazine senin! ${state.t} hamlede bitirdin.` : 'Yakalandın!';
    if (!won) {
      const s = sheet([
        h('div', { class: 'sheet-title big', text: 'Yakalandın!' }),
        h('p', { class: 'sheet-text', text: 'Şövalyelerin programını oku, zamanını kolla.' }),
        h('div', { class: 'row' }, h('button', { class: 'btn go', text: 'Tekrar dene', onclick: () => { s.close(); restart(); } })),
      ], { cls: 'result' });
      return;
    }
    const proved = source === 'own' && ctx.prove(castle);
    const buttons = [h('button', { class: 'btn', text: 'Tekrar oyna', onclick: () => { s.close(); restart(); } })];
    if (source === 'own') buttons.push(h('button', { class: 'btn go', text: 'Paylaş', onclick: () => { s.close(); ctx.share(castle); } }));
    else if (ctx.open().workshop) buttons.push(h('button', { class: 'btn go', text: 'Kopyala ve değiştir', onclick: () => { s.close(); ctx.copyCastle(castle); } }));
    else buttons.push(h('button', { class: 'btn go', text: 'Ben de kale kurayım', onclick: () => { s.close(); ctx.go(''); } }));
    const s = sheet([
      h('div', { class: 'sheet-title big', text: 'Hazine senin!' }),
      h('p', { class: 'sheet-text', text: proved ? `${state.t} hamle. Kalen çözülebiliyor: artık paylaşabilirsin.` : `${state.t} hamlede bitirdin.` }),
      h('div', { class: 'row' }, buttons),
    ], { cls: 'result' });
  }

  /** Dokunulan parçanın programını gösterir (salt okunur; çalışan blok vurgulanır). */
  function onCell(x, y) {
    const i = state.ents.findIndex((e) => e.x === x && e.y === y);
    if (i < 0) return;
    const e = level.ents[i], editor = createEditor();
    editor.load({ prog: e.prog.hats, readonly: true });
    editor.highlight(state.ents[i].cur);
    board.select(i);
    peek = { i, editor };
    const s = sheet([
      h('div', { class: 'sheet-title', text: `${KIND_NAMES[e.kind]} ne yapıyor?` }),
      editor.el,
      h('div', { class: 'row' }, h('button', { class: 'btn go', text: 'Tamam', onclick: () => s.close() })),
    ], { cls: 'peek', onClose: () => { peek = null; board.select(null); } });
  }

  function onKey(ev) {
    const m = KEYS[ev.key];
    if (!m || document.querySelector('.veil')) return;
    ev.preventDefault();
    move(m);
  }
  document.addEventListener('keydown', onKey);

  function fit() {
    const wide = getComputedStyle(stage.parentElement).flexDirection === 'row';
    const availW = stage.clientWidth - 20;
    const availH = wide ? stage.clientHeight - msg.offsetHeight - 28 : Math.round(window.innerHeight * 0.52);
    const cell = Math.max(22, Math.min(64, Math.floor(Math.min(availW / level.w, availH / level.h))));
    board.setCell(cell);
  }

  restart();
  if (source === 'shared') msg.textContent = 'Bu kaleyi biri senin için kurdu. Hazineye ulaşabilir misin?';
  if (source === 'sample' && sampleIndex != null && castle.note) msg.textContent = castle.note;
  return { el, fit, destroy() { clearTimeout(resultTimer); document.removeEventListener('keydown', onKey); } };
}
