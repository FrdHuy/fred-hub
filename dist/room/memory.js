// 回忆的状态：锁着 / 打开。打开 = 用暗号解出 memories/sealed.js 里的内容。
// 「记住」：解锁后把密钥存在这台设备上（localStorage），7 天后失效，要重新输入暗号。
import { deriveKey, exportKey, importKey, openJSON } from './vault.js';

const KEY = 'fred-cabin-key', REMEMBER = 7 * 24 * 3600 * 1000;

export function createMemory() {
  let sealed = null, data = null;
  const listeners = new Set(), tell = () => { for (const listener of listeners) listener(data); };
  const load = async () => sealed ??= (await import('./memories/sealed.js')).default;
  const forget = () => { try { localStorage.removeItem(KEY); } catch {} };
  return {
    get data() { return data; },                        // null = 锁着
    onChange(listener) { listeners.add(listener); },
    // 进小屋时：这台设备 7 天内解过锁就直接打开。
    async resume() {
      try {
        const saved = JSON.parse(localStorage.getItem(KEY) ?? 'null');
        if (!saved) return false;
        if (!(saved.until > Date.now())) { forget(); return false; }
        const opened = await openJSON(await importKey(saved.key), await load());
        if (!opened) { forget(); return false; }       // 换过暗号：旧钥匙作废
        data = opened; tell(); return true;
      } catch { return false; }
    },
    // 用暗号开锁。对了返回 true 并记住 7 天；错了返回 false。
    async unlock(phrase) {
      const box = await load(), key = await deriveKey(phrase, box.salt, box.iterations), opened = await openJSON(key, box);
      if (!opened) return false;
      try { localStorage.setItem(KEY, JSON.stringify({ key: await exportKey(key), until: Date.now() + REMEMBER })); } catch {}
      data = opened; tell(); return true;
    },
    lock() { forget(); data = null; tell(); },
  };
}

// 第几天：在一起那天算第 1 天。日期是 'YYYY-MM-DD'，按访客本地的今天算。
export function dayCount(since, today = new Date()) {
  const [y, m, d] = since.split('-').map(Number);
  return Math.floor((Date.UTC(today.getFullYear(), today.getMonth(), today.getDate()) - Date.UTC(y, m - 1, d)) / 864e5) + 1;
}
// 离下一个周年还有几天（当天 = 0），以及那是第几个周年。
export function nextAnniversary(since, today = new Date()) {
  const [y, m, d] = since.split('-').map(Number), now = Date.UTC(today.getFullYear(), today.getMonth(), today.getDate());
  let year = today.getFullYear(); if (Date.UTC(year, m - 1, d) < now) year += 1;
  return { days: Math.round((Date.UTC(year, m - 1, d) - now) / 864e5), years: year - y };
}
