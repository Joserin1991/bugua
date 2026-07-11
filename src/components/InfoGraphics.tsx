// 图表组件：四柱卡片、五行百分比条、雷达图、十神环绕图、大运折线
import type { BaziChart, DaYunItem } from '../lib/bazi'
import { GAN_WUXING, WUXING_LIST, tenGod, type WuXing } from '../lib/wuxing'

const INK = '#1e1c18'
const SEAL = '#a8382b'

// ---------- 四柱八字卡片 ----------
export function PillarCards({ chart }: { chart: BaziChart }) {
  return (
    <div className="pillar-cards">
      {chart.pillars.map((p) => (
        <div className="pcard" key={p.label}>
          <div className="pc-tag">{p.label}</div>
          <div className="pc-gz">
            <span className={`wx-${p.ganWx}`}>{p.gan}</span><br />
            <span className={`wx-${p.zhiWx}`}>{p.zhi}</span>
          </div>
          <div className="pc-ny">{p.naYin}</div>
        </div>
      ))}
    </div>
  )
}

// ---------- 五行能量分布（百分比条） ----------
export function WuxingPctBars({ chart }: { chart: BaziChart }) {
  const total = WUXING_LIST.reduce((s, w) => s + chart.wuxingCount[w], 0) || 1
  return (
    <div className="wx-pct-rows">
      {WUXING_LIST.map((w) => {
        const pct = Math.round((chart.wuxingCount[w] / total) * 100)
        return (
          <div className={`wx-pct-row ${chart.favorable.includes(w) ? 'fav' : ''}`} key={w}>
            <span className={`label wx-${w}`}>{w}</span>
            <div className="track"><div className="fill" style={{ width: `${pct}%` }} /></div>
            <span className="pct">{pct}%</span>
          </div>
        )
      })}
    </div>
  )
}

// ---------- 通用雷达图（N 维） ----------
export function Radar({
  data, size = 230, max = 100,
}: {
  data: { label: string; value: number }[]
  size?: number
  max?: number
}) {
  const c = size / 2
  const r = c * 0.62
  const n = data.length
  const pt = (i: number, ratio: number): [number, number] => {
    const a = (i * 360 / n - 90) * Math.PI / 180
    return [c + r * ratio * Math.cos(a), c + r * ratio * Math.sin(a)]
  }
  const poly = (ratio: number) => data.map((_, i) => pt(i, ratio).join(',')).join(' ')
  const valuePoly = data.map((d, i) => pt(i, Math.max(0.08, d.value / max)).join(',')).join(' ')
  return (
    <svg width="100%" viewBox={`0 0 ${size} ${size}`} style={{ maxWidth: size, display: 'block', margin: '0 auto' }}>
      {[1, 0.75, 0.5, 0.25].map((ratio) => (
        <polygon key={ratio} points={poly(ratio)} fill="none" stroke={INK} strokeWidth="0.7" opacity={ratio === 1 ? 0.5 : 0.22} />
      ))}
      {data.map((_, i) => {
        const [x, y] = pt(i, 1)
        return <line key={i} x1={c} y1={c} x2={x} y2={y} stroke={INK} strokeWidth="0.6" opacity="0.25" />
      })}
      <polygon points={valuePoly} fill="rgba(30,28,24,0.28)" stroke={INK} strokeWidth="1.6" strokeLinejoin="round" />
      {data.map((d, i) => {
        const [x, y] = pt(i, Math.max(0.08, d.value / max))
        return <circle key={i} cx={x} cy={y} r={3} fill={SEAL} />
      })}
      {data.map((d, i) => {
        const [x, y] = pt(i, 1.28)
        return (
          <text key={i} x={x} y={y} textAnchor="middle" dominantBaseline="central" fontSize={size * 0.052} fill={INK} fontFamily='"ZCOOL XiaoWei",serif'>
            {d.label}{max === 100 ? ` ${Math.round(d.value)}` : ''}
          </text>
        )
      })}
    </svg>
  )
}

export function wuxingRadarData(chart: BaziChart) {
  const maxC = Math.max(...WUXING_LIST.map((w) => chart.wuxingCount[w]), 1)
  return WUXING_LIST.map((w) => ({ label: w, value: (chart.wuxingCount[w] / maxC) * 100 }))
}

// 事业能力五维（由命局推导，确定性）
export function abilityRadarData(chart: BaziChart) {
  const gods: string[] = []
  chart.pillars.forEach((p) => {
    if (p.ganGod !== '日元') gods.push(p.ganGod)
    p.cangGan.forEach((c) => gods.push(c.god))
  })
  const count = (list: string[]) => gods.filter((g) => list.includes(g)).length
  const clamp = (v: number) => Math.max(42, Math.min(96, Math.round(v)))
  return [
    { label: '创造力', value: clamp(48 + count(['食神', '伤官']) * 11) },
    { label: '执行力', value: clamp(46 + count(['七杀', '正官']) * 9 + count(['比肩', '劫财']) * 5) },
    { label: '贵人运', value: clamp(44 + count(['正印', '偏印']) * 9 + (chart.shenSha.some((s) => s.name === '天乙贵人') ? 16 : 0)) },
    { label: '稳定性', value: clamp(40 + count(['正官', '正印', '正财']) * 8) },
    { label: '抗压力', value: clamp(30 + chart.strength.score * 0.55) },
  ]
}

