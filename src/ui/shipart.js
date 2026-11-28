// Geminin üstten görünüşü (SVG). Rota ekranındaki gemi işareti, hangar önizlemesi ve
// sertifika aynı çizimi kullanır; renkler ve biçim hangardaki seçime göre değişir.

/** @param look  content/hangar.js içindeki lookOf() sonucu */
export function shipSvg(look, cls = '') {
  const { hull, accent, flame, shape } = look;
  const px = (12 * shape.wing).toFixed(2);
  // Motor kapsülü (gondol): x=0 çevresinde çizilir, iki yana kaydırılır.
  const pod = `<path d="M0-11c2.200 1 3 3 3 6v17h-6V-5c0-3 .800-5 3-6z" fill="${hull.color}"/><path d="M0-11c2.200 1 3 3 3 6h-6c0-3 .800-5 3-6z" fill="${accent.color}"/>`;
  return `<svg viewBox="-24 -24 48 48" class="${cls}" style="overflow:visible" aria-hidden="true">`
    + `<path class="flame" d="M-3 14L0 27l3-13zM-${px} 12l-2 11 2 1 2-1-2-11zM${px} 12l-2 11 2 1 2-1-2-11z" fill="${flame.color}"/>`
    + `<rect x="-${px}" y="3" width="${(24 * shape.wing).toFixed(2)}" height="5" fill="#27324f"/><rect x="-${px}" y="3.600" width="${(24 * shape.wing).toFixed(2)}" height="1.300" fill="${accent.color}"/>`
    + `<g transform="translate(-${px} 0)">${pod}</g><g transform="translate(${px} 0)">${pod}</g>`
    + `<g transform="translate(0 14) scale(1 ${shape.nose}) translate(0 -14)"><path d="M0-21l3 5 4 13 1 9-1 6-3 2h-8l-3-2-1-6 1-9 4-13z" fill="${hull.color}"/><path d="M0-21l3 5 4 13 1 9-1 6-3 2H0z" fill="rgba(255,255,255,.18)"/>`
    + `<path d="M0-12l1.400 4v17l-1.400 3-1.400-3V-8z" fill="#27324f"/><ellipse cx="0" cy="-10" rx="2.600" ry="4.200" fill="#2fc8ff"/>`
    + `<path d="M-7-1l-1 9 1.600-.200.800-8.400zM7-1l1 9-1.600-.200-.800-8.400z" fill="${accent.color}"/></g></svg>`;
}
