// 流月流日：流月按五虎遁自流年干起，月界以节气为准；流日逐日干支
import { Solar } from 'lunar-javascript'
import { tenGod } from './wuxing'

export interface LiuYue {
  idx: number          // 0=寅月 … 11=丑月
  ganZhi: string
  god: string          // 月干十神
  label: string        // 如「寅月·立春」
  start: Date
  end: Date
}

export interface LiuRi {
  date: Date
  day: number
  ganZhi: string
  god: string
}

const MONTH_ZHI = ['寅', '卯', '辰', '巳', '午', '未', '申', '酉', '戌', '亥', '子', '丑']
const JIE = ['立春', '惊蛰', '清明', '立夏', '芒种', '小暑', '立秋', '白露', '寒露', '立冬', '大雪', '小寒']
const GAN = ['甲', '乙', '丙', '丁', '戊', '己', '庚', '辛', '壬', '癸']
// 五虎遁：年干 → 正月（寅月）起干
const WUHU: Record<string, string> = { 甲: '丙', 己: '丙', 乙: '戊', 庚: '戊', 丙: '庚', 辛: '庚', 丁: '壬', 壬: '壬', 戊: '甲', 癸: '甲' }

// 某流年的十二流月（year 为公历流年年份，yearGan 为该流年天干）
export function liuYueOf(year: number, yearGan: string, dayGan: string): LiuYue[] {
  // 节气边界：立春(当年) … 小寒(次年)，用 lunar-javascript 节气表
  const table = Solar.fromYmd(year, 6, 1).getLunar().getJieQiTable() as Record<string, { toYmd: () => string; getYear?: () => number }>
  const bound: Date[] = []
  for (let i = 0; i < 12; i++) {
    const jq = table[JIE[i]]
    if (jq) {
      const [y, m, d] = jq.toYmd().split('-').map(Number)
      bound.push(new Date(y, m - 1, d))
    }
  }
  // 次年小寒后的立春作为丑月终点（近似：小寒 + 30 天）
  const startGanIdx = GAN.indexOf(WUHU[yearGan])
  return MONTH_ZHI.map((zhi, i) => {
    const gan = GAN[(startGanIdx + i) % 10]
    const start = bound[i] ?? new Date(year, i + 1, 5)
    const end = bound[i + 1] ?? new Date(start.getFullYear(), start.getMonth() + 1, start.getDate())
    return {
      idx: i,
      ganZhi: gan + zhi,
      god: tenGod(dayGan, gan),
      label: `${zhi}月·${JIE[i]}`,
      start,
      end,
    }
  })
}

// 某流月内的逐日干支（上限 32 天）
export function liuRiOf(month: LiuYue, dayGan: string): LiuRi[] {
  const out: LiuRi[] = []
  const d = new Date(month.start)
  let guard = 0
  while (d < month.end && guard < 32) {
    const lunar = Solar.fromYmd(d.getFullYear(), d.getMonth() + 1, d.getDate()).getLunar()
    const gz = lunar.getDayInGanZhi()
    out.push({ date: new Date(d), day: d.getDate(), ganZhi: gz, god: tenGod(dayGan, gz[0]) })
    d.setDate(d.getDate() + 1)
    guard += 1
  }
  return out
}
