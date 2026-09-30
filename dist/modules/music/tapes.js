// Pure rules for the tapes (data.js). Shared by the room, the home cover and scripts/check-music.mjs.
export const COLORS = ['sage', 'sand', 'stone', 'ink'];
export const PREVIEW_SECONDS = 30;

// Only what can be played survives: a track needs a title and something to play.
export function parseTapes(data) {
  const list = Array.isArray(data) ? data : [];
  return list.filter(tape => tape && tape.id && tape.title).map(tape => ({
    id: String(tape.id), title: String(tape.title), color: COLORS.includes(tape.color) ? tape.color : 'sage', note: tape.note ?? '',
    a: side(tape.a), b: side(tape.b),
  }));
}
const side = tracks => (Array.isArray(tracks) ? tracks : []).filter(t => t && t.title && (t.audio || t.preview)).map(t => ({
  title: String(t.title), artist: String(t.artist ?? ''), audio: t.audio || '', preview: t.preview || '', link: t.link || '',
  seconds: Number(t.seconds) || 0,
}));

// How long a track runs on the tape: the whole song if Fred gave the file, else the preview.
export const runtime = track => track.audio ? (track.seconds || 240) : PREVIEW_SECONDS;
export const sideLength = tracks => tracks.reduce((sum, t) => sum + runtime(t), 0);
// Seconds from the start of the side to the start of track i.
export const offsetOf = (tracks, i) => tracks.slice(0, i).reduce((sum, t) => sum + runtime(t), 0);
// A point on the side (seconds) → which track and how far into it.
export function locate(tracks, at) {
  let rest = Math.max(0, at);
  for (let i = 0; i < tracks.length; i++) { const len = runtime(tracks[i]); if (rest < len || i === tracks.length - 1) return { index: i, at: Math.min(rest, len) }; rest -= len; }
  return { index: 0, at: 0 };
}
// The mechanical counter: three drums, one step every two seconds of tape.
export const counter = seconds => String(Math.floor(Math.max(0, seconds) / 2) % 1000).padStart(3, '0');
export const clock = seconds => `${Math.floor(seconds / 60)}:${String(Math.floor(seconds % 60)).padStart(2, '0')}`;
