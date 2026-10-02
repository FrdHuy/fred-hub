// 黄历 for a day, by rule: the month is set by the Sun (a new month begins at each 节, 立春 = 315°),
// the day's officer (建除十二神) comes from the day's branch against the month's, and each officer has its 宜 / 忌.
// The day's clash (冲) and its evil direction (煞) come from the day's branch.
// Note: printed almanacs weigh many more spirits (神煞); this follows the 建除 lists, the most widely used layer.
import { sunLongitude, dayNumber } from './astro.js?v=49';

const GAN = '甲乙丙丁戊己庚辛壬癸', ZHI = '子丑寅卯辰巳午未申酉戌亥';
const ANIMALS = '鼠牛虎兔龙蛇马羊猴鸡狗猪';
export const OFFICERS = ['建', '除', '满', '平', '定', '执', '破', '危', '成', '收', '开', '闭'];
const RULES = {
  建: { yi: ['出行', '上任', '会友', '上书', '见工'], ji: ['动土', '开仓', '嫁娶', '纳采'] },
  除: { yi: ['除服', '疗病', '出行', '拆卸', '入宅'], ji: ['求官', '上任', '开张', '搬家', '探病'] },
  满: { yi: ['祈福', '祭祀', '结亲', '开市', '交易'], ji: ['服药', '求医', '栽种', '动土', '迁移'] },
  平: { yi: ['祭祀', '修填', '涂泥', '余事勿取'], ji: ['移徙', '入宅', '嫁娶', '开市', '安葬'] },
  定: { yi: ['交易', '立券', '会友', '签约', '纳畜'], ji: ['种植', '置业', '卖出', '搬家', '出行'] },
  执: { yi: ['造屋', '装修', '嫁娶', '收购', '立契'], ji: ['开市', '交易', '搬家', '远行'] },
  破: { yi: ['破土', '拆卸', '求医'], ji: ['嫁娶', '签约', '交易', '出行', '搬迁'] },
  危: { yi: ['祭祀', '祈福', '安床', '拆卸', '破土'], ji: ['登山', '乘船', '出行', '嫁娶', '迁徙'] },
  成: { yi: ['嫁娶', '开市', '修造', '动土', '安床', '交易', '求财', '出行', '立契'], ji: ['诉讼'] },
  收: { yi: ['祈福', '求嗣', '上任', '修造', '纳采', '嫁娶', '入宅'], ji: ['放债', '破土', '安葬'] },
  开: { yi: ['祭祀', '祈福', '入学', '上任', '修造', '开市', '安床', '交易', '出行'], ji: ['放债', '诉讼', '安葬'] },
  闭: { yi: ['祭祀', '祈福', '筑堤', '埋池', '填补', '修屋'], ji: ['开市', '出行', '求医', '手术', '嫁娶'] },
};
// 煞 falls in one direction for each group of three branches: 申子辰 south, 寅午戌 north, 亥卯未 west, 巳酉丑 east.
const SHA = { 子: '南', 辰: '南', 申: '南', 寅: '北', 午: '北', 戌: '北', 亥: '西', 卯: '西', 未: '西', 巳: '东', 酉: '东', 丑: '东' };

const dayIndex = date => (((Math.floor(Date.UTC(date.y, date.m - 1, date.d) / 864e5) - Math.floor(Date.UTC(2000, 0, 7) / 864e5)) % 60) + 60) % 60;
// The month branch: 寅 from 立春 (Sun at 315°), then one branch every 30° of the Sun.
export const monthBranch = date => (2 + Math.floor((((sunLongitude(dayNumber({ ...date, h: 12 })) - 315) % 360 + 360) % 360) / 30)) % 12;

export function almanac(date) {
  const i = dayIndex(date), dz = i % 12, mz = monthBranch(date);
  const officer = OFFICERS[(dz - mz + 12) % 12], rule = RULES[officer];
  return {
    ganzhi: GAN[i % 10] + ZHI[dz], month: ZHI[mz], officer, yi: rule.yi, ji: rule.ji,
    clash: `冲${ANIMALS[(dz + 6) % 12]} 煞${SHA[ZHI[dz]]}`,
  };
}
