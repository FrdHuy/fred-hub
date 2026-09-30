// Pure helpers for the tape recorder (scripts/music-picker.mjs): an iTunes result → a track, and the data.js source.
import { parseTapes } from '../../dist/modules/music/tapes.js';

export const HEADER = `// Fred 的磁带。用录音台编辑：node scripts/music-picker.mjs（说明见 docs/磁带-填写.md）。
// 一盒磁带：{ id, title, color: sage | sand | stone | ink, note, a: [曲目], b: [曲目] }
// 一首歌：{ title, artist, audio: "文件名.mp3"（放在 audio/，整首）, preview: 苹果 30 秒试听（没有 audio 时用）, link: Apple Music, seconds }
`;

// One song from the iTunes Search API.
export function trackFromItunes(item) {
  if (!item || item.kind !== 'song' || !item.trackName) return null;
  return {
    title: item.trackName, artist: item.artistName ?? '', preview: item.previewUrl ?? '',
    link: (item.trackViewUrl ?? '').replace(/[?&]uo=\d+/, ''), seconds: Math.round((item.trackTimeMillis ?? 0) / 1000),
    art: (item.artworkUrl100 ?? '').replace('100x100bb', '200x200bb'), album: item.collectionName ?? '',
  };
}

// A file name for an uploaded song: ascii, short, never clashing with one already used.
export function audioName(original, taken = new Set()) {
  const ext = (original.match(/\.(mp3|m4a|aac|ogg|wav)$/i)?.[1] ?? 'mp3').toLowerCase();
  const base = original.replace(/\.[^.]+$/, '').normalize('NFKD').replace(/[^\w-]+/g, '-').replace(/^-+|-+$/g, '').toLowerCase().slice(0, 40) || 'track';
  let name = `${base}.${ext}`, n = 2;
  while (taken.has(name)) name = `${base}-${n++}.${ext}`;
  return name;
}

// Tape ids from their titles; kept if they already have one.
export function tapeId(title, taken = new Set()) {
  const base = String(title).normalize('NFKD').replace(/[^\w-]+/g, '-').replace(/^-+|-+$/g, '').toLowerCase().slice(0, 30) || 'tape';
  let id = base, n = 2;
  while (taken.has(id)) id = `${base}-${n++}`;
  return id;
}

// Only the fields the site reads are written; empty ones are left out.
const clean = track => Object.fromEntries(Object.entries({ title: track.title, artist: track.artist, audio: track.audio, preview: track.preview, link: track.link, seconds: track.seconds }).filter(([, v]) => v !== '' && v !== undefined && v !== null && v !== 0));
export function tapesSource(list) {
  const tapes = parseTapes(list).map(t => ({ id: t.id, title: t.title, color: t.color, ...(t.note ? { note: t.note } : {}), a: t.a.map(clean), b: t.b.map(clean) }));
  return `${HEADER}export default ${JSON.stringify(tapes, null, 2)};\n`;
}
