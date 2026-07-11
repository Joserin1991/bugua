// 干支五行基础数据

export type WuXing = '木' | '火' | '土' | '金' | '水'

export const GAN_WUXING: Record<string, WuXing> = {
  甲: '木', 乙: '木',
  丙: '火', 丁: '火',
  戊: '土', 己: '土',
  庚: '金', 辛: '金',
  壬: '水', 癸: '水',
}

export const ZHI_WUXING: Record<string, WuXing> = {
  子: '水', 丑: '土', 寅: '木', 卯: '木',
  辰: '土', 巳: '火', 午: '火', 未: '土',
  申: '金', 酉: '金', 戌: '土', 亥: '水',
}

export const GAN_YINYANG: Record<string, '阳' | '阴'> = {
  甲: '阳', 乙: '阴', 丙: '阳', 丁: '阴', 戊: '阳',
  己: '阴', 庚: '阳', 辛: '阴', 壬: '阳', 癸: '阴',
}

// 地支藏干（本气在前）
export const ZHI_CANGGAN: Record<string, string[]> = {
  子: ['癸'],
  丑: ['己', '癸', '辛'],
  寅: ['甲', '丙', '戊'],
  卯: ['乙'],
  辰: ['戊', '乙', '癸'],
  巳: ['丙', '戊', '庚'],
  午: ['丁', '己'],
  未: ['己', '丁', '乙'],
  申: ['庚', '壬', '戊'],
  酉: ['辛'],
  戌: ['戊', '辛', '丁'],
  亥: ['壬', '甲'],
}

// 五行生克
export const SHENG: Record<WuXing, WuXing> = { 木: '火', 火: '土', 土: '金', 金: '水', 水: '木' }
export const KE: Record<WuXing, WuXing> = { 木: '土', 土: '水', 水: '火', 火: '金', 金: '木' }

export const WUXING_LIST: WuXing[] = ['木', '火', '土', '金', '水']

export const WUXING_COLOR: Record<WuXing, string> = {
  木: 'var(--wood)', 火: 'var(--fire)', 土: 'var(--earth)', 金: 'var(--metal)', 水: 'var(--water)',
}

// 十神：以日主为我
export function tenGod(dayGan: string, other: string): string {
  const me = GAN_WUXING[dayGan]
  const it = GAN_WUXING[other]
  const samePolarity = GAN_YINYANG[dayGan] === GAN_YINYANG[other]
  if (it === me) return samePolarity ? '比肩' : '劫财'
  if (SHENG[me] === it) return samePolarity ? '食神' : '伤官'
  if (KE[me] === it) return samePolarity ? '偏财' : '正财'
  if (KE[it] === me) return samePolarity ? '七杀' : '正官'
  // 生我者
  return samePolarity ? '偏印' : '正印'
}

export function tenGodGroup(god: string): '比劫' | '食伤' | '财' | '官杀' | '印' {
  if (god === '比肩' || god === '劫财') return '比劫'
  if (god === '食神' || god === '伤官') return '食伤'
  if (god === '偏财' || god === '正财') return '财'
  if (god === '七杀' || god === '正官') return '官杀'
  return '印'
}

// 生我者
export function motherOf(wx: WuXing): WuXing {
  return (Object.keys(SHENG) as WuXing[]).find((k) => SHENG[k] === wx)!
}

// 克我者
export function controllerOf(wx: WuXing): WuXing {
  return (Object.keys(KE) as WuXing[]).find((k) => KE[k] === wx)!
}

// 地支六冲 / 六合 / 桃花驿马等神煞用表
export const ZHI_CHONG: Record<string, string> = {
  子: '午', 午: '子', 丑: '未', 未: '丑', 寅: '申', 申: '寅',
  卯: '酉', 酉: '卯', 辰: '戌', 戌: '辰', 巳: '亥', 亥: '巳',
}

