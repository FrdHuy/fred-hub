export const STORAGE_KEY = 'fred.hub.bucketlist.v1';
export function parseEntries(raw) {
  if (!raw) return [];
  const data = JSON.parse(raw);
  if (!Array.isArray(data) || data.some(x => !x || typeof x.id !== 'string' || typeof x.text !== 'string' || typeof x.done !== 'boolean') || new Set(data.map(x=>x.id)).size !== data.length) throw new Error('Invalid checklist data');
  return data.map(({id,text,done}) => ({id,text,done}));
}
export function loadEntries(storage) { return parseEntries(storage.getItem(STORAGE_KEY)); }
export function saveEntries(storage, entries) { storage.setItem(STORAGE_KEY, JSON.stringify(entries)); }
