// Usage: node scripts/seal-couple.mjs
// Seals what belongs to the two of them — notes/couple-bank.txt (questions) and notes/couple-letter.txt (the letter) —
// into dist/modules/gacha/couple.js, with the secret sequence as the key. Neither file is ever deployed:
// the site only carries ciphertext, and the sequence itself is not written anywhere in dist/.
import { readFileSync, writeFileSync, existsSync } from 'node:fs';
import { seal, unseal } from '../dist/modules/stories/seal.js';
import { parseBank } from '../dist/modules/gacha/games.js';

const source = readFileSync(new URL('../notes/couple-bank.txt', import.meta.url), 'utf8');
const key = source.match(/暗号[^：:]*[：:]\s*([udlr]{4,})/i)?.[1]?.toLowerCase();
if (!key) { console.error('✗ notes/couple-bank.txt 里没有找到暗号（一行：# 暗号……：uuddlrlr）'); process.exit(1); }
const questions = parseBank(source);
if (!questions.length) { console.error('✗ 没有题目（一行一题，「真：」或「冒：」开头）'); process.exit(1); }

// The letter: 标题 / 落款 / 日期 lines, then paragraphs separated by blank lines.
export function parseLetter(text) {
  const lines = text.split('\n').filter(line => !line.startsWith('#'));
  const field = name => { const i = lines.findIndex(line => line.startsWith(`${name}：`) || line.startsWith(`${name}:`)); return i < 0 ? '' : lines.splice(i, 1)[0].slice(name.length + 1).trim(); };
  const title = field('标题') || '写给你', sign = field('落款'), date = field('日期');
  const paragraphs = lines.join('\n').split(/\n\s*\n/).map(p => p.trim().replace(/\n/g, '')).filter(Boolean);
  return paragraphs.length ? { title, sign, date: /^\d{4}-\d{2}-\d{2}$/.test(date) ? date : '', paragraphs } : null;
}
const letterFile = new URL('../notes/couple-letter.txt', import.meta.url);
const letter = existsSync(letterFile) ? parseLetter(readFileSync(letterFile, 'utf8')) : null;

const payload = { questions: questions.map(({ kind, text }) => ({ kind, text })), letter };
const sealed = await seal(payload, key);
if (!(await unseal(sealed, key))) throw new Error('seal round trip failed');
writeFileSync(new URL('../dist/modules/gacha/couple.js', import.meta.url), `// Sealed (AES-GCM). Sources: notes/couple-bank.txt, notes/couple-letter.txt; run node scripts/seal-couple.mjs after editing them.\nexport default ${JSON.stringify(sealed)};\n`);
console.log(`✓ 已加密 ${questions.length} 道题（真心话 ${questions.filter(q => q.kind === 'truth').length} · 大冒险 ${questions.filter(q => q.kind === 'dare').length}）${letter ? `，以及一封信（${letter.paragraphs.length} 段，${letter.paragraphs.join('').length} 字）` : '，没有信'}。暗号 ${key.length} 步。`);
