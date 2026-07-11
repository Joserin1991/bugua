// 紫微斗数排盘 —— 基于 iztro 安星
import { astro } from 'iztro'

export interface ZwStar {
  name: string
  brightness?: string
  mutagen?: string // 禄 权 科 忌
}

export interface ZwPalace {
  name: string           // 宫名（命宫/兄弟/夫妻…）
  isBodyPalace: boolean  // 身宫
  gan: string
  zhi: string
  majorStars: ZwStar[]
  minorStars: ZwStar[]
  adjectiveStars: string[]
  changsheng: string     // 长生十二神
  boshi: string          // 博士十二神
  decadal: [number, number] // 大限起讫（虚岁）
}

export interface ZwChart {
  solarDate: string
  lunarDate: string
  chineseDate: string
  fiveElementsClass: string // 五行局
  soul: string  // 命主
  body: string  // 身主
  zodiac: string
  sign: string
  palaces: ZwPalace[] // 按地支索引可查
  soulZhi: string
  bodyZhi: string
}

// 时辰(时支起点小时) → iztro timeIndex（0 早子 … 12 晚子）
export function hourToTimeIndex(hour: number): number {
  if (hour >= 23) return 12
  return Math.floor((hour + 1) / 2)
}

export function computeZiwei(
  year: number, month: number, day: number, hour: number, gender: '男' | '女',
): ZwChart {
  const a = astro.bySolar(`${year}-${month}-${day}`, hourToTimeIndex(hour), gender, true, 'zh-CN')
  const palaces: ZwPalace[] = a.palaces.map((p: any) => ({
    name: p.name,
    isBodyPalace: p.isBodyPalace,
    gan: p.heavenlyStem,
    zhi: p.earthlyBranch,
    majorStars: p.majorStars.map((s: any) => ({ name: s.name, brightness: s.brightness || '', mutagen: s.mutagen || '' })),
    minorStars: p.minorStars.map((s: any) => ({ name: s.name, brightness: s.brightness || '', mutagen: s.mutagen || '' })),
    adjectiveStars: p.adjectiveStars.map((s: any) => s.name),
    changsheng: p.changsheng12,
    boshi: p.boshi12,
    decadal: [p.decadal.range[0], p.decadal.range[1]],
  }))
  return {
    solarDate: a.solarDate,
    lunarDate: a.lunarDate,
    chineseDate: a.chineseDate,
    fiveElementsClass: a.fiveElementsClass,
    soul: a.soul,
    body: a.body,
    zodiac: a.zodiac,
    sign: a.sign,
    palaces,
    soulZhi: a.earthlyBranchOfSoulPalace,
    bodyZhi: a.earthlyBranchOfBodyPalace,
  }
}
