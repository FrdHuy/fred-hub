// 保险箱：你们的回忆在仓库和网站上只以密文存在，要用暗号才能打开。浏览器和 scripts/seal-memories.mjs 共用这个文件。
// 算法：暗号 → PBKDF2（60 万次，SHA-256）→ 256 位密钥 → AES-GCM。暗号本身不写在任何地方。
// 注意：密文是公开的，谁都可以拿去慢慢试，所以暗号要长（一句只有你们知道的话），不要用生日。
export const ITERATIONS = 600000;
const text = new TextEncoder(), readable = new TextDecoder();
export const toBase64 = bytes => { let s = ''; for (const b of new Uint8Array(bytes)) s += String.fromCharCode(b); return btoa(s); };
export const fromBase64 = s => Uint8Array.from(atob(s), c => c.charCodeAt(0));
// 暗号不计较大小写、首尾和多余的空格、全角半角。
export const normalise = phrase => phrase.normalize('NFKC').trim().replace(/\s+/g, ' ').toLowerCase();

export async function deriveKey(phrase, salt, iterations = ITERATIONS) {
  const material = await crypto.subtle.importKey('raw', text.encode(normalise(phrase)), 'PBKDF2', false, ['deriveKey']);
  return crypto.subtle.deriveKey({ name: 'PBKDF2', salt: fromBase64(salt), iterations, hash: 'SHA-256' }, material, { name: 'AES-GCM', length: 256 }, true, ['encrypt', 'decrypt']);
}
// 记住钥匙用：把密钥导出成一串字符 / 从那串字符还原（见 memory.js）。存的是密钥，不是暗号。
export const exportKey = async key => toBase64(await crypto.subtle.exportKey('raw', key));
export const importKey = raw => crypto.subtle.importKey('raw', fromBase64(raw), 'AES-GCM', true, ['encrypt', 'decrypt']);

export async function sealBytes(key, bytes) {
  const iv = crypto.getRandomValues(new Uint8Array(12));
  return { iv: toBase64(iv), data: new Uint8Array(await crypto.subtle.encrypt({ name: 'AES-GCM', iv }, key, bytes)) };
}
// 密钥不对（或内容被改过）时返回 null，不抛错。
export async function openBytes(key, iv, data) {
  try { return new Uint8Array(await crypto.subtle.decrypt({ name: 'AES-GCM', iv: fromBase64(iv) }, key, data)); } catch { return null; }
}
export async function sealJSON(key, value) { const { iv, data } = await sealBytes(key, text.encode(JSON.stringify(value))); return { iv, data: toBase64(data) }; }
export async function openJSON(key, sealed) { const bytes = await openBytes(key, sealed.iv, fromBase64(sealed.data)); return bytes && JSON.parse(readable.decode(bytes)); }
