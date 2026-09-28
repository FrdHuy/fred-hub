// The disc on the home rail catches the light: the diffraction colours turn and the glint slides
// toward the pointer (or with the phone's tilt, where the browser allows it). Sets --sheen, --gx, --gy.
export function attachSheen(stage, motion) {
  let target = 0, angle = 0, frame = 0, tilt = null, pointer = null;
  const disc = () => [...stage.querySelectorAll('.silver-disc')].find(element => { const box = element.getBoundingClientRect(); return box.width && box.right > 0 && box.left < innerWidth; });
  function step() {
    frame = 0;
    const element = disc(); if (!element) return;
    if (tilt !== null) target = tilt;
    else if (pointer) { const box = element.getBoundingClientRect(); target = Math.atan2(pointer.y - (box.top + box.height / 2), pointer.x - (box.left + box.width / 2)) * 180 / Math.PI; }
    // Ease along the shortest way round, so the light glides instead of jumping.
    let delta = ((target - angle + 540) % 360) - 180;
    angle += delta * .16;
    const rad = angle * Math.PI / 180;
    element.style.setProperty('--sheen', `${angle.toFixed(1)}deg`);
    element.style.setProperty('--gx', `${(50 + Math.cos(rad) * 27).toFixed(1)}%`);
    element.style.setProperty('--gy', `${(50 + Math.sin(rad) * 27).toFixed(1)}%`);
    if (Math.abs(delta) > .3) frame = requestAnimationFrame(step);
  }
  const queue = () => { if (!frame && !motion.matches) frame = requestAnimationFrame(step); };
  addEventListener('pointermove', e => { pointer = { x: e.clientX, y: e.clientY }; tilt = null; queue(); }, { passive: true });
  // Android and desktop browsers report tilt without asking; iOS stays with the default light.
  addEventListener('deviceorientation', e => { if (e.gamma === null) return; tilt = e.gamma * 3 + (e.beta ?? 0) - 45; queue(); }, { passive: true });
}
