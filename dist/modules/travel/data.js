// Fred 的旅行翻牌屏。⚠ 下面的行程都是占位示例，换成你自己的（填写说明见 docs/旅行行程-填写.md）。
// home：时钟显示哪座城市的本地时间；airport 是默认出发机场。
// arrivals（去过的）：{ to: "REYKJAVIK", code: "KEF", country: "冰岛", date: "2024-10-12", days: 7, with: "小林、阿杰", line: "一句话", photo: "kef-2024.jpg" }
//   to 用英文，最多 12 个字母；date 可以只写到月（"2024-10"）；with / line / photo / from 选填；照片放进 photos/ 文件夹。
// departures（想去的）：{ to: "LISBON", code: "LIS", date: "2027-03", line: "一句话" }，date 不写就是 SOMEDAY。
// 顺序随便写，页面会按日期排好并编航班号。改完运行 node scripts/check-travel.mjs 检查格式。
export default {
  home: { city: "Madison", airport: "MSN", timeZone: "America/Chicago" },
  arrivals: [
    { to: "Kyoto", code: "KIX", country: "日本", date: "2025-04-03", days: 6, with: "独自", line: "（占位）清晨的哲学之道，樱花落了一地。" },
    { to: "Reykjavik", code: "KEF", country: "冰岛", date: "2024-10-12", days: 7, with: "小林、阿杰", line: "（占位）在黑沙滩上等了一整晚，极光最后还是来了。" },
    { to: "New York", code: "JFK", country: "美国", date: "2024-07-02", days: 4, with: "室友", line: "（占位）凌晨两点的时代广场比白天还亮。" },
    { to: "Tokyo", code: "HND", country: "日本", date: "2023-12-20", days: 9, with: "家人", line: "（占位）跨年夜在涩谷十字路口被人群推着走。" },
    { to: "Banff", code: "YYC", country: "加拿大", date: "2023-08-14", days: 5, with: "小林", line: "（占位）梦莲湖的颜色，照片拍不出来。" },
    { to: "Chicago", code: "ORD", country: "美国", date: "2022-11", days: 3, line: "（占位）第一次一个人坐火车出门。" },
    { to: "Shanghai", code: "PVG", country: "中国", date: "2019-08-01", days: 12, with: "爸妈", line: "（占位）出国前的最后一个夏天。" },
  ],
  departures: [
    { to: "Lisbon", code: "LIS", line: "（占位）想在 28 路电车上晃一整个下午。" },
    { to: "Patagonia", code: "FTE", date: "2027-01", line: "（占位）去看冰川崩塌的声音。" },
    { to: "Seoul", code: "ICN", date: "2026-12-18", line: "（占位）冬天吃一顿烤肉。" },
    { to: "Marrakech", code: "RAK" },
  ],
};