export const ZHI_HE: Record<string, string> = {
  子: '丑', 丑: '子', 寅: '亥', 亥: '寅', 卯: '戌', 戌: '卯',
  辰: '酉', 酉: '辰', 巳: '申', 申: '巳', 午: '未', 未: '午',
}

// 天乙贵人（按日干）
export const TIANYI: Record<string, string[]> = {
  甲: ['丑', '未'], 戊: ['丑', '未'], 庚: ['丑', '未'],
  乙: ['子', '申'], 己: ['子', '申'],
  丙: ['亥', '酉'], 丁: ['亥', '酉'],
  壬: ['卯', '巳'], 癸: ['卯', '巳'],
  辛: ['寅', '午'],
}

// 文昌贵人（按日干）
export const WENCHANG: Record<string, string> = {
  甲: '巳', 乙: '午', 丙: '申', 戊: '申', 丁: '酉',
  己: '酉', 庚: '亥', 辛: '子', 壬: '寅', 癸: '卯',
}

// 桃花（按年支或日支三合局）
export function taohua(zhi: string): string {
  if (['申', '子', '辰'].includes(zhi)) return '酉'
  if (['寅', '午', '戌'].includes(zhi)) return '卯'
  if (['巳', '酉', '丑'].includes(zhi)) return '午'
  return '子' // 亥卯未
}

// 驿马（按年支或日支三合局）
export function yima(zhi: string): string {
  if (['申', '子', '辰'].includes(zhi)) return '寅'
  if (['寅', '午', '戌'].includes(zhi)) return '申'
  if (['巳', '酉', '丑'].includes(zhi)) return '亥'
  return '巳' // 亥卯未
}

// 羊刃（按日干）
export const YANGREN: Record<string, string> = {
  甲: '卯', 丙: '午', 戊: '午', 庚: '酉', 壬: '子',
}

export const GAN_LIST = ['甲', '乙', '丙', '丁', '戊', '己', '庚', '辛', '壬', '癸']
export const ZHI_LIST = ['子', '丑', '寅', '卯', '辰', '巳', '午', '未', '申', '酉', '戌', '亥']

// 十二长生
const CHANGSHENG_ORDER = ['长生', '沐浴', '冠带', '临官', '帝旺', '衰', '病', '死', '墓', '绝', '胎', '养']
const CS_START: Record<string, number> = {
  甲: 11, 丙: 2, 戊: 2, 庚: 5, 壬: 8, // 阳干长生：亥 寅 寅 巳 申（顺行）
  乙: 6, 丁: 9, 己: 9, 辛: 0, 癸: 3,  // 阴干长生：午 酉 酉 子 卯（逆行）
}

export function changSheng(gan: string, zhi: string): string {
  const start = CS_START[gan]
  const zi = ZHI_LIST.indexOf(zhi)
  const forward = GAN_YINYANG[gan] === '阳'
  const step = forward ? (zi - start + 12) % 12 : (start - zi + 12) % 12
  return CHANGSHENG_ORDER[step]
}

// 旬空（甲子旬中戌亥空……以柱内干支自查）
export function kongWang(gan: string, zhi: string): string {
  const g = GAN_LIST.indexOf(gan)
  const z = ZHI_LIST.indexOf(zhi)
  return ZHI_LIST[(z - g + 10) % 12] + ZHI_LIST[(z - g + 11) % 12]
}

export const WUXING_TRAITS: Record<WuXing, { nature: string; organ: string; virtue: string; direction: string; season: string }> = {
  木: { nature: '生发、条达', organ: '肝胆', virtue: '仁', direction: '东方', season: '春' },
  火: { nature: '炎上、光明', organ: '心与小肠', virtue: '礼', direction: '南方', season: '夏' },
  土: { nature: '承载、化育', organ: '脾胃', virtue: '信', direction: '中央', season: '四季土月' },
  金: { nature: '肃杀、收敛', organ: '肺与大肠', virtue: '义', direction: '西方', season: '秋' },
  水: { nature: '润下、智流', organ: '肾与膀胱', virtue: '智', direction: '北方', season: '冬' },
}
