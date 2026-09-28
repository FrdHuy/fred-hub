// Fred 的片单。一部一行，写在最上面的最先放映。
// 快速添加：node scripts/add-movie.mjs 片名 评分
// 手动添加：复制一行改内容。只有 title 必填，其他不写就不显示。
//   type: '电影' 或 '剧集'    rating: 0–5，可写 4.5    poster: posters/ 里的文件名
// 改完运行 node scripts/check-cinema.mjs 检查格式。
export default [
  { title: "流浪地球", type: "电影", year: 2019, director: "郭帆", rating: 3.5, poster: "movie-535167.jpg", tmdb: "movie/535167" },
  { title: "请回答1988", original: "응답하라 1988", type: "剧集", year: 2015, director: "申源浩 / 李祐汀", rating: 5, poster: "tv-64010.jpg", tmdb: "tv/64010" },
  { title: "星际穿越", original: "Interstellar", type: "电影", year: 2014, director: "克里斯托弗·诺兰", rating: 4.5, poster: "movie-157336.jpg", tmdb: "movie/157336" },
  { title: "千与千寻", original: "千と千尋の神隠し", type: "电影", year: 2001, director: "宫崎骏", rating: 4.5, poster: "movie-129.jpg", tmdb: "movie/129" },
  { title: "花样年华", original: "花樣年華", type: "电影", year: 2000, director: "王家卫", rating: 5, poster: "movie-843.jpg", tmdb: "movie/843" },
];
