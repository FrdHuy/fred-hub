// 线上的小屋：两个人共用的那一份状态（回忆、浇水记录……）。
// 发出去之前在浏览器里用暗号加密，服务器只存密文（见 dist/api/cabin.js）；读写都要带写入凭证。
// 两个人同时改：服务器按版本号拒绝后到的那次，这里拿回最新的一份，把改动重新做一遍再交（最多试 4 次）。
import { sealJSON, openJSON, writeToken } from './vault.js';

export function createCloud() {
  let key = null, token = '', version = 0, state = null, online = false;
  const api = (init = {}) => fetch(new URL('../api/cabin', import.meta.url), { ...init, headers: { authorization: `Bearer ${token}`, 'content-type': 'application/json' }, cache: 'no-store' });
  const open = async data => data ? openJSON(key, JSON.parse(data)) : null;
  return {
    get online() { return online; },                   // false：没有网、接口不在（比如用 scripts/preview.py 预览）或暗号对不上
    get version() { return version; },
    // 拿着钥匙连上线；返回线上的状态（还没有任何内容时是 null）。连不上返回 undefined。
    async connect(nextKey) { key = nextKey; token = await writeToken(key); return this.pull(); },
    async pull() {
      try {
        const response = await api(); if (!response.ok) { online = false; return undefined; }
        const body = await response.json(); online = true;
        if (body.version !== version || !state) { version = body.version; state = await open(body.data); }
        return state;
      } catch { online = false; return undefined; }
    },
    // change(state => 新状态)：mutate 拿到的是一份拷贝，返回改好的那份。成功后返回新状态。
    async change(mutate) {
      for (let attempt = 0; attempt < 4; attempt++) {
        const next = mutate(structuredClone(state)), data = JSON.stringify(await sealJSON(key, next));
        const response = await api({ method: 'PUT', body: JSON.stringify({ version, data }) }), body = await response.json();
        if (response.ok) { version = body.version; state = next; return state; }
        if (response.status !== 409) throw new Error(body.error || `HTTP ${response.status}`);
        version = body.version; state = await open(body.data);              // 对方刚改过：拿最新的再来一次
      }
      throw new Error('小屋太忙了，稍后再试');
    },
    forget() { key = null; token = ''; version = 0; state = null; online = false; },
  };
}
