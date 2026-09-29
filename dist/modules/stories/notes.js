// Pure rules for the notes list (data.js is written by scripts/publish-notes.mjs). Shared by the page, the home cover and checks.
export const TYPES = { travel: 'TRAVEL LOG', chapter: 'CHAPTER', essay: 'ESSAY', note: 'NOTE' };
// What Fred may write in a note's header: English or Chinese.
export const TYPE_WORDS = { travel: 'travel', 游记: 'travel', chapter: 'chapter', 阶段: 'chapter', essay: 'essay', 随笔: 'essay', note: 'note', 短记: 'note' };
export const DATE_PATTERN = /^\d{4}-\d{2}-\d{2}$/;

export const dotDate = date => date.split('-').reverse().join('.');           // 2024-10-12 → 12.10.2024
export const sortNotes = notes => [...notes].sort((a, b) => b.date.localeCompare(a.date) || a.id.localeCompare(b.id));
export const years = notes => [...new Set(notes.map(note => note.date.slice(0, 4)))].sort().reverse();

// Minutes to read: ~400 Chinese characters or ~220 English words a minute.
export function minutes(text) {
  const han = (text.match(/[㐀-鿿]/g) || []).length, words = (text.replace(/[㐀-鿿]/g, ' ').match(/[A-Za-z0-9]+/g) || []).length;
  return Math.max(1, Math.round(han / 400 + words / 220));
}

// The travel log for a trip on the board: same airport, the closest date (within 90 days).
export function noteForTrip(notes, trip) {
  if (!trip?.code) return null;
  const at = trip.date ? Date.UTC(trip.date.year, trip.date.month - 1, trip.date.day) : null;
  const matches = notes.filter(note => note.trip === trip.code);
  if (!at) return matches[0] ?? null;
  const scored = matches.map(note => ({ note, gap: Math.abs(Date.parse(note.date) - at) / 864e5 })).filter(x => x.gap <= 90).sort((a, b) => a.gap - b.gap);
  return scored[0]?.note ?? null;
}
// A chapter written about a Life List item (usually a life event).
export const noteForItem = (notes, text) => notes.find(note => note.milestone && note.milestone === text) ?? null;