// ---------- 十神环绕图（日主居中） ----------
const TEN_GODS = ['比肩', '劫财', '食神', '伤官', '偏财', '正财', '七杀', '正官', '偏印', '正印']

export function TenGodOrbit({ chart, activeGod }: { chart: BaziChart; activeGod?: string }) {
  const size = 250
  const c = size / 2
  const r = c * 0.66
  // 命局中各十神出现次数（干+藏干）
  const counts = new Map<string, number>()
  chart.pillars.forEach((p) => {
    if (p.ganGod !== '日元') counts.set(p.ganGod, (counts.get(p.ganGod) ?? 0) + 1)
    p.cangGan.forEach((g) => counts.set(g.god, (counts.get(g.god) ?? 0) + 0.5))
  })
  return (
    <svg width="100%" viewBox={`0 0 ${size} ${size}`} style={{ maxWidth: size, display: 'block', margin: '0 auto' }}>
      <circle cx={c} cy={c} r={r} fill="none" stroke={INK} strokeWidth="0.8" opacity="0.3" strokeDasharray="3 4" />
      {/* 日主 */}
      <circle cx={c} cy={c} r={size * 0.13} fill={INK} opacity="0.88" />
      <text x={c} y={c - 6} textAnchor="middle" fontSize={size * 0.062} fill="#f4f2ea" fontFamily='"Ma Shan Zheng",serif'>
        {chart.dayGan}{chart.dayGanWx}
      </text>
      <text x={c} y={c + 13} textAnchor="middle" fontSize={size * 0.04} fill="#d8d4c8">日主</text>
      {TEN_GODS.map((god, i) => {
        const a = (i * 36 - 90) * Math.PI / 180
        const x = c + r * Math.cos(a)
        const y = c + r * Math.sin(a)
        const cnt = counts.get(god) ?? 0
        const present = cnt > 0
        const active = god === activeGod
        return (
          <g key={god}>
            <line x1={c} y1={c} x2={x} y2={y} stroke={INK} strokeWidth="0.5" opacity={present ? 0.3 : 0.1} />
            {active && <circle cx={x} cy={y} r={size * 0.062} fill={SEAL} opacity="0.92" />}
            <text
              x={x} y={y}
              textAnchor="middle" dominantBaseline="central"
              fontSize={size * 0.048}
              fill={active ? '#f4f2ea' : present ? INK : 'rgba(30,28,24,0.3)'}
              fontFamily='"ZCOOL XiaoWei",serif'
            >
              {god}
            </text>
            {present && !active && (
              <circle cx={x + size * 0.052} cy={y - size * 0.035} r={2.2} fill={SEAL} opacity="0.8" />
            )}
          </g>
        )
      })}
    </svg>
  )
}

// ---------- 大运折线（吉/平/凶） ----------
export function dayunScore(d: DaYunItem, chart: BaziChart): number {
  const ganWx = GAN_WUXING[d.ganZhi[0]] as WuXing
  let s = 3
  if (chart.favorable.includes(ganWx)) s += 1
  if (chart.unfavorable.includes(ganWx)) s -= 1
  const zhiGod = tenGod(chart.dayGan, d.ganZhi[0])
  if (['正官', '正印', '正财', '食神'].includes(zhiGod)) s += 0.5
  if (['七杀', '伤官', '劫财'].includes(zhiGod)) s -= 0.5
  return Math.max(1, Math.min(5, s))
}

export function DayunLineChart({ chart, activeIdx, onPick }: { chart: BaziChart; activeIdx: number; onPick?: (i: number) => void }) {
  const W = 340, H = 150
  const padL = 34, padR = 14, padT = 14, padB = 26
  const ds = chart.daYun
  const x = (i: number) => padL + (i / Math.max(1, ds.length - 1)) * (W - padL - padR)
  const y = (score: number) => padT + (1 - (score - 1) / 4) * (H - padT - padB)
  const pts = ds.map((d, i) => `${x(i)},${y(dayunScore(d, chart))}`).join(' ')
  return (
    <svg width="100%" viewBox={`0 0 ${W} ${H}`} style={{ display: 'block' }}>
      {[['吉', 5], ['平', 3], ['凶', 1]].map(([label, v]) => (
        <g key={label as string}>
          <text x={padL - 10} y={y(v as number)} textAnchor="end" dominantBaseline="central" fontSize="10" fill={INK} opacity="0.6">{label}</text>
          <line x1={padL} y1={y(v as number)} x2={W - padR} y2={y(v as number)} stroke={INK} strokeWidth="0.5" opacity="0.18" strokeDasharray="3 3" />
        </g>
      ))}
      <polyline points={pts} fill="none" stroke={INK} strokeWidth="1.6" strokeLinejoin="round" />
      {ds.map((d, i) => (
        <g key={d.ganZhi + d.startYear} style={{ cursor: 'pointer' }} onClick={() => onPick?.(i)}>
          <circle cx={x(i)} cy={y(dayunScore(d, chart))} r={i === activeIdx ? 5 : 3.4} fill={i === activeIdx ? SEAL : '#f7f5ee'} stroke={INK} strokeWidth="1.2" />
          <text x={x(i)} y={H - 8} textAnchor="middle" fontSize="8.5" fill={INK} opacity={i === activeIdx ? 0.95 : 0.55}>
            {d.startYear}
          </text>
        </g>
      ))}
    </svg>
  )
}
