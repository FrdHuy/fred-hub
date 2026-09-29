// The 手记 typewriter (docs/design/notes-typewriter-v3.html): warm-white shell, Braun-style dished keys, one red RETURN.
// The carriage (paper, platen, knobs, bail) is one group that slides sideways (carriage.js).
// Pure string output so catalog.js stays importable from Node checks. Size it with --u on .tw (1u = 1px at 440px wide).
const ROWS = ['qwertyuiop', 'asdfghjkl', 'zxcvbnm'];
const esc = text => String(text).replace(/&/g, '&amp;').replace(/</g, '&lt;').replace(/>/g, '&gt;');
const key = (k, label = k.toUpperCase(), extra = '') => `<i class="tw-key${extra}" data-k="${k}">${label}</i>`;

export function typewriterMarkup({ kicker = '', title = '', line = '' } = {}) {
  return `<div class="tw" aria-hidden="true">
<div class="tw-carriage"><div class="tw-rest"></div>
<div class="tw-paper"><div class="tw-sheet"><small>${esc(kicker)}</small><b>${esc(title)}<span class="tw-caret"></span></b><p class="tw-line">${line}</p></div></div>
<div class="tw-collar l"></div><div class="tw-collar r"></div><div class="tw-knob l"></div><div class="tw-knob r"></div><div class="tw-platen"></div>
<div class="tw-bail">${'<i></i>'.repeat(41)}</div><div class="tw-roller l"></div><div class="tw-roller r"></div></div>
<div class="tw-apron"></div>
<div class="tw-shell"><div class="tw-silk l"><b>Fred.</b></div><div class="tw-window"></div><div class="tw-silk r">MANUAL · 01</div><div class="tw-grille"></div>
<div class="tw-keys"><div class="tw-row">${[...ROWS[0]].map(k => key(k)).join('')}</div>
<div class="tw-row">${[...ROWS[1]].map(k => key(k)).join('')}${key('enter', 'RET', ' ret')}</div>
<div class="tw-row">${key('shift', '⇧', ' mod')}${[...ROWS[2]].map(k => key(k)).join('')}${key('shift', '⇧', ' mod')}</div>
<i class="tw-space" data-k=" "></i></div></div>
</div>`;
}
