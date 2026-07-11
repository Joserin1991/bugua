// 八字排盘引擎 —— 基于 lunar-javascript 的精确历法计算
import { Solar, Lunar } from 'lunar-javascript'
import {
  GAN_WUXING, ZHI_WUXING, ZHI_CANGGAN, tenGod, type WuXing,
  TIANYI, WENCHANG, taohua, yima, YANGREN, ZHI_CHONG, ZHI_HE,
} from './wuxing'

export interface Pillar {
  label: '年柱' | '月柱' | '日柱' | '时柱'
  gan: string
  zhi: string
  ganWx: WuXing
  zhiWx: WuXing
  ganGod: string // 天干十神（日主标注为「日元」）
  cangGan: { gan: string; god: string; wx: WuXing }[]
  naYin: string
}

export interface DaYunItem {
  ganZhi: string
  startYear: number
  endYear: number
  startAge: number
  god: string
}

export interface ShenSha {
  name: string
  where: string
  desc: string
}

export interface BaziChart {
  gender: '男' | '女'
  solarText: string
  lunarText: string
  jieQi: string
  pillars: Pillar[]
  dayGan: string
  dayGanWx: WuXing
  wuxingCount: Record<WuXing, number>
  strength: { score: number; level: '身强' | '偏强' | '中和' | '偏弱' | '身弱'; detail: string }
  favorable: WuXing[]  // 喜用神
  unfavorable: WuXing[] // 忌神
  daYun: DaYunItem[]
  qiYunText: string
  shenSha: ShenSha[]
  mingGong: string
  taiYuan: string
  animal: string
  xingZuo: string
}

const SEASON_WANG: Record<string, WuXing> = {
  寅: '木', 卯: '木', 辰: '土',
  巳: '火', 午: '火', 未: '土',
  申: '金', 酉: '金', 戌: '土',
  亥: '水', 子: '水', 丑: '土',
}

// 月令相（当令所生者）
const SEASON_XIANG: Record<WuXing, WuXing> = { 木: '火', 火: '土', 土: '金', 金: '水', 水: '木' }

