// Routes: #/ (home), #/room (the 3D cabin), #/collection/<id>, and #/collection/<id>/<sub> — a place inside a module (an article, a flight).
export function readRoute(hash = location.hash) {
  const path = hash.replace(/^#/, '') || '/';
  if (path === '/') return { type: 'home' };
  if (path === '/room' || path === '/room/') return { type: 'room' };
  const match = path.match(/^\/collection\/([^/]+)(?:\/([^/]+))?\/?$/);
  if (match) {
    try { const route = { type: 'collection', id: decodeURIComponent(match[1]) }; if (match[2]) route.sub = decodeURIComponent(match[2]); return route; }
    catch { return { type: 'missing' }; }
  }
  return { type: 'missing' };
}
export function collectionPath(id, sub) { return `#/collection/${encodeURIComponent(id)}${sub ? `/${encodeURIComponent(sub)}` : ''}`; }
export function navigate(id, sub) { location.hash = id ? collectionPath(id, sub) : '#/'; }
