// Home-page object for the Life List: a hundred-lamp control panel (see docs/DESIGN.md).
// Pure string output so catalog.js stays importable from Node checks; lamp states arrive later from data.js.
const lamps = Array.from({ length: 100 }, (_, i) => `<i class="lamp" style="--n:${i}"></i>`).join('');

export function panelCover() {
  return `<div class="panel" data-power="off">
<span class="screw" aria-hidden="true"></span><span class="screw" aria-hidden="true"></span><span class="screw" aria-hidden="true"></span><span class="screw" aria-hidden="true"></span>
<div class="panel-field" aria-hidden="true">${lamps}</div>
<div class="panel-side">
<div class="panel-plate">LIFE LIST<small>Nº 100 · FRED</small></div>
<div class="panel-lcd" aria-hidden="true"><span class="ghost">888/888</span><span class="digits"></span></div>
<div class="panel-switch" aria-hidden="true"><span class="panel-on">ON</span><span class="panel-bezel"></span><span class="panel-lever"></span><span class="panel-off">OFF</span></div>
</div>
</div>`;
}
