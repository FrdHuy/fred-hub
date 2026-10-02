// Usage: node scripts/seal-couple.mjs
// Seals notes/couple-bank.txt (never deployed) into dist/modules/gacha/couple.js with the secret sequence as the key:
// the site only carries ciphertext, and the sequence itself is not written anywhere in dist/.
import { readFileSync, writeFileSync } from 'node:fs';
import { seal, unseal } from '../dist/modules/stories/seal.js';
import { parseBank } from '../dist/modules/gacha/games.js';

const source = readFileSync(new URL('../notes/couple-bank.txt', import.meta.url), 'utf8');
const key = source.match(/暗号[^：:]*[：:]\s*([udlr]{4,})/i)?.[1]?.toLowerCase();
if (!key) { console.error('✗ notes/couple-bank.txt 里没有找到暗号（一行：# 暗号……：uuddlrlr）'); process.exit(1); }
const questions = parseBank(source);
if (!questions.length) { console.error('✗ 没有题目（一行一题，「真：」或「冒：」开头）'); process.exit(1); }
const sealed = await seal(questions.map(({ kind, text }) => ({ kind, text })), key);
if (!(await unseal(sealed, key))) throw new Error('seal round trip failed');
writeFileSync(new URL('../dist/modules/gacha/couple.js', import.meta.url), `// Sealed (AES-GCM). The source is notes/couple-bank.txt; run node scripts/seal-couple.mjs after editing it.\nexport default ${JSON.stringify(sealed)};\n`);
console.log(`✓ 已加密 ${questions.length} 道题（真心话 ${questions.filter(q => q.kind === 'truth').length} · 大冒险 ${questions.filter(q => q.kind === 'dare').length}），暗号 ${key.length} 步。`);
