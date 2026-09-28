export function readRoute(hash = location.hash) {
  const path = hash.replace(/^#/, '') || '/';
  if (path === '/') return { type: 'home' };
  const match = path.match(/^\/collection\/([^/]+)\/?$/);
  if (match) { try { return { type: 'collection', id: decodeURIComponent(match[1]) }; } catch { return { type: 'missing' }; } }
  return { type: 'missing' };
}
export function collectionPath(id) { return `#/collection/${encodeURIComponent(id)}`; }
export function navigate(id) { location.hash = id ? collectionPath(id) : '#/'; }
