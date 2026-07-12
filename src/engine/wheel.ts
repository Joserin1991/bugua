// 命盘圆盘引擎 · 数据层
// 输入 WheelConfig(JSON) → WheelEngine 组件输出 SVG
// 环序（内→外）：中心太极 → 十二宫 → 十二长生 → 十二地支 → 天干(藏干本气) → 流年 → 大运
import type { BaziChart, LiuNian } from '../lib/bazi'
import { ZHI_LIST, ZHI_WUXING, ZHI_CANGGAN, changSheng } from '../lib/wuxing'
import { wuxingColor } from '../dassets/tokens'

export interface WheelRingItem {
  label: string        // 主文字（可空 = 该宫无内容）
  sub?: string         // 副文字
  color?: string       // 覆盖默认色
  highlight?: boolean  // 朱砂高亮
  marks?: string[]     // 朱砂小印（年/月/日/时）
}

export interface WheelRing {
  id: string
  name: string          // 图例名
  radius: number        // 0..1（相对半径）
  fontScale?: number    // 相对字号（默认 1）
  brush?: boolean       // 用毛笔字体
  tone?: 'strong' | 'mid' | 'faint' // 视觉层级：主环重、辅环淡
  items: WheelRingItem[] // 长度 12，索引 = 地支序（子=0）
}

export interface WheelConfig {
  rotateToZhi?: string   // 使该支转至正上方（红针所指）
  centerLabel?: string   // 中宫下方文字（兼容旧用法）
  center?: { tag: string; main: string; sub?: string } // 盘心三段式：小标 / 干支 / 年份
  rings: WheelRing[]     // 内→外
}

// 星命十二宫（自命宫起逆布）
const GONG12 = ['命宫', '财帛', '兄弟', '田宅', '子女', '奴仆', '夫妻', '疾厄', '迁移', '官禄', '福德', '相貌']

// 八字 → 六环命盘配置
export function baziToWheel(chart: BaziChart, activeLn: LiuNian | null): WheelConfig {
  const now = new Date().getFullYear()
  const nowLn = activeLn?.year ?? now

  // 十二宫：命宫支起逆行
  const mingZhi = chart.mingGong[1] ?? '寅'
  const mingIdx = ZHI_LIST.indexOf(mingZhi)
  const gongItems: WheelRingItem[] = Array(12).fill(null).map(() => ({ label: '' }))
  GONG12.forEach((g, i) => {
    const idx = (mingIdx - i + 144) % 12
    gongItems[idx] = { label: g, highlight: g === '命宫' }
  })

  // 十二长生：日干临十二支
  const csItems = ZHI_LIST.map((zhi) => ({ label: changSheng(chart.dayGan, zhi) }))

  // 地支环：五行着色 + 四柱标记
  const pillarTags = ['年', '月', '日', '时']
  const zhiItems = ZHI_LIST.map((zhi) => {
    const marks = chart.pillars
      .map((p, i) => (p.zhi === zhi ? pillarTags[i] : null))
      .filter((x): x is string => !!x)
    return {
      label: zhi,
      color: wuxingColor(ZHI_WUXING[zhi]),
      highlight: activeLn?.zhi === zhi,
      marks,
    }
  })

  // 天干环：各支藏干本气
  const ganItems = ZHI_LIST.map((zhi) => {
    const g = ZHI_CANGGAN[zhi][0]
    return { label: g }
  })

  // 流年环：以当前流年为锚，向前后铺满 12 支（每支恰一年）
  const nowZhiIdx = (nowLn - 4) % 12 // 甲子=1984, 1984%12=4 → 子
  const lnItems = ZHI_LIST.map((_, idx) => {
    const offset = (idx - nowZhiIdx + 144) % 12
    const year = nowLn + (offset <= 6 ? offset : offset - 12)
    return { label: String(year), highlight: year === nowLn }
  })

  // 大运环：各支上落有哪步大运
  const dyItems: WheelRingItem[] = ZHI_LIST.map((zhi) => {
    const d = chart.daYun.find((dy) => dy.ganZhi[1] === zhi)
    if (!d) return { label: '' }
    const active = nowLn >= d.startYear && nowLn <= d.endYear
    return { label: d.ganZhi, sub: `${d.startAge}岁`, highlight: active }
  })

  return {
    rotateToZhi: activeLn?.zhi ?? chart.pillars[0].zhi,
    center: activeLn
      ? { tag: '流年', main: activeLn.ganZhi, sub: String(activeLn.year) }
      : { tag: '日主', main: `${chart.dayGan}${chart.dayGanWx}` },
    rings: [
      { id: 'gong', name: '十二宫', radius: 0.33, fontScale: 0.9, tone: 'faint', items: gongItems },
      { id: 'changsheng', name: '十二长生', radius: 0.45, fontScale: 0.9, tone: 'faint', items: csItems },
      { id: 'zhi', name: '十二地支', radius: 0.585, fontScale: 1.5, brush: true, tone: 'strong', items: zhiItems },
      { id: 'gan', name: '藏干本气', radius: 0.70, fontScale: 0.95, tone: 'faint', items: ganItems },
      { id: 'liunian', name: '流年', radius: 0.80, fontScale: 0.8, tone: 'mid', items: lnItems },
      { id: 'dayun', name: '大运', radius: 0.905, fontScale: 0.76, tone: 'mid', items: dyItems },
    ],
  }
}
