// 神煞引擎：二十余种常用神煞，按柱（干支）定位——对齐专业排盘软件口径
import { TIANYI, WENCHANG, YANGREN, taohua, yima } from './wuxing'

export interface ShenshaCtx {
  dayGan: string
  monthZhi: string
  yearZhi: string
  dayZhi: string
  yearGan?: string // 天乙等贵人年干日干双起
}

const ZHI = ['子', '丑', '寅', '卯', '辰', '巳', '午', '未', '申', '酉', '戌', '亥']

// 禄神（日干临官）
const LU: Record<string, string> = { 甲: '寅', 乙: '卯', 丙: '巳', 丁: '午', 戊: '巳', 己: '午', 庚: '申', 辛: '酉', 壬: '亥', 癸: '子' }
// 天德贵人（按月支，所贵或干或支）
const TIANDE: Record<string, string> = { 寅: '丁', 卯: '申', 辰: '壬', 巳: '辛', 午: '亥', 未: '甲', 申: '癸', 酉: '寅', 戌: '丙', 亥: '乙', 子: '巳', 丑: '庚' }
// 月德贵人（按月支三合，查天干）
function yueDe(monthZhi: string): string {
  if (['寅', '午', '戌'].includes(monthZhi)) return '丙'
  if (['申', '子', '辰'].includes(monthZhi)) return '壬'
  if (['亥', '卯', '未'].includes(monthZhi)) return '甲'
  return '庚'
}
// 三合局系神煞（以年支/日支起）
function sanhe(zhi: string, kind: '华盖' | '将星' | '劫煞' | '亡神' | '灾煞'): string {
  const g = ['申', '子', '辰'].includes(zhi) ? 0 : ['寅', '午', '戌'].includes(zhi) ? 1 : ['巳', '酉', '丑'].includes(zhi) ? 2 : 3
  const table: Record<string, string[]> = {
    华盖: ['辰', '戌', '丑', '未'],
    将星: ['子', '午', '酉', '卯'],
    劫煞: ['巳', '亥', '寅', '申'],
    亡神: ['亥', '巳', '申', '寅'],
    灾煞: ['午', '子', '卯', '酉'],
  }
  return table[kind][g]
}
// 孤辰寡宿（按年支）
function guChenGuaSu(yearZhi: string): { gu: string; gua: string } {
  if (['亥', '子', '丑'].includes(yearZhi)) return { gu: '寅', gua: '戌' }
  if (['寅', '卯', '辰'].includes(yearZhi)) return { gu: '巳', gua: '丑' }
  if (['巳', '午', '未'].includes(yearZhi)) return { gu: '申', gua: '辰' }
  return { gu: '亥', gua: '未' }
}
// 红鸾（按年支）、天喜为其对冲
const HONGLUAN: Record<string, string> = { 子: '卯', 丑: '寅', 寅: '丑', 卯: '子', 辰: '亥', 巳: '戌', 午: '酉', 未: '申', 申: '未', 酉: '午', 戌: '巳', 亥: '辰' }
// 金舆（按日干）
const JINYU: Record<string, string> = { 甲: '辰', 乙: '巳', 丙: '未', 丁: '申', 戊: '未', 己: '申', 庚: '戌', 辛: '亥', 壬: '丑', 癸: '寅' }
// 红艳煞（按日干）
const HONGYAN: Record<string, string> = { 甲: '午', 乙: '申', 丙: '寅', 丁: '未', 戊: '辰', 己: '辰', 庚: '戌', 辛: '酉', 壬: '子', 癸: '申' }

export const SHENSHA_DESC: Record<string, string> = {
  天乙贵人: '至尊之神，逢凶化吉，一生多遇贵人提携',
  天德贵人: '祖荫福德深厚，凶险之处常得暗中回护',
  月德贵人: '心地仁善，处世多得人情善缘',
  文昌贵人: '聪明好学，利科甲文书，气质文雅',
  禄神: '衣禄之神，主俸禄根基，谋生有本',
  羊刃: '刚烈果决，魄力十足，宜制化得宜',
  咸池桃花: '人缘极佳，风姿魅力过人，感情丰富',
  驿马星: '主奔波走动，利外出发展、远行迁移',
  华盖: '孤高好学，近艺术玄学，宜静养心性',
  将星: '统御之才，临事有主见，可掌权柄',
  劫煞: '主争夺耗损，防小人劫财，行事留后手',
  亡神: '心机深沉之星，善谋略，防钻营过度',
  灾煞: '主意外冲击，出行起居宜多加小心',
  孤辰: '性喜独处，六亲缘淡，宜主动亲和',
  寡宿: '情感易生孤寂，婚缘宜多经营',
  红鸾: '正缘桃花之星，主婚喜临门',
  天喜: '喜庆之星，逢之多有添喜之事',
  金舆: '富贵车马之星，主安享、得配偶之助',
  红艳煞: '风流多情之星，魅力外露，须自持',
  天医: '主医药缘分，体质敏而善养，宜习岐黄',
}

// 某一柱（干支）落了哪些神煞
export function shenshaOfPillar(gan: string, zhi: string, ctx: ShenshaCtx): string[] {
  const out: string[] = []
  const { dayGan, monthZhi, yearZhi, dayZhi, yearGan } = ctx
  if ((TIANYI[dayGan] ?? []).includes(zhi) || (yearGan && (TIANYI[yearGan] ?? []).includes(zhi))) out.push('天乙贵人')
  const td = TIANDE[monthZhi]
  if (td && (gan === td || zhi === td)) out.push('天德贵人')
  if (gan === yueDe(monthZhi)) out.push('月德贵人')
  if (WENCHANG[dayGan] === zhi) out.push('文昌贵人')
  if (LU[dayGan] === zhi) out.push('禄神')
  if (YANGREN[dayGan] === zhi) out.push('羊刃')
  if (taohua(yearZhi) === zhi || taohua(dayZhi) === zhi) out.push('咸池桃花')
  if (yima(yearZhi) === zhi || yima(dayZhi) === zhi) out.push('驿马星')
  for (const kind of ['华盖', '将星', '劫煞', '亡神', '灾煞'] as const) {
    if (sanhe(yearZhi, kind) === zhi || sanhe(dayZhi, kind) === zhi) out.push(kind)
  }
  const { gu, gua } = guChenGuaSu(yearZhi)
  if (zhi === gu) out.push('孤辰')
  if (zhi === gua) out.push('寡宿')
  if (HONGLUAN[yearZhi] === zhi) out.push('红鸾')
  if (ZHI[(ZHI.indexOf(HONGLUAN[yearZhi]) + 6) % 12] === zhi) out.push('天喜')
  if (JINYU[dayGan] === zhi) out.push('金舆')
  if (HONGYAN[dayGan] === zhi) out.push('红艳煞')
  if (ZHI[(ZHI.indexOf(monthZhi) + 11) % 12] === zhi) out.push('天医')
  return out
}
