// Fred 的磁带。用录音台编辑：node scripts/music-picker.mjs（说明见 docs/磁带-填写.md）。
// 一盒磁带：{ id, title, color: sage | sand | stone | ink, note, a: [曲目], b: [曲目] }
// 一首歌：{ title, artist, audio: "文件名.mp3"（放在 audio/，整首）, preview: 苹果 30 秒试听（没有 audio 时用）, link: Apple Music, seconds }
export default [
  {
    "id": "winter-2024",
    "title": "2024 冬",
    "color": "sage",
    "note": "（占位）",
    "a": [
      {
        "title": "十年",
        "artist": "陳奕迅",
        "preview": "https://audio-ssl.itunes.apple.com/itunes-assets/AudioPreview211/v4/31/d1/7f/31d17fc7-c481-1e6a-0c62-89f144485e51/mzaf_5253302025997676411.plus.aac.p.m4a",
        "link": "https://music.apple.com/tw/album/%E5%8D%81%E5%B9%B4/542922079?i=542922095",
        "seconds": 205
      },
      {
        "title": "遇見",
        "artist": "孫燕姿",
        "preview": "https://audio-ssl.itunes.apple.com/itunes-assets/AudioPreview211/v4/2b/65/a6/2b65a6a5-6838-c77b-9024-dec25dbeb5b1/mzaf_748213282997094732.plus.aac.p.m4a",
        "link": "https://music.apple.com/tw/album/%E9%81%87%E8%A6%8B/578524971?i=578524975",
        "seconds": 210
      },
      {
        "title": "貝加爾湖畔",
        "artist": "李健",
        "preview": "https://audio-ssl.itunes.apple.com/itunes-assets/AudioPreview221/v4/63/51/69/6351691a-50d7-98ab-390c-f83195ffb92d/mzaf_11980348396012436376.plus.aac.p.m4a",
        "link": "https://music.apple.com/tw/album/%E8%B2%9D%E5%8A%A0%E7%88%BE%E6%B9%96%E7%95%94/905188240?i=905188255",
        "seconds": 246
      },
      {
        "title": "紅豆",
        "artist": "王菲",
        "preview": "https://audio-ssl.itunes.apple.com/itunes-assets/AudioPreview221/v4/4d/cb/26/4dcb2622-1524-f937-05de-6baad0412d15/mzaf_8182413927380279026.plus.aac.p.m4a",
        "link": "https://music.apple.com/tw/album/%E7%B4%85%E8%B1%86/965771664?i=965771855",
        "seconds": 256
      }
    ],
    "b": [
      {
        "title": "晴天",
        "artist": "周杰倫",
        "preview": "https://audio-ssl.itunes.apple.com/itunes-assets/AudioPreview221/v4/20/d0/e7/20d0e7db-9c12-795a-d738-2fc3dde4ac9a/mzaf_10317517925583301645.plus.aac.p.m4a",
        "link": "https://music.apple.com/tw/album/%E6%99%B4%E5%A4%A9/535824731?i=535824738",
        "seconds": 270
      },
      {
        "title": "倔強",
        "artist": "五月天",
        "preview": "https://audio-ssl.itunes.apple.com/itunes-assets/AudioPreview221/v4/4b/ba/2d/4bba2d71-e326-b2d7-ff8b-ab62a183fad7/mzaf_10668710428294815005.plus.aac.p.m4a",
        "link": "https://music.apple.com/tw/album/%E5%80%94%E5%BC%B7/183919330?i=183919743",
        "seconds": 262
      },
      {
        "title": "江南",
        "artist": "林俊傑",
        "preview": "https://audio-ssl.itunes.apple.com/itunes-assets/AudioPreview211/v4/0d/0a/1f/0d0a1f64-1faa-01a3-6b82-3f71c7f1ad53/mzaf_6171234305789252058.plus.aac.p.m4a",
        "link": "https://music.apple.com/tw/album/%E6%B1%9F%E5%8D%97/1071753622?i=1071753628",
        "seconds": 268
      }
    ]
  },
  {
    "id": "road",
    "title": "开车的时候",
    "color": "sand",
    "note": "（占位）",
    "a": [
      {
        "title": "Dreams",
        "artist": "Fleetwood Mac",
        "preview": "https://audio-ssl.itunes.apple.com/itunes-assets/AudioPreview211/v4/b6/5a/4b/b65a4b6f-54dd-ee99-0b36-98e27d5b5dd8/mzaf_13813391014293209258.plus.aac.p.m4a",
        "link": "https://music.apple.com/us/album/dreams/202271826?i=202272624",
        "seconds": 254
      },
      {
        "title": "Yellow",
        "artist": "Coldplay",
        "preview": "https://audio-ssl.itunes.apple.com/itunes-assets/AudioPreview221/v4/66/f3/1a/66f31a76-a6ed-cb4c-f353-23310a7ae9a8/mzaf_10593596652344378873.plus.aac.p.m4a",
        "link": "https://music.apple.com/us/album/yellow/1122782080?i=1122782283",
        "seconds": 269
      },
      {
        "title": "Don't Stop Me Now",
        "artist": "Queen",
        "preview": "https://audio-ssl.itunes.apple.com/itunes-assets/AudioPreview221/v4/4b/d2/85/4bd2852c-81a9-1da0-01df-31b77705830c/mzaf_17036269860840746883.plus.aac.p.m4a",
        "link": "https://music.apple.com/us/album/dont-stop-me-now/6781079346?i=6781079518",
        "seconds": 209
      }
    ],
    "b": [
      {
        "title": "Hotel California",
        "artist": "Eagles",
        "preview": "https://audio-ssl.itunes.apple.com/itunes-assets/AudioPreview211/v4/17/30/06/1730066d-13fb-6803-0e52-46d4762b94e0/mzaf_8068080726527063383.plus.aac.p.m4a",
        "link": "https://music.apple.com/us/album/hotel-california/635770200?i=635770202",
        "seconds": 391
      },
      {
        "title": "Wonderwall",
        "artist": "Oasis",
        "preview": "https://audio-ssl.itunes.apple.com/itunes-assets/AudioPreview221/v4/ab/16/93/ab16933c-6203-3db9-9da9-513ff1c8496d/mzaf_16993612140334549994.plus.aac.p.m4a",
        "link": "https://music.apple.com/us/album/wonderwall/1517447039?i=1517447333",
        "seconds": 259
      },
      {
        "title": "The Less I Know The Better",
        "artist": "Mau P",
        "preview": "https://audio-ssl.itunes.apple.com/itunes-assets/AudioPreview211/v4/8b/55/f3/8b55f3a3-3204-8930-f156-82843546950e/mzaf_9370328603131228430.plus.aac.p.m4a",
        "link": "https://music.apple.com/us/album/the-less-i-know-the-better/1792993807?i=1792993808",
        "seconds": 176
      }
    ]
  },
  {
    "id": "late-night",
    "title": "深夜",
    "color": "ink",
    "note": "（占位）",
    "a": [
      {
        "title": "Don't Know Why",
        "artist": "Norah Jones",
        "preview": "https://audio-ssl.itunes.apple.com/itunes-assets/AudioPreview221/v4/a6/5a/a9/a65aa9fe-7eb7-70d4-d1a8-8757db1f0a89/mzaf_3340636523536486480.plus.aac.p.m4a",
        "link": "https://music.apple.com/us/album/dont-know-why/1625058458?i=1625058461",
        "seconds": 186
      },
      {
        "title": "My Funny Valentine (Live)",
        "artist": "Chet Baker Quartet",
        "preview": "https://audio-ssl.itunes.apple.com/itunes-assets/AudioPreview211/v4/a6/e6/36/a6e63629-7624-3950-84ca-b912b4b47f35/mzaf_5349702494972994100.plus.aac.p.m4a",
        "link": "https://music.apple.com/us/album/my-funny-valentine-live/724612154?i=724612228",
        "seconds": 192
      },
      {
        "title": "Merry Christmas Mr. Lawrence",
        "artist": "Ryuichi Sakamoto",
        "preview": "https://audio-ssl.itunes.apple.com/itunes-assets/AudioPreview211/v4/f8/de/a8/f8dea869-bf00-7d99-fee4-2cc99a5a7411/mzaf_3183443058167467043.plus.aac.p.m4a",
        "link": "https://music.apple.com/us/album/merry-christmas-mr-lawrence/1488023157?i=1488023163",
        "seconds": 289
      }
    ],
    "b": [
      {
        "title": "Summer (from \"Kikujiro\")",
        "artist": "Joe Hisaishi",
        "preview": "https://audio-ssl.itunes.apple.com/itunes-assets/AudioPreview211/v4/b4/78/d3/b478d357-cb01-078d-b1ed-f6f279877ebe/mzaf_7274791935371980127.plus.aac.p.m4a",
        "link": "https://music.apple.com/us/album/summer-from-kikujiro/1485854555?i=1485854957",
        "seconds": 245
      },
      {
        "title": "Waltz for Debby",
        "artist": "Bill Evans",
        "preview": "https://audio-ssl.itunes.apple.com/itunes-assets/AudioPreview211/v4/45/15/aa/4515aa93-9f05-59a7-8e27-513cbbd1b625/mzaf_7027401394372577301.plus.aac.p.m4a",
        "link": "https://music.apple.com/us/album/waltz-for-debby/1443195132?i=1443195687",
        "seconds": 78
      },
      {
        "title": "No Surprises",
        "artist": "Radiohead",
        "preview": "https://audio-ssl.itunes.apple.com/itunes-assets/AudioPreview211/v4/f0/2a/fa/f02afaad-0a7f-9ceb-1236-55ef3d388061/mzaf_10063872040766906863.plus.aac.p.m4a",
        "link": "https://music.apple.com/us/album/no-surprises/1097861387?i=1097861842",
        "seconds": 229
      }
    ]
  }
];
