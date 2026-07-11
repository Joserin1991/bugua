// 设计令牌（Design Tokens）：颜色规则 / 阴阳规则 / 字体规则
// 所有渲染组件从此取值，不得散落硬编码——换肤 = 换这一个文件

export type WuXingKey = '木' | '火' | '土' | '金' | '水'

export const TOKENS = {
  // 纸墨基色
  paper: '#f0ecdf',
  card: '#f8f5ea',
  ink: '#211d14',
  inkSoft: '#4c463a',
  inkFaint: '#948d7c',
  seal: '#a8382b',       // 朱砂：高亮/印章/凶忌标记
  paperText: '#f4f2ea',  // 深底上的文字

  // 五行色（黑白水墨语境下的低饱和五行）
  wuxing: {
    木: '#4f7359',
    火: '#9c4636',
    土: '#86754d',
    金: '#6d6d68',
    水: '#47657f',
  } as Record<WuXingKey, string>,

  // 阴阳规则：阳=实/浓，阴=虚/淡
  yinyang: {
    阳: { opacity: 1, weight: 600 },
    阴: { opacity: 0.78, weight: 400 },
  },

  // 四化色（紫微）
  mutagen: { 禄: '#4f7359', 权: '#86754d', 科: '#47657f', 忌: '#a8382b' },

  // 字体规则
  font: {
    brush: '"Ma Shan Zheng","STKaiti","KaiTi",cursive', // 大字：干支/卦名/标题
    kai: '"ZCOOL XiaoWei","STKaiti",serif',             // 中字：宫名/术语
    body: '"Noto Serif SC","Songti SC","STSong",serif', // 正文
  },

  // 吉凶量表（评分→颜色/标签）
  luckScale: [
    { min: 4.5, label: '大吉', color: '#4f7359' },
    { min: 3.5, label: '吉', color: '#5c7355' },
    { min: 2.5, label: '平', color: '#8b8779' },
    { min: 1.5, label: '慎', color: '#9c6a36' },
    { min: 0, label: '凶', color: '#a8382b' },
  ],
} as const

export function wuxingColor(wx: string): string {
  return (TOKENS.wuxing as Record<string, string>)[wx] ?? TOKENS.ink
}

export function luckOf(score: number) {
  return TOKENS.luckScale.find((s) => score >= s.min) ?? TOKENS.luckScale[TOKENS.luckScale.length - 1]
}
