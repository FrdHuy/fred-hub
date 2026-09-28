// The home-page object for the Life List: a fortune-stick tube, drawn in SVG with light from the upper left.
// Pure string output (no DOM) so catalog.js stays importable from Node checks. Ids are unique per cover.
let serial = 0;

// Stick layout inside the mouth: x (% of width), extra height, lean.
const STICKS = [[31, 6, -12], [35, 14, -9], [39, 2, -7], [42, 18, -5], [45, 9, -3], [48, 20, -1], [51, 5, 1], [54, 16, 3], [57, 11, 5], [60, 1, 7], [63, 15, 9], [67, 7, 12], [37, 19, -10], [47, 13, -2], [55, 3, 4], [65, 17, 10]];

export function sealSvg(text, id = `seal${++serial}`) {
  // A cinnabar seal with frayed edges: turbulence displaces the outline like ink on rough paper.
  const [a, b] = Array.from(text);
  return `<svg class="seal" viewBox="0 0 40 40" aria-hidden="true"><defs><filter id="${id}" x="-10%" y="-10%" width="120%" height="120%"><feTurbulence type="fractalNoise" baseFrequency=".9" numOctaves="2" seed="7" result="n"/><feDisplacementMap in="SourceGraphic" in2="n" scale="2.2"/><feComponentTransfer><feFuncA type="table" tableValues="0 .92 .8"/></feComponentTransfer></filter></defs><g filter="url(#${id})" fill="none" stroke="#b23a2a"><rect x="4" y="4" width="32" height="32" rx="2.5" stroke-width="2.4"/><text x="20" y="${b ? 18.5 : 25}" text-anchor="middle" font-size="${b ? 12 : 15}" fill="#b23a2a" stroke="none" font-family="Songti SC,STSong,serif">${a}</text>${b ? `<text x="20" y="31.5" text-anchor="middle" font-size="12" fill="#b23a2a" stroke="none" font-family="Songti SC,STSong,serif">${b}</text>` : ''}</g></svg>`;
}

export function fortuneCover() {
  const id = `ft${++serial}`;
  const sticks = STICKS.map(([x, h, r], i) => `<i class="fortune-stick" style="--x:${x};--h:${h};--r:${r}deg;--n:${i}"></i>`).join('');
  // Same studio language as the optical drive and the boarding pass: matte sage ceramic, a paper label, soft top-left light.
  return `<div class="fortune">
<span class="fortune-shadow" aria-hidden="true"></span>
<div class="fortune-body">
<svg class="fortune-mouth" viewBox="0 0 120 240" aria-hidden="true"><defs><radialGradient id="${id}m" cx=".5" cy=".3" r=".75"><stop offset="0" stop-color="#3c4238"/><stop offset=".75" stop-color="#555d50"/><stop offset="1" stop-color="#7a8372"/></radialGradient></defs>
<ellipse cx="60" cy="40" rx="39" ry="8.6" fill="url(#${id}m)"/><path d="M21 40a39 8.6 0 0 1 78 0" fill="none" stroke="#f2f4ee" stroke-width="1.4" opacity=".9"/></svg>
<div class="fortune-sticks">${sticks}</div>
<svg class="fortune-tube" viewBox="0 0 120 240" aria-hidden="true"><defs>
<linearGradient id="${id}b" x1="0" x2="1"><stop offset="0" stop-color="#8f9a88"/><stop offset=".1" stop-color="#b3bcab"/><stop offset=".28" stop-color="#dfe3da"/><stop offset=".36" stop-color="#e9ece5"/><stop offset=".5" stop-color="#d3d8cd"/><stop offset=".76" stop-color="#bcc4b5"/><stop offset=".92" stop-color="#9ea896"/><stop offset=".97" stop-color="#aab3a2"/><stop offset="1" stop-color="#8a9483"/></linearGradient>
<linearGradient id="${id}v" x1="0" y1="0" x2="0" y2="1"><stop offset="0" stop-color="#fff" stop-opacity=".18"/><stop offset=".5" stop-color="#fff" stop-opacity="0"/><stop offset="1" stop-color="#3b4634" stop-opacity=".22"/></linearGradient>
<linearGradient id="${id}l" x1="0" x2="1"><stop offset="0" stop-color="#d9d4c4"/><stop offset=".25" stop-color="#f7f3e8"/><stop offset=".38" stop-color="#fbf8ef"/><stop offset=".75" stop-color="#ebe6d8"/><stop offset="1" stop-color="#d3cdbb"/></linearGradient>
<filter id="${id}g" x="0" y="0" width="100%" height="100%"><feTurbulence type="fractalNoise" baseFrequency="1.4" numOctaves="2" seed="3"/><feColorMatrix values="0 0 0 0 .25  0 0 0 0 .28  0 0 0 0 .22  0 0 0 -2.2 1.2"/></filter>
<clipPath id="${id}c"><path d="M21 40a39 8.6 0 0 0 78 0V224a39 8.6 0 0 1-78 0Z"/></clipPath>
</defs>
<g clip-path="url(#${id}c)">
<rect x="0" y="0" width="120" height="240" fill="url(#${id}b)"/>
<rect x="0" y="0" width="120" height="240" filter="url(#${id}g)" opacity=".18"/>
<rect x="0" y="0" width="120" height="240" fill="url(#${id}v)"/>
<path d="M32 104a39 7.6 0 0 0 56 0V150a39 7.6 0 0 1-56 0Z" fill="url(#${id}l)"/>
<path d="M32 104a39 7.6 0 0 0 56 0" fill="none" stroke="#fff" stroke-width=".6" opacity=".8"/>
<g font-family="ui-monospace,SF Mono,Menlo,monospace" fill="#4b5549" text-anchor="middle"><text x="60" y="119" font-size="4.2" letter-spacing="1.2" opacity=".7">FRED’S</text><text x="60" y="131" font-size="8.2" letter-spacing="1.1">SOMEDAY</text><text x="60" y="142" font-size="4.2" letter-spacing="1.2" opacity=".7">Nº ${String(STICKS.length).padStart(2, '0')}</text></g>
<circle cx="80.5" cy="112" r="1.6" fill="#b34934"/>
<path d="M21 212a39 7 0 0 0 78 0v2.4a39 7 0 0 1-78 0Z" fill="#6f7a68" opacity=".35"/>
</g>
<path d="M21 40a39 8.6 0 0 0 78 0" fill="none" stroke="#f7f8f3" stroke-width="2.2"/>
<path d="M21 40a39 8.6 0 0 0 78 0" fill="none" stroke="#6f7a68" stroke-width=".6" opacity=".45" transform="translate(0 1.8)"/>
</svg>
</div>
<div class="fortune-drop" hidden><b></b><span></span><em></em></div>
</div>`;
}
