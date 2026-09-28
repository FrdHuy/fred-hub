// Shelf geometry. offset = distance from the middle in cases (may be fractional while scrolling).
// The middle case faces front; neighbours open at an angle; far cases fold to their spine.
// Spacing tightens smoothly with distance, so the edges read as spines packed on a shelf.
export function pose(offset, w, d) {
  const side = Math.sign(offset), distance = Math.abs(offset);
  const turn = 88 * (1 - Math.exp(-distance / .85));
  const x = side * (w * .92 * (1 - Math.exp(-distance)) + (d + 6) * distance);
  // Pushed back as it turns, so the spine stays on the same plane as the front cover.
  const z = -(w / 2) * Math.sin(turn * Math.PI / 180);
  return { x, z, turn: -side * turn };
}
