// Küçük arayüz yardımcıları: DOM kurma, alttan açılan kart, soru penceresi, kısa bildirim.
// Tarayıcının kendi alert/prompt pencereleri kullanılmaz: telefonda çirkin durur, oyunu böler.

/** h('button', { class: 'btn', onclick: f }, 'Yazı') → düğüm. `html` yalnız kendi çizimlerimiz içindir. */
export function h(tag, props, ...kids) {
  const n = document.createElement(tag);
  for (const [k, v] of Object.entries(props || {})) {
    if (v == null || v === false) continue;
    if (k === 'class') n.className = v;
    else if (k === 'text') n.textContent = v;
    else if (k === 'html') n.innerHTML = v;
    else if (k === 'data') Object.assign(n.dataset, v);
    else if (k.startsWith('on')) n.addEventListener(k.slice(2), v);
    else n.setAttribute(k, v === true ? '' : v);
  }
  n.append(...kids.flat().filter((c) => c != null && c !== false));
  return n;
}

/** Ekranın altından açılan kart (geniş ekranda ortada). Dışına dokununca kapanır. */
export function sheet(content, { onClose, locked = false, cls = '' } = {}) {
  const card = h('div', { class: `sheet ${cls}` }, content);
  const veil = h('div', { class: 'veil' }, card);
  const close = (value) => { if (!veil.isConnected) return; veil.remove(); document.removeEventListener('keydown', onKey); if (onClose) onClose(value); };
  const onKey = (ev) => { if (ev.key === 'Escape' && !locked) close(); };
  veil.addEventListener('click', (ev) => { if (ev.target === veil && !locked) close(); });
  document.addEventListener('keydown', onKey);
  document.body.append(veil);
  return { el: card, close };
}

/** Seçenek listesi: sayı, koşul ya da olay seçmek için. Seçilen değeri verir; vazgeçilirse undefined. */
export function choose(title, options, current) {
  return new Promise((resolve) => {
    const grid = h('div', { class: `opts ${options.every((o) => String(o.label).length <= 2) ? 'nums' : ''}` });
    const s = sheet([h('div', { class: 'sheet-title', text: title }), grid], { onClose: resolve });
    for (const o of options) grid.append(h('button', { class: `btn opt ${o.value === current ? 'cur' : ''}`, text: o.label, onclick: () => s.close(o.value) }));
  });
}

/**
 * Soru penceresi. `input` verilirse yazı ister ve yazılanı döndürür; yoksa onayda true döner.
 * Vazgeçilirse null. `extra`: { text, value } alttaki ek düğme (ör. "sil"); basılınca `value` döner.
 */
export function ask({ title, text, input, max = 24, ok = 'Tamam', cancel = 'Vazgeç', danger = false, extra = null }) {
  return new Promise((resolve) => {
    const field = input != null ? h('input', { class: 'field', type: 'text', value: input, maxlength: max, 'aria-label': title, enterkeyhint: 'done' }) : null;
    const done = () => s.close(field ? field.value.trim() : true);
    const s = sheet([
      h('div', { class: 'sheet-title', text: title }),
      text && h('p', { class: 'sheet-text', text }),
      field,
      h('div', { class: 'row' },
        cancel && h('button', { class: 'btn ghost', text: cancel, onclick: () => s.close(null) }),
        h('button', { class: `btn ${danger ? 'danger' : 'go'}`, text: ok, onclick: done })),
      extra && h('button', { class: 'btn danger wide', text: extra.text, onclick: () => s.close(extra.value) }),
    ], { onClose: (v) => resolve(v === undefined ? null : v) });
    if (field) { field.addEventListener('keydown', (ev) => { if (ev.key === 'Enter') done(); }); field.focus(); field.select(); }
  });
}

let toastTimer = 0;
/** Ekranın altında kısa süre görünen bildirim. */
export function toast(text) {
  document.querySelector('.toast')?.remove();
  const t = h('div', { class: 'toast', role: 'status', text });
  document.body.append(t);
  clearTimeout(toastTimer);
  toastTimer = setTimeout(() => t.remove(), 2600);
}

/** Üst çubuk: geri düğmesi, başlık ve sağdaki düğmeler. */
export function topbar(title, { onBack, right = [] } = {}) {
  return h('header', { class: 'top' },
    onBack && h('button', { class: 'icon', 'aria-label': 'Geri', text: '‹', onclick: onBack }),
    typeof title === 'string' ? h('h1', { class: 'top-title', text: title }) : title,
    h('div', { class: 'top-right' }, right));
}
