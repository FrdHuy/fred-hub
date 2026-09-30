// The 磁带 walkman: a sage portable cassette player (Braun / early-80s Sony), one brick-red PLAY key on the top edge.
// Pure string output so catalog.js stays importable from Node checks. Size it with --u on .wm (1u = 1px at 440px wide).
// The reels turn with --spin-l / --spin-r (deg); the tape packs grow and shrink with --pack-l / --pack-r (0–1).
const esc = text => String(text ?? '').replace(/&/g, '&amp;').replace(/</g, '&lt;').replace(/>/g, '&gt;').replace(/"/g, '&quot;');

// One cassette, used in the walkman's window and on the desk. `side` is 'a' or 'b'.
export function cassetteMarkup({ title = '', side = 'a', color = 'sage' } = {}) {
  return `<div class="cs" data-color="${esc(color)}"><div class="cs-label"><b>${esc(title)}</b><span>${side === 'b' ? 'B' : 'A'}</span><i class="cs-band"></i></div>
<div class="cs-window"><i class="cs-pack l"></i><i class="cs-pack r"></i><i class="cs-hub l"></i><i class="cs-hub r"></i></div>
<i class="cs-screw tl"></i><i class="cs-screw tr"></i><i class="cs-screw bl"></i><i class="cs-screw br"></i><i class="cs-foot"></i></div>`;
}

// The VU meter's printed scale: an arc of ticks, the last stretch heavier (the "+" zone, in ink, not red).
const VU_SCALE = (() => {
  const cx = 45, cy = 66, marks = [];
  for (let i = 0; i <= 10; i++) {
    const a = (-40 + i * 8) * Math.PI / 180, major = i % 2 === 0, r1 = 44, r2 = major ? 50 : 48;
    const p = (r, s = Math.sin(a), c = Math.cos(a)) => `${(cx + r * s).toFixed(1)} ${(cy - r * c).toFixed(1)}`;
    marks.push(`<path d="M${p(r1)}L${p(r2)}" stroke-width="${major ? .9 : .6}"/>`);
  }
  const arc = (from, to, r) => { const s = from * Math.PI / 180, e = to * Math.PI / 180; return `M${(cx + r * Math.sin(s)).toFixed(1)} ${(cy - r * Math.cos(s)).toFixed(1)}A${r} ${r} 0 0 1 ${(cx + r * Math.sin(e)).toFixed(1)} ${(cy - r * Math.cos(e)).toFixed(1)}`; };
  return `<svg class="wm-scale" viewBox="0 0 90 60">${marks.join('')}<path d="${arc(-40, 40, 44)}" stroke-width=".6" fill="none"/><path d="${arc(16, 40, 46)}" stroke-width="3" fill="none" opacity=".75"/></svg>`;
})();

export function walkmanMarkup({ tape = null, side = 'a' } = {}) {
  return `<div class="wm" aria-hidden="true">
<div class="wm-keys"><i class="wm-key" data-k="stop"><svg viewBox="0 0 10 10"><rect x="2" y="2" width="6" height="6"/></svg></i><i class="wm-key play" data-k="play"><svg viewBox="0 0 10 10"><path d="M3 1.8 8.4 5 3 8.2z"/></svg></i><i class="wm-key" data-k="rew"><svg viewBox="0 0 14 10"><path d="M7 1.8 1.6 5 7 8.2zM12.6 1.8 7.2 5l5.4 3.2z"/></svg></i><i class="wm-key" data-k="ff"><svg viewBox="0 0 14 10"><path d="M1.4 1.8 6.8 5 1.4 8.2zM7 1.8 12.4 5 7 8.2z"/></svg></i></div>
<div class="wm-body">
<div class="wm-door"><div class="wm-glass">${tape ? cassetteMarkup({ ...tape, side }) : '<div class="wm-empty"></div>'}</div></div>
<div class="wm-side"><div class="wm-vu">${VU_SCALE}<i class="wm-needle"></i><span>VU</span></div>
<div class="wm-count"><i>0</i><i>0</i><i>0</i></div><i class="wm-led"></i><div class="wm-grille"></div></div>
<span class="wm-silk l"><b>Fred.</b></span><span class="wm-silk r">STEREO CASSETTE · 01</span>
</div>
<i class="wm-wheel"></i>
</div>`;
}
