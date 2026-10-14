// 回忆的状态：锁着 / 打开。打开 = 用暗号解出 memories/sealed.js 里的内容，再连上线（cloud.js）。
//   · 线上还是空的：把 sealed.js 的内容导入一次（Fred 在电脑上写的 memories/ 就是这样「搬进」小屋的）
//   · 之后以线上为准：两个人在小屋里添加 / 修改 / 删除、浇水，彼此都看得到；sealed.js 只剩初始导入和连不上时的只读备份
// 「记住」：解锁后把密钥存在这台设备上（localStorage），7 天后失效，要重新输入暗号。
// 「我是谁」：每台设备选一次（localStorage fred-cabin-me），浇水、送花、写信都标上名字。
import { deriveKey, exportKey, importKey, openJSON, openBytes, sealBytes, toBase64, fromBase64 } from './vault.js';
import { stampIds, upsert, remove } from './edits.js';
import { preparePhoto } from './pictures.js';
import { createCloud } from './cloud.js';

const KEY = 'fred-cabin-key', ME = 'fred-cabin-me', REMEMBER = 7 * 24 * 3600 * 1000, REFRESH = 45000;

export function createMemory() {
  let sealed = null, data = null, held = null, timer = 0;  // held：开着时手里的密钥（解照片、连线上用）
  const cloud = createCloud();
  const pictures = new Map();                              // 已经解开的照片：'id.t' / 'id.f' → Promise<blob 地址>
  // 一个监听出错（比如画花园时）不能连累开锁和保存：各自 try 住，错误记到控制台。
  const listeners = new Set(), tell = () => { for (const listener of listeners) try { listener(data); } catch (error) { console.error('room:', error); } };
  const load = async () => sealed ??= (await import('./memories/sealed.js')).default;
  const forget = () => { try { localStorage.removeItem(KEY); } catch {} };
  const drop = () => { for (const url of pictures.values()) url.then(u => u && URL.revokeObjectURL(u)); pictures.clear(); held = null; };
  // 连上线：空的就导入一次；连不上就留在只读的 sealed.js 内容上。
  async function connect(opened) {
    const remote = await cloud.connect(held);
    if (remote === null) data = await cloud.change(() => ({ ...opened, water: {}, totals: {} }));
    else if (remote) data = remote;
    else return;
    // 从文件导入的旧条目没有 id：补上（之后才能按 id 改、删）。
    if (stampIds(structuredClone(data))) data = await cloud.change(state => { stampIds(state); return state; });
    tell(); clearInterval(timer); timer = setInterval(() => { if (!document.hidden) self.refresh(); }, REFRESH);
  }
  const self = {
    get data() { return data; },                        // null = 锁着
    onChange(listener) { listeners.add(listener); },
    // 进小屋时：这台设备 7 天内解过锁就直接打开。
    async resume() {
      try {
        const saved = JSON.parse(localStorage.getItem(KEY) ?? 'null');
        if (!saved) return false;
        if (!(saved.until > Date.now())) { forget(); return false; }
        const key = await importKey(saved.key), opened = await openJSON(key, await load());
        if (!opened) { forget(); return false; }       // 换过暗号：旧钥匙作废
        held = key; data = opened; tell(); await connect(opened); return true;
      } catch { return false; }
    },
    // 用暗号开锁。对了返回 true 并记住 7 天；错了返回 false。
    async unlock(phrase) {
      const box = await load(), key = await deriveKey(phrase, box.salt, box.iterations), opened = await openJSON(key, box);
      if (!opened) return false;
      try { localStorage.setItem(KEY, JSON.stringify({ key: await exportKey(key), until: Date.now() + REMEMBER })); } catch {}
      held = key; data = opened; tell(); await connect(opened); return true;
    },
    lock() { forget(); drop(); clearInterval(timer); cloud.forget(); data = null; tell(); },
    get online() { return cloud.online; },
    get me() { try { return localStorage.getItem(ME) ?? ''; } catch { return ''; } },
    set me(name) { try { localStorage.setItem(ME, name); } catch {} tell(); },
    // 改一处：mutate(一份拷贝) → 改好的那份。连着线就写到线上（两个人都看得到），返回 true；没连上返回 false，什么都不改。
    async change(mutate) {
      if (!cloud.online) return false;
      data = await cloud.change(mutate); tell(); return true;
    },
    // 新增 / 修改 / 删除一条回忆（name：letters、timeline、places……，见 edits.js）。
    save(name, item) { return self.change(state => upsert(state, name, item, self.me)); },
    remove(name, id) { return self.change(state => remove(state, name, id)); },
    // 从小屋里加照片：缩小、加密、上传，再记进相册。progress(第几张, 一共几张)。返回放进去了几张。
    async addPhotos(files, progress) {
      let done = 0;
      for (const [index, file] of [...files].entries()) {
        progress?.(index + 1, files.length);
        const picture = await preparePhoto(file); if (!picture) continue;
        const id = [...crypto.getRandomValues(new Uint8Array(10))].map(b => b.toString(16).padStart(2, '0')).join('');
        for (const [size, bytes] of [['t', picture.thumb], ['f', picture.full]]) { const { iv, data: sealed } = await sealBytes(held, bytes); const joined = new Uint8Array(12 + sealed.length); joined.set(fromBase64(iv)); joined.set(sealed, 12); await cloud.putPhoto(`${id}-${size}`, toBase64(joined)); }
        await self.save('photos', { id, w: picture.w, h: picture.h, date: picture.date, caption: '', cloud: true }); done++;
      }
      return done;
    },
    async removePhoto(photo) { await self.remove('photos', photo.id); if (photo.cloud) for (const size of ['t', 'f']) await cloud.deletePhoto(`${photo.id}-${size}`); },
    // 再看一眼线上（对方可能刚浇过水）：有变化才通知。小屋开着时每 45 秒、回到这个标签页时各一次。
    async refresh() { if (!held || !cloud.online) return; const before = cloud.version, next = await cloud.pull(); if (next && cloud.version !== before) { data = next; tell(); } },
    // 一张照片：size 't' 小图（墙上、相册格子）/ 'f' 大图。取回密文、解开、给一个只在这个页面里有效的地址。
    photo(id, size = 't') {
      const name = `${id}.${size}`;
      if (!pictures.has(name)) pictures.set(name, (async key => {
        if (!key) return null;
        // 从小屋里加的照片在线上（cloud）；从文件导入的在网站的 memories/p/ 里。
        const online = data?.photos?.find(p => p.id === id)?.cloud;
        const file = online ? fromBase64((await cloud.getPhoto(`${id}-${size}`)) ?? '') : new Uint8Array(await (await fetch(new URL(`./memories/p/${name}.bin`, import.meta.url))).arrayBuffer());
        if (file.length < 13) return null;
        const bytes = await openBytes(key, toBase64(file.subarray(0, 12)), file.subarray(12));     // 文件 = 12 字节 iv + 密文
        return bytes && URL.createObjectURL(new Blob([bytes], { type: 'image/jpeg' }));
      })(held).catch(() => null));
      return pictures.get(name);
    },
  };
  document.addEventListener('visibilitychange', () => { if (!document.hidden) self.refresh(); });
  return self;
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
