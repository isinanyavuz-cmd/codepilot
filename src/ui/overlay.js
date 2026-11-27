// Ekranın ortasında açılan kartlar (giriş, sonuç, günlük, ipucu iskeleti).
const $ = (id) => document.getElementById(id);

/**
 * Kart uzunsa (yatay telefonda Hangar, Atölye, Köprü) altta "aşağıda devamı var" işareti çıkar;
 * çocuk sona kadar kaydırınca kaybolur.
 */
function watchScroll(card) {
  const check = () => card.classList.toggle('more', card.scrollHeight - card.clientHeight - card.scrollTop > 12);
  card.addEventListener('scroll', check, { passive: true });
  requestAnimationFrame(check);
}

export function showCard(card) { const o = $('overlay'); o.replaceChildren(card); o.hidden = false; watchScroll(card); }
export function hideCard() { $('overlay').hidden = true; }

/**
 * Kart kurar. `data-act` taşıyan düğmelere basılınca `onAct(act)` çağrılır.
 * `close` verilirse kartın sağ üst köşesine o eylemi yapan bir kapatma düğmesi konur:
 * kart ekrandan uzun olsa da kaydırmadan kapatılabilir.
 */
export function makeCard(html, onAct, cls = '', { close = null } = {}) {
  const card = document.createElement('div'); card.className = `card glass ${cls}`.trim();
  card.innerHTML = `${close ? `<button class="cardx" data-act="${close}" aria-label="Kapat"><svg viewBox="0 0 32 32" aria-hidden="true"><use href="#i-cross"/></svg></button>` : ''}${html}`;
  card.addEventListener('click', (e) => { const act = e.target.closest('[data-act]')?.dataset.act; if (act) onAct(act, e); });
  return card;
}
