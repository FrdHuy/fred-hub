// Pure rules for the hundred-lamp panel (home object and inside page); no DOM, tested in Node.
export const SLOTS = 100;
export const pad = (n, size = 3) => String(n).padStart(size, '0');

// Each slot is 'done' (lit), 'todo' (written, not yet) or 'empty' (no wish written yet).
// Looking back to `year`: a dated item is lit from its year on; an undated one only in the present.
export function lampStates(items, year = Infinity, now = Infinity) {
  return Array.from({ length: SLOTS }, (_, i) => {
    const item = items[i];
    if (!item) return 'empty';
    if (!item.done) return 'todo';
    return (item.year ?? now) <= year ? 'done' : 'todo';
  });
}
export const litCount = states => states.filter(state => state === 'done').length;

// The year dial runs from the earliest dated achievement (or ten years back) to this year.
export function yearSpan(items, now) {
  const years = items.map(item => item.year).filter(Boolean);
  return [Math.min(now - 1, ...years), now];
}

// Rotary selector: every `detent` degrees of turn moves one step.
export function knobSteps(totalDegrees, detent = 24) {
  return Math.trunc(totalDegrees / detent);
}

// Lever: dragging up by `travel` px turns it fully on (0 → 1); past the threshold it snaps on.
export function leverPosition(dy, travel = 70) {
  return Math.max(0, Math.min(1, -dy / travel));
}
export const LEVER_THRESHOLD = .62;
