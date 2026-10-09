// The five fortunes for a sign on a day. The stars are computed, not made up: from where the Moon and planets really are
// (astro.js), counted as houses from your sign (whole-sign houses, as newspaper horoscopes do) and scored by traditional rules
// (Venus and the Moon for love, Jupiter and the 2nd house for money, the 10th house for work, the 1st and 6th for health …).
// The words speak about everyday things only — no planets — in plain, direct language (original writing, 2026-09-30).
import { positions, signOf } from './astro.js?v=53';

export const ASPECTS = ['综合', '感情', '财运', '事业', '健康'];
// Houses counted from your sign (1 = your sign).
const houseOf = (lon, sign) => ((signOf(lon) - sign + 12) % 12) + 1;
// The relation of a sign to yours by distance: conjunction, sextile, square, trine, opposition.
const aspect = (lon, sign) => ({ 0: 'conj', 2: 'sextile', 10: 'sextile', 3: 'square', 9: 'square', 4: 'trine', 8: 'trine', 6: 'opposition' })[(signOf(lon) - sign + 12) % 12] ?? null;
const clamp = x => Math.max(1, Math.min(5, Math.round(x)));

export function scores(date, sign) {
  const p = positions({ ...date, h: 12 }), h = Object.fromEntries(Object.entries(p).map(([k, v]) => [k, houseOf(v, sign)])), a = Object.fromEntries(Object.entries(p).map(([k, v]) => [k, aspect(v, sign)]));
  const kind = x => x === 'trine' || x === 'sextile' ? 1 : x === 'square' ? -1 : x === 'opposition' ? -.5 : x === 'conj' ? .5 : 0;
  let love = 3 + kind(a.venus) + kind(a.moon) * .5 + ([5, 7].includes(h.venus) ? 1 : 0) + ([5, 7].includes(h.moon) ? .5 : 0) - (h.mars === 7 ? .5 : 0) - ([5, 7].includes(h.saturn) ? 1 : 0);
  let money = 3 + ([2, 8, 11].includes(h.jupiter) ? 1 : 0) + (h.venus === 2 ? 1 : 0) + ([2, 11].includes(h.moon) ? .5 : 0) - (h.saturn === 2 ? 1 : 0) - ([2, 8].includes(h.mars) ? .5 : 0) + kind(a.jupiter) * .5 + (h.moon === 12 ? -.5 : 0);
  let work = 3 + ([10].includes(h.sun) || h.jupiter === 10 ? 1 : 0) + (h.mars === 10 ? .5 : 0) + ([3, 10].includes(h.mercury) ? .5 : 0) + (h.moon === 10 ? .5 : 0) - (['square', 'opposition'].includes(a.saturn) ? 1 : 0) - (h.mars === 6 ? .5 : 0) + kind(a.sun) * .5;
  let health = 3 + ([1, 6].includes(h.jupiter) ? 1 : 0) - ([1, 6].includes(h.mars) ? 1 : 0) - ([1, 6].includes(h.saturn) ? 1 : 0) - ([6, 12].includes(h.moon) ? .5 : 0) + (a.moon === 'trine' ? .5 : 0) + kind(a.mars) * .5;
  const moodMoon = [1, 5, 9, 10, 11].includes(h.moon) ? 1 : [6, 8, 12].includes(h.moon) ? -1 : 0;
  const overall = 3 + moodMoon + (love + money + work + health - 12) / 4;
  return { stars: [overall, love, money, work, health].map(clamp), moonHouse: h.moon };
}