export function computeBazi(
  year: number, month: number, day: number,
  hour: number, minute: number, gender: '男' | '女',
): BaziChart {
  const solar = Solar.fromYmdHms(year, month, day, hour, minute, 0)
  const lunar = solar.getLunar()
  const ec = lunar.getEightChar()
  ec.setSect(2)

  const dayGan = ec.getDayGan()
  const dayGanWx = GAN_WUXING[dayGan]

  const rawPillars: [Pillar['label'], string, string, string][] = [
    ['年柱', ec.getYearGan(), ec.getYearZhi(), ec.getYearNaYin()],
    ['月柱', ec.getMonthGan(), ec.getMonthZhi(), ec.getMonthNaYin()],
    ['日柱', ec.getDayGan(), ec.getDayZhi(), ec.getDayNaYin()],
    ['时柱', ec.getTimeGan(), ec.getTimeZhi(), ec.getTimeNaYin()],
  ]

  const pillars: Pillar[] = rawPillars.map(([label, gan, zhi, naYin]) => ({
    label,
    gan,
    zhi,
    ganWx: GAN_WUXING[gan],
    zhiWx: ZHI_WUXING[zhi],
    ganGod: label === '日柱' ? '日元' : tenGod(dayGan, gan),
    cangGan: ZHI_CANGGAN[zhi].map((g) => ({ gan: g, god: tenGod(dayGan, g), wx: GAN_WUXING[g] })),
    naYin,
  }))

  // 五行统计（天干 1 分，支藏本气 1 分、余气 0.5 分，按个数展示时取整权重）
  const wuxingCount: Record<WuXing, number> = { 木: 0, 火: 0, 土: 0, 金: 0, 水: 0 }
  for (const p of pillars) {
    wuxingCount[p.ganWx] += 1
    p.cangGan.forEach((c, i) => {
      wuxingCount[c.wx] += i === 0 ? 1 : 0.5
    })
  }

  // 日主强弱：得令 / 得地 / 得势 综合打分
  const monthZhi = ec.getMonthZhi()
  let score = 0
  const details: string[] = []
  const wang = SEASON_WANG[monthZhi]
  if (wang === dayGanWx) {
    score += 40
    details.push(`日主${dayGan}${dayGanWx}生于${monthZhi}月，当令而旺（得令）`)
  } else if (SEASON_XIANG[wang] === dayGanWx) {
    score += 20
    details.push(`日主${dayGanWx}生于${monthZhi}月，月令${wang}相生之地（得生）`)
  } else {
    details.push(`日主${dayGanWx}生于${monthZhi}月，不得月令之气`)
  }
  // 得地：地支藏干中比劫与印的力量
  let rootScore = 0
  for (const p of pillars) {
    p.cangGan.forEach((c, i) => {
      const w = i === 0 ? 10 : 5
      if (c.wx === dayGanWx) rootScore += w
      else if (c.god === '正印' || c.god === '偏印') rootScore += w * 0.7
    })
  }
  score += Math.min(rootScore, 35)
  if (rootScore >= 20) details.push('地支通根有力，印比扶身（得地）')
  else if (rootScore >= 10) details.push('地支略有根气')
  else details.push('地支无根，日主虚浮')
  // 得势：天干比劫印星
  let helpers = 0
  for (const p of pillars) {
    if (p.label === '日柱') continue
    const g = p.ganGod
    if (['比肩', '劫财', '正印', '偏印'].includes(g)) helpers += 1
  }
  score += helpers * 8
  if (helpers >= 2) details.push('天干印比成势，同气相助（得势）')

  let level: BaziChart['strength']['level']
  if (score >= 65) level = '身强'
  else if (score >= 50) level = '偏强'
  else if (score >= 38) level = '中和'
  else if (score >= 25) level = '偏弱'
  else level = '身弱'

  // 喜用神推断（扶抑法）
  const shengWo = (Object.keys(GAN_WUXING) as string[])
  void shengWo
  const wxList: WuXing[] = ['木', '火', '土', '金', '水']
  const shengMap: Record<WuXing, WuXing> = { 木: '火', 火: '土', 土: '金', 金: '水', 水: '木' }
  const keMap: Record<WuXing, WuXing> = { 木: '土', 土: '水', 水: '火', 火: '金', 金: '木' }
  const mother = wxList.find((w) => shengMap[w] === dayGanWx)!  // 生我者：印
  const child = shengMap[dayGanWx]   // 我生者：食伤
  const wealth = keMap[dayGanWx]     // 我克者：财
  const officer = wxList.find((w) => keMap[w] === dayGanWx)!    // 克我者：官杀

  let favorable: WuXing[]
  let unfavorable: WuXing[]
  if (level === '身强' || level === '偏强') {
    favorable = [child, wealth, officer]
    unfavorable = [dayGanWx, mother]
  } else if (level === '身弱' || level === '偏弱') {
    favorable = [mother, dayGanWx]
    unfavorable = [officer, child, wealth]
  } else {
    // 中和以流通为美，取最弱两行补之
    const sorted = wxList.slice().sort((a, b) => wuxingCount[a] - wuxingCount[b])
    favorable = sorted.slice(0, 2)
    unfavorable = [sorted[4]]
  }

  // 大运
  const yun = ec.getYun(gender === '男' ? 1 : 0)
  const daYunArr = yun.getDaYun()
  const daYun: DaYunItem[] = daYunArr.slice(1, 9).map((d: any) => ({
    ganZhi: d.getGanZhi(),
    startYear: d.getStartYear(),
    endYear: d.getEndYear(),
    startAge: d.getStartAge(),
    god: tenGod(dayGan, d.getGanZhi()[0]),
  }))
  const qiYunText = `出生后${yun.getStartYear()}年${yun.getStartMonth()}个月${yun.getStartDay()}天起运，${gender === '男' ? '阳' : '阴'}命${yun.isForward() ? '顺' : '逆'}排`

  // 神煞
  const shenSha: ShenSha[] = []
  const allZhi = pillars.map((p) => p.zhi)
  const yearZhi = ec.getYearZhi()
  const dayZhi = ec.getDayZhi()
  const tianyiTargets = TIANYI[dayGan] ?? []
  allZhi.forEach((z, i) => {
    if (tianyiTargets.includes(z)) {
      shenSha.push({ name: '天乙贵人', where: pillars[i].label, desc: '至尊之神，逢凶化吉，一生多遇贵人提携' })
    }
  })
  if (allZhi.includes(WENCHANG[dayGan])) {
    const i = allZhi.indexOf(WENCHANG[dayGan])
    shenSha.push({ name: '文昌贵人', where: pillars[i].label, desc: '聪明好学，利科甲文书，气质文雅' })
  }
  const th = taohua(yearZhi); const th2 = taohua(dayZhi)
  allZhi.forEach((z, i) => {
    if (z === th || z === th2) {
      if (!shenSha.some((s) => s.name === '咸池桃花' && s.where === pillars[i].label)) {
        shenSha.push({ name: '咸池桃花', where: pillars[i].label, desc: '人缘极佳，风姿魅力过人，感情丰富' })
      }
    }
  })
  const ym = yima(yearZhi); const ym2 = yima(dayZhi)
  allZhi.forEach((z, i) => {
    if (z === ym || z === ym2) {
      if (!shenSha.some((s) => s.name === '驿马星' && s.where === pillars[i].label)) {
        shenSha.push({ name: '驿马星', where: pillars[i].label, desc: '主奔波走动，利外出发展、远行迁移' })
      }
    }
  })
  if (YANGREN[dayGan] && allZhi.includes(YANGREN[dayGan])) {
    const i = allZhi.indexOf(YANGREN[dayGan])
    shenSha.push({ name: '羊刃', where: pillars[i].label, desc: '刚烈果决，魄力十足，宜制化得宜' })
  }
  // 地支冲合提示
  for (let i = 0; i < allZhi.length; i++) {
    for (let j = i + 1; j < allZhi.length; j++) {
      if (ZHI_CHONG[allZhi[i]] === allZhi[j]) {
        shenSha.push({ name: `${allZhi[i]}${allZhi[j]}相冲`, where: `${pillars[i].label.slice(0, 1)}${pillars[j].label.slice(0, 1)}之间`, desc: '主变动、冲击，逢之宜静不宜躁' })
      }
      if (ZHI_HE[allZhi[i]] === allZhi[j]) {
        shenSha.push({ name: `${allZhi[i]}${allZhi[j]}六合`, where: `${pillars[i].label.slice(0, 1)}${pillars[j].label.slice(0, 1)}之间`, desc: '主和合、缘分，人际融洽有助力' })
      }
    }
  }

  const roundedCount: Record<WuXing, number> = { ...wuxingCount }
  wxList.forEach((w) => { roundedCount[w] = Math.round(wuxingCount[w] * 10) / 10 })

  return {
    gender,
    solarText: `${solar.toYmdHms().slice(0, 16)}`,
    lunarText: `${lunar.getYearInChinese()}年${lunar.getMonthInChinese()}月${lunar.getDayInChinese()} ${lunar.getTimeZhi()}时`,
    jieQi: lunar.getPrevJieQi(true).getName(),
    pillars,
    dayGan,
    dayGanWx,
    wuxingCount: roundedCount,
    strength: { score: Math.round(score), level, detail: details.join('；') },
    favorable,
    unfavorable,
    daYun,
    qiYunText,
    shenSha,
    mingGong: ec.getMingGong(),
    taiYuan: ec.getTaiYuan(),
    animal: lunar.getYearShengXiao(),
    xingZuo: solar.getXingZuo() + '座',
  }
}

// 流年干支与十神
export interface LiuNian {
  year: number
  ganZhi: string
  god: string
  zhi: string
}

export function liuNianOf(year: number, dayGan: string): LiuNian {
  const lunar = Lunar.fromYmd(year, 6, 1)
  const gz = lunar.getYearInGanZhiExact ? lunar.getYearInGanZhi() : lunar.getYearInGanZhi()
  return { year, ganZhi: gz, god: tenGod(dayGan, gz[0]), zhi: gz[1] }
}

export function liuNianRange(startYear: number, count: number, dayGan: string): LiuNian[] {
  return Array.from({ length: count }, (_, i) => liuNianOf(startYear + i, dayGan))
}
