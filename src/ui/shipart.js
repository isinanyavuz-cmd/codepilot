// Geminin üstten görünüşü (SVG). Rota ekranındaki gemi işareti, hangar önizlemesi ve
// sertifika aynı çizimi kullanır; renkler ve biçim hangardaki seçime göre değişir.
// Çizim 3B modelin (render/models.js) üstten izdüşümüdür: ölçek 18, burun yukarıda.

const DARK = '#465063', PANEL = '#0c1018', GLASS = '#070c18';

/** @param look  content/hangar.js içindeki lookOf() sonucu */
export function shipSvg(look, cls = '') {
  const { hull, accent, flame, shape } = look;
  const n = (v) => +v.toFixed(2), w = (x) => n(4.1 + x * 18 * shape.wing);
  // Sağ yarı çizilir, sol yarı aynalanır.
  const half = (inner) => `<g>${inner}</g><g transform="scale(-1 1)">${inner}</g>`;
  const wing = `<path d="M3.2-3.2L${w(0.6)} 5l${n(0.36 * shape.wing)} 5.800L${w(0.38)} 10.300 ${w(0.28)} 11.300 3.200 11.200z" fill="${hull.color}"/>`
    + `<path d="M4.100 4L${w(0.36)} 7.200v2.700l-${n(1.44 * shape.wing)} .900H4.100z" fill="${DARK}"/>`
    + `<path d="M3.200-3.200L${w(0.6)} 5" stroke="${accent.color}" stroke-width=".9" stroke-linecap="round" fill="none"/>`
    + `<path d="M${w(0.6)} 4.300v7" stroke="${DARK}" stroke-width="1.100" stroke-linecap="round"/>`
    + `<path d="M6.700 10.800L12.200 15v1.900l-5.500-.700z" fill="${hull.color}"/>`
    + `<path d="M5.100 3.400l1.900 3.200v5.200h-3.800V6.600z" fill="${DARK}"/><rect x="3" y="11.800" width="4.200" height="6.300" rx=".5" fill="${PANEL}"/>`
    + `<path d="M3 12.600h4.200M3 15h4.200" stroke="${DARK}" stroke-width=".8"/><path d="M3.100 16.800h4" stroke="${accent.color}" stroke-width=".5"/>`;
  const body = `<path d="M1-21h-2L-1.700-19.100-2.500-16.200-3.500-11.200-4.400-4.500-4.800 2-4.500 9.400-3.200 13.700H3.200L4.500 9.400 4.800 2 4.400-4.500 3.500-11.200 2.500-16.200 1.700-19.100z" fill="${hull.color}"/>`
    + '<path d="M0-21h1l.700 1.900.800 2.900 1 5 .900 6.700.400 6.500-.300 7.400-1.300 4.300H0z" fill="rgba(0,0,0,.16)"/>'
    + `<path d="M-.900-20.300v-2.200M.900-20.300v-2.200" stroke="${DARK}" stroke-width=".8" stroke-linecap="round"/>`
    + `<path d="M-1.200-16.500h2.400l.300 1.800h-3z" fill="${PANEL}"/>`
    + `<ellipse cx="0" cy="-7.200" rx="1.900" ry="6.100" fill="${DARK}"/><ellipse cx="0" cy="-7.200" rx="1.500" ry="5.600" fill="${GLASS}"/><path d="M-.600-11.200c-.400 1.600-.500 3.400-.400 5" stroke="#3f8fe0" stroke-width=".5" stroke-linecap="round" fill="none"/>`
    + half(`<path d="M3.300-10.600l.800 5.800" stroke="${accent.color}" stroke-width=".5" stroke-linecap="round"/>`)
    + `<path d="M-1.300-1.100h2.600l.800 2.200v5l-.500 2.800h-3.200l-.500-2.800v-5z" fill="${DARK}" opacity=".85"/><rect x="-1.100" y="2" width="2.200" height="3" fill="${PANEL}"/>`;
  return `<svg viewBox="-24 -24 48 48" class="${cls}" style="overflow:visible" aria-hidden="true">`
    + `<path class="flame" d="M3.500 18.100L5.100 27l1.600-8.900zM-3.500 18.100L-5.100 27l-1.600-8.900z" fill="${flame.color}"/>`
    + half(wing)
    + `<g transform="translate(0 9) scale(1 ${shape.nose}) translate(0 -9)">${body}</g></svg>`;
}