// Today's focus, from where the Moon is in your houses.
const FOCUS = {
  1: '今天注意力都在自己身上，适合打理形象、做点让自己开心的事。',
  2: '今天绕不开钱：账单、购物车、谁请客，会比平时更在意值不值。',
  3: '消息特别多，回不完的微信和临时的小差事，说话前过一下脑子。',
  4: '心思会往家里跑，想家人，或者想把房间彻底收拾一遍，都顺着来。',
  5: '玩心很重的一天，适合约会、看场电影，做点和工作无关的小创作。',
  6: '琐事扎堆，待办清单比平时长，一件一件划掉会很解压。',
  7: '身边的人很关键，合作的人、另一半、好朋友的一句话都会左右你的心情。',
  8: '情绪容易往深处走，别在深夜做重大决定，也别翻旧账。',
  9: '心想往远处去：想学点新东西、想买一张车票，查查攻略也算。',
  10: '今天会被看见，工作上的表现容易被人记住，好好收尾。',
  11: '朋友运不错，群里的邀约可以答应，说不定会认识有意思的人。',
  12: '适合给自己留白：早点睡、少社交，把能量存起来。',
};
const LEVEL = [
  '整体偏低，别硬扛，今天完成最重要的一件事就算赢。',
  '节奏容易被打乱，留点缓冲时间，别把日程排满。',
  '平平稳稳，按计划走就好。',
  '状态在线，想推进的事可以往前推一步。',
  '顺风的一天，想做的事尽管去做。',
];
// One of three lines for each level (1–5) of each aspect.
const LINES = {
  感情: [
    ['今天少谈感情大事，冷战不如各自冷静。', '敏感度偏高，容易把一句普通的话听成别的意思。', '把期待放低一点，照顾好自己的情绪最重要。'],
    ['容易因为小事较真，话说出口前先停三秒。', '对方情绪可能不太稳，多听，少评判。', '别拿别人的感情来比，你们有自己的节奏。'],
    ['感情平淡，但平淡也是一种安心，不用刻意找话题。', '对方回消息慢一点也别多想，各自有各自的忙。', '适合一起做点日常小事，一起吃顿饭、散个步。'],
    ['相处很顺，一点小惊喜就能让对方开心一整天。', '聊天容易聊到停不下来，适合把之前没说开的事聊清楚。', '暧昧中的可以再往前一步，时机不错。'],
    ['心动指数拉满，想说的话今天说出口，对方大概率接得住。', '单身的容易在朋友局里遇到聊得来的人，有伴的适合安排一次正式约会。', '被偏爱的感觉很明显，也记得回应对方的好。'],
  ],
  财运: [
    ['守财为主，大额支出往后放。', '今天花出去的钱容易后悔，能不花就不花。', '别碰看不懂的投资，稳一点最好。'],
    ['容易冲动消费，购物车先放一晚再说。', '借钱、做担保之类的事今天先别答应。', '留意会员自动续费和各种隐形扣款。'],
    ['进出持平，不亏就是赚。', '日常开销正常，没必要为省小钱花大力气。', '别听别人推荐就跟着买，自己的钱自己看清楚。'],
    ['收入稳，能遇到划算的东西，下单前再比一次价。', '工作上的付出有望换成实际回报。', '适合把闲置的东西卖掉回回血。'],
    ['有进账的迹象，一直在等的那笔钱可能到了。', '谈价钱、谈条件的好日子，敢开口就有机会。', '适合做理财规划，今天你的判断比较准。'],
  ],
  事业: [
    ['阻力偏大，决定慢一点没关系，先别拍板。', '容易被临时的事情打乱计划，留好备用方案。', '低调做事，避免和同事正面冲突。'],
    ['沟通容易出岔子，重要的事用文字再确认一遍。', '别在工作群里情绪化发言，截图会一直在。', '有点提不起劲，给自己定几个小目标，完成一个奖励一下。'],
    ['按部就班的一天，把手头的事做扎实就够了。', '没有大突破也没有大麻烦，适合整理文件、收尾。', '别急着开新坑，先把旧的做完。'],
    ['推进顺利，配合默契，适合把项目往前赶一赶。', '学新东西吸收得快，适合充电。', '开会时的发言会被记住，准备一两个好点子。'],
    ['表现欲强、效率高，重要的汇报和提案放在今天。', '容易得到上司或前辈的赏识，主动争取一下。', '思路很清楚，卡了很久的问题今天可能有突破。'],
  ],
  健康: [
    ['身体在提醒你该休息了，别硬撑。', '留意小磕小碰和换季感冒。', '不适合剧烈运动，拉伸、散步就好。'],
    ['容易累，别熬夜追剧，早点睡比什么都强。', '饮食清淡一点，少冰少辣。', '情绪会影响身体，烦的时候出去走一走。'],
    ['小毛病不断但无大碍，多喝水。', '久坐之后记得起来活动一下肩颈。', '屏幕时间有点长，给眼睛放个假。'],
    ['身体状况稳，保持规律作息就好。', '适合出去走走、晒晒太阳。', '胃口不错，但也别吃太撑。'],
    ['精力充沛，适合运动出汗，越练状态越好。', '睡得好，身体给你的反馈很积极。', '气色好，出门都自带光。'],
  ],
};
const pick = (date, sign, key, n) => { let h = 2166136261; for (const c of `${date.y}${date.m}${date.d}${sign}${key}`) h = Math.imul(h ^ c.charCodeAt(0), 16777619) >>> 0; return h % n; };

export function horoscope(date, sign) {
  const { stars, moonHouse } = scores(date, sign);
  return ASPECTS.map((name, i) => ({
    name, stars: stars[i],
    text: i === 0 ? `${FOCUS[moonHouse]}${LEVEL[stars[0] - 1]}` : LINES[name][stars[i] - 1][pick(date, sign, name, 3)],
  }));
}
