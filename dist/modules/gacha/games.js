// 真心话大冒险 and the easter eggs. The question bank is Fred's to write (one per line, 「真：」or「冒：」); these are 示意.
export const BANK = `
真：（示意）你手机相册里最近一张截图是什么？
真：（示意）最近一次哭是因为什么？
真：（示意）在座的人里，你第一印象最差的是谁？
真：（示意）你做过最后悔的一件小事是什么？
真：（示意）如果今晚必须删掉一个 App，你删哪个？
真：（示意）你最近一次说谎是什么时候？
真：（示意）你最怕别人知道你的哪个习惯？
真：（示意）说出一件你至今没告诉父母的事。
真：（示意）你最近在单曲循环哪首歌？为什么？
真：（示意）你偷偷羡慕在座的谁？羡慕什么？
真：（示意）你手机里备注最奇怪的联系人是谁？
真：（示意）你上一次心动是什么时候？
冒：（示意）学一种动物叫，直到有人猜出来。
冒：（示意）用对方的手机给通讯录第三个人发一句「在吗」。
冒：（示意）用家乡话念一段你最近的聊天记录。
冒：（示意）给在座每个人起一个外号，当场宣布。
冒：（示意）模仿在座的一个人，让大家猜是谁。
冒：（示意）打开相册，随机翻到的第 20 张照片给大家看。
冒：（示意）用三种不同的语气说「我好想你」。
冒：（示意）闭上眼睛画一张自画像。
冒：（示意）唱一首歌的副歌，只能用「啦」。
冒：（示意）让左边的人在你的头像上改一个字。
冒：（示意）做 10 个深蹲，每做一个说一句夸自己的话。
冒：（示意）给你最近联系的人发一个 🙂，不许解释。
`;
// The easter eggs' contents (Fred's special things, later). The lamp egg has its own.
export const SPECIAL = { title: '彩蛋', text: '（占位）这里是 Fred 的特别内容。' };
export const VARIETY_NOTE = { title: '彩蛋', text: '（占位）扭到了一颗不一样的蛋。' };

export function parseBank(text) {
  return text.split('\n').map(line => line.trim()).map(line => { const m = line.match(/^(真|冒)[：:]\s*(.+)$/); return m ? { kind: m[1] === '真' ? 'truth' : 'dare', text: m[2] } : null; }).filter(Boolean).map((q, i) => ({ ...q, no: i + 1 }));
}
// Draw without repeats until the bank is used up, then shuffle again ("同一场不重复").
export function createDeck(questions, rnd = Math.random) {
  let order = [];
  return () => {
    if (!order.length) { order = questions.map((_, i) => i); for (let i = order.length - 1; i > 0; i--) { const j = Math.floor(rnd() * (i + 1)); [order[i], order[j]] = [order[j], order[i]]; } }
    return questions[order.pop()];
  };
}
