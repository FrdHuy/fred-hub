// The home-page object for the Life List: a bamboo fortune-stick tube, drawn in SVG with light from the upper left.
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
  return `<div class="fortune">
<span class="fortune-shadow" aria-hidden="true"></span>
<div class="fortune-body">
<svg class="fortune-mouth" viewBox="0 0 120 240" aria-hidden="true"><defs><radialGradient id="${id}m" cx=".5" cy=".35" r=".7"><stop offset="0" stop-color="#1c130a"/><stop offset=".7" stop-color="#2e2110"/><stop offset="1" stop-color="#4d3918"/></radialGradient></defs>
<ellipse cx="60" cy="40" rx="39" ry="8.6" fill="url(#${id}m)"/><path d="M21 40a39 8.6 0 0 1 78 0" fill="none" stroke="#e8cf98" stroke-width="1.2" opacity=".8"/></svg>
<div class="fortune-sticks">${sticks}</div>
<svg class="fortune-tube" viewBox="0 0 120 240" aria-hidden="true"><defs>
<linearGradient id="${id}b" x1="0" x2="1"><stop offset="0" stop-color="#5a3f18"/><stop offset=".08" stop-color="#8a6832"/><stop offset=".24" stop-color="#d9bd80"/><stop offset=".33" stop-color="#e9d39c"/><stop offset=".46" stop-color="#c8a664"/><stop offset=".72" stop-color="#a4803f"/><stop offset=".9" stop-color="#76582a"/><stop offset=".96" stop-color="#8d6d38"/><stop offset="1" stop-color="#5e4319"/></linearGradient>
<linearGradient id="${id}v" x1="0" y1="0" x2="0" y2="1"><stop offset="0" stop-color="#fff" stop-opacity=".12"/><stop offset=".55" stop-color="#fff" stop-opacity="0"/><stop offset="1" stop-color="#2a1a08" stop-opacity=".28"/></linearGradient>
<filter id="${id}f" x="0" y="0" width="100%" height="100%"><feTurbulence type="fractalNoise" baseFrequency=".85 .018" numOctaves="3" seed="4"/><feColorMatrix values="0 0 0 0 .28  0 0 0 0 .18  0 0 0 0 .06  0 0 0 -1.6 1.05"/></filter>
<clipPath id="${id}c"><path d="M21 40a39 8.6 0 0 0 78 0V224a39 8.6 0 0 1-78 0Z"/></clipPath>
<linearGradient id="${id}n" x1="0" y1="0" x2="0" y2="1"><stop offset="0" stop-color="#f7e4b4" stop-opacity=".85"/><stop offset=".35" stop-color="#b8924f" stop-opacity=".2"/><stop offset="1" stop-color="#3b2a10" stop-opacity=".55"/></linearGradient>
</defs>
<g clip-path="url(#${id}c)">
<rect x="0" y="0" width="120" height="240" fill="url(#${id}b)"/>
<rect x="0" y="0" width="120" height="240" filter="url(#${id}f)" opacity=".55"/>
<rect x="0" y="0" width="120" height="240" fill="url(#${id}v)"/>
<path d="M21 116a39 5 0 0 0 78 0v5a39 5 0 0 1-78 0Z" fill="url(#${id}n)"/>
<path d="M21 190a39 5 0 0 0 78 0v5a39 5 0 0 1-78 0Z" fill="url(#${id}n)"/>
<g font-family="Songti SC,STSong,serif" font-size="15" text-anchor="middle"><text x="60.6" y="77.6" fill="#f3dfb0" opacity=".55">人</text><text x="60.6" y="97.6" fill="#f3dfb0" opacity=".55">生</text><text x="60" y="77" fill="#5b4118" opacity=".78">人</text><text x="60" y="97" fill="#5b4118" opacity=".78">生</text></g>
</g>
<path d="M21 40a39 8.6 0 0 0 78 0" fill="none" stroke="#f6e3b3" stroke-width="1.6" opacity=".9"/>
<path d="M21 40a39 8.6 0 0 0 78 0" fill="none" stroke="#5b3f15" stroke-width=".6" opacity=".5" transform="translate(0 1.4)"/>
</svg>
</div>
<div class="fortune-drop" hidden><b></b><span></span><em></em></div>
</div>`;
}
