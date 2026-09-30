// 扭蛋机 (design: docs/design/gashapon.md, drafts gashapon-v5 / v7 / v8): a warm-white cap and base holding a pale-sage
// acrylic chamber full of capsules; a small zodiac knob, a satin crank with the one brick-red grip, the chute, the slider.
// Pure string output so catalog.js stays importable from Node checks. Size it with --u on .gc (1u = 1px at 300px wide).

export const ZODIAC = ['aries', 'taurus', 'gemini', 'cancer', 'leo', 'virgo', 'libra', 'scorpio', 'sagittarius', 'capricorn', 'aquarius', 'pisces'];
const GLYPHS = [...'♈♉♊♋♌♍♎♏♐♑♒♓'].map(g => g + '︎');
// Occasional eggs that look different; the frosted lamp egg is the rare special one.
export const VARIETIES = ['sage', 'stone', 'ink', 'tint', 'clear', 'mark', 'dots', 'stripe'];
// SPECIAL_ODDS: the chance a turn gives you the lamp egg; PILE_SPECIAL: the chance one is seen somewhere in the pile.
export const VARIETY_ODDS = 1 / 8, SPECIAL_ODDS = 1 / 40, PILE_SPECIAL = 1 / 4;

// A seeded generator, so a pile can be reproduced (checks) or drawn fresh on every visit (the page).
export function random(seed = 1) { let s = (Math.floor(seed) % 2147483646) + 1; return () => (s = (s * 16807) % 2147483647) / 2147483647; }

// One capsule. `kind` is '' (plain), a variety, or 'frost' (the special egg).
export function eggMarkup(kind = '', { x = 0, y = 0, s = 40, r = 0 } = {}) {
  const inner = kind === 'clear' ? '<b class="gc-gem"></b>' : kind === 'frost' ? '<b class="gc-core"></b>' : '';
  return `<i class="gc-egg${kind ? ' ' + kind : ''}" style="left:calc(${x.toFixed(1)}*var(--u));top:calc(${y.toFixed(1)}*var(--u));--s:calc(${s}*var(--u));--r:${r}deg"><b class="gc-in"></b><b class="gc-out"></b><b class="gc-lip"></b>${inner}</i>`;
}

// The pile in the chamber: three layers (back smaller and higher, front larger and lower), packed in rows up to a mound.
// Returns the layers as data, so the page and the checks see the same thing.
export function pile(rnd, { width = 276, floor = 218 } = {}) {
  const layers = [{ s: 36, h: 150 }, { s: 42, h: 118 }, { s: 48, h: 78 }];
  const out = layers.map(l => {
    const eggs = [];
    for (let row = 0; ; row++) {
      const y = floor - l.s / 2 - row * l.s * .78;
      let any = false;
      for (let col = 0; ; col++) {
        const x = 10 + l.s / 2 + col * l.s * .92 + (row % 2) * l.s * .46 + (rnd() - .5) * 6;
        if (x > width - 10 - l.s / 2) break;
        const mound = l.h * (1 - Math.pow(Math.abs(x - width / 2) / (width / 2), 2) * .55);
        if (floor - y > mound) continue;
        any = true;
        const kind = rnd() < VARIETY_ODDS ? VARIETIES[Math.floor(rnd() * VARIETIES.length)] : '';
        eggs.push({ x, y: y + (rnd() - .5) * 5, s: l.s, r: Math.round((rnd() - .5) * 60), kind });
      }
      if (!any) break;
    }
    return eggs;
  });
  // At most one lamp egg, and only now and then: in the front two layers, so it can be seen.
  if (rnd() < PILE_SPECIAL) { const layer = out[1 + Math.floor(rnd() * 2)]; if (layer.length) layer[Math.floor(rnd() * layer.length)].kind = 'frost'; }
  return out;
}

export function machineMarkup({ seed = 1, mode = 0, sign = 0 } = {}) {
  const layers = pile(random(seed));
  const chamber = layers.map((eggs, i) => `<div class="gc-layer l${i}">${eggs.map(e => eggMarkup(e.kind, e)).join('')}</div>${i < 2 ? '<div class="gc-fog"></div>' : ''}`).join('');
  const ring = GLYPHS.map((g, i) => { const a = i / 12 * 2 * Math.PI; return `<i style="left:calc(50% + ${(Math.sin(a) * 16.5).toFixed(2)}*var(--u));top:calc(50% + ${(-Math.cos(a) * 16.5).toFixed(2)}*var(--u))">${g}</i>`; }).join('');
  return `<div class="gc" aria-hidden="true" style="--mode:${mode};--sign:${sign}">
<div class="gc-shadow"></div><div class="gc-foot l"></div><div class="gc-foot r"></div>
<div class="gc-chamber"><div class="gc-wall"></div><div class="gc-table"></div>${chamber}<div class="gc-glass"></div><div class="gc-side l"></div><div class="gc-side r"></div></div>
<div class="gc-lid"></div><div class="gc-base"></div>
<div class="gc-zod">${ring}<div class="gc-knob"></div></div>
<div class="gc-crank"><div class="gc-face"></div><div class="gc-bar"><i class="gc-grip"></i></div><div class="gc-hub"></div></div>
<div class="gc-chute"><div class="gc-drop"></div><div class="gc-flap"></div></div>
<div class="gc-thumb"></div><i class="gc-switch"></i>
<svg class="gc-mark sign" viewBox="0 0 10 10"><path d="M3 1.5h4v7H3zM3 4h4"/></svg>
<svg class="gc-mark game" viewBox="0 0 10 10"><rect x="1.5" y="1.5" width="7" height="7" rx="1.5"/><circle cx="3.7" cy="3.7" r=".5"/><circle cx="6.3" cy="6.3" r=".5"/></svg>
<span class="gc-word">Fred.</span>
</div>`;
}
