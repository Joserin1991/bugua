// 命盘天衡：十二地支 · 十二消息卦 · 月建圆盘
// 外圈墨圈缓转（禅意），内盘随流年选择转动，红针所指即当前流年地支
import { useMemo } from 'react'
import type { BaziChart } from '../lib/bazi'
import { ZHI_LIST, ZHI_WUXING } from '../lib/wuxing'

// 十二消息卦（对应月建地支）
const XIAOXI_GUA: Record<string, { id: number; name: string }> = {
  子: { id: 24, name: '复' }, 丑: { id: 19, name: '临' }, 寅: { id: 11, name: '泰' },
  卯: { id: 34, name: '大壮' }, 辰: { id: 43, name: '夬' }, 巳: { id: 1, name: '乾' },
  午: { id: 44, name: '姤' }, 未: { id: 33, name: '遁' }, 申: { id: 12, name: '否' },
  酉: { id: 20, name: '观' }, 戌: { id: 23, name: '剥' }, 亥: { id: 2, name: '坤' },
}

const YUEJIAN: Record<string, string> = {
  寅: '正月', 卯: '二月', 辰: '三月', 巳: '四月', 午: '五月', 未: '六月',
  申: '七月', 酉: '八月', 戌: '九月', 亥: '十月', 子: '冬月', 丑: '腊月',
}

const WX_HEX: Record<string, string> = {
  木: '#3e7d4f', 火: '#b3402a', 土: '#8c6a2f', 金: '#6e6a5e', 水: '#2e5e8c',
}

function polar(cx: number, cy: number, r: number, deg: number): [number, number] {
  const rad = ((deg - 90) * Math.PI) / 180
  return [cx + r * Math.cos(rad), cy + r * Math.sin(rad)]
}

export interface DestinyWheelProps {
  chart: BaziChart
  size?: number
  highlightZhi?: string // 指针指向的地支（通常为所选流年支）
  highlightLabel?: string
}

export function DestinyWheel({ chart, size = 460, highlightZhi, highlightLabel }: DestinyWheelProps) {
  const c = size / 2
  const rOuter = c - 8      // 墨圈
  const rZhi = c * 0.80     // 地支圈
  const rGua = c * 0.60     // 消息卦圈
  const rMonth = c * 0.44   // 月建圈
  const rHub = c * 0.30     // 中宫

  // 四柱地支标记
  const pillarMarks = useMemo(() => {
    const map = new Map<string, string[]>()
    const tags = ['年', '月', '日', '时']
    chart.pillars.forEach((p, i) => {
      const arr = map.get(p.zhi) ?? []
      arr.push(tags[i])
      map.set(p.zhi, arr)
    })
    return map
  }, [chart])

  const targetIdx = highlightZhi ? ZHI_LIST.indexOf(highlightZhi) : 0
  const rotation = -targetIdx * 30 // 使目标支转至正上方

  return (
    <div className="destiny-wheel-wrap">
      <span className="pointer" />
      <svg width="100%" viewBox={`0 0 ${size} ${size}`}>
        <defs>
          <filter id="wheelrough" x="-10%" y="-10%" width="120%" height="120%">
            <feTurbulence type="fractalNoise" baseFrequency="0.02 0.03" numOctaves="2" seed="11" result="n" />
            <feDisplacementMap in="SourceGraphic" in2="n" scale="5" />
          </filter>
        </defs>

        {/* 外圈墨圈（禅圈缓转） */}
        <g className="enso-slow">
          <circle cx={c} cy={c} r={rOuter} fill="none" stroke="#1f1c17" strokeWidth={size * 0.012} opacity="0.75" filter="url(#wheelrough)" strokeDasharray={`${rOuter * 5.6} ${rOuter * 0.7}`} strokeLinecap="round" />
          <circle cx={c} cy={c} r={rOuter - 5} fill="none" stroke="#1f1c17" strokeWidth="1" opacity="0.25" filter="url(#wheelrough)" />
        </g>

        {/* 转动盘体 */}
        <g className="wheel-rotor" style={{ transform: `rotate(${rotation}deg)` }}>
          <circle cx={c} cy={c} r={rZhi + c * 0.085} fill="rgba(250,246,236,0.85)" stroke="#1f1c17" strokeWidth="1.4" />
          <circle cx={c} cy={c} r={rGua + c * 0.075} fill="none" stroke="#1f1c17" strokeWidth="0.8" opacity="0.5" />
          <circle cx={c} cy={c} r={rMonth + c * 0.07} fill="none" stroke="#1f1c17" strokeWidth="0.8" opacity="0.5" />

          {/* 十二分隔线 */}
          {ZHI_LIST.map((_, i) => {
            const [x1, y1] = polar(c, c, rHub, i * 30 + 15)
            const [x2, y2] = polar(c, c, rZhi + c * 0.085, i * 30 + 15)
            return <line key={i} x1={x1} y1={y1} x2={x2} y2={y2} stroke="#1f1c17" strokeWidth="0.7" opacity="0.35" />
          })}

          {ZHI_LIST.map((zhi, i) => {
            const deg = i * 30
            const [zx, zy] = polar(c, c, rZhi, deg)
            const [gx, gy] = polar(c, c, rGua, deg)
            const [mx, my] = polar(c, c, rMonth, deg)
            const gua = XIAOXI_GUA[zhi]
            const marks = pillarMarks.get(zhi)
            const isTarget = zhi === highlightZhi
            return (
              <g key={zhi}>
                {isTarget && (
                  <path
                    d={`M ${polar(c, c, rHub, deg - 15).join(' ')} L ${polar(c, c, rZhi + c * 0.085, deg - 15).join(' ')} A ${rZhi + c * 0.085} ${rZhi + c * 0.085} 0 0 1 ${polar(c, c, rZhi + c * 0.085, deg + 15).join(' ')} L ${polar(c, c, rHub, deg + 15).join(' ')} A ${rHub} ${rHub} 0 0 0 ${polar(c, c, rHub, deg - 15).join(' ')} Z`}
                    fill="rgba(176,58,42,0.10)"
                  />
                )}
                {/* 地支 */}
                <text
                  x={zx} y={zy}
                  textAnchor="middle" dominantBaseline="central"
                  fontSize={size * 0.062}
                  fontFamily='"Ma Shan Zheng","STKaiti",serif'
                  fill={isTarget ? '#b03a2a' : WX_HEX[ZHI_WUXING[zhi]]}
                  transform={`rotate(${deg} ${zx} ${zy}) rotate(${-rotation} ${zx} ${zy})`}
                >
                  {zhi}
                </text>
                {/* 四柱标记（朱砂小印） */}
                {marks && (
                  <g transform={`rotate(${deg} ${zx} ${zy})`}>
                    {marks.map((m, k) => (
                      <g key={m} transform={`translate(${zx - ((marks.length - 1) * 7) + k * 14} ${zy + size * 0.052})`}>
                        <rect x={-6.5} y={-6.5} width={13} height={13} rx={2} fill="#a8382b" />
                        <text x={0} y={0.5} textAnchor="middle" dominantBaseline="central" fontSize={size * 0.021} fill="#f3eddd">{m}</text>
                      </g>
                    ))}
                  </g>
                )}
                {/* 消息卦 */}
                <text
                  x={gx} y={gy}
                  textAnchor="middle" dominantBaseline="central"
                  fontSize={size * 0.052}
                  fill="#1f1c17"
                  transform={`rotate(${deg} ${gx} ${gy})`}
                >
                  {String.fromCodePoint(0x4dbf + gua.id)}
                </text>
                <text
                  x={gx} y={gy + size * 0.042}
                  textAnchor="middle" dominantBaseline="central"
                  fontSize={size * 0.023}
                  fill="#40392e"
                  transform={`rotate(${deg} ${gx} ${gy})`}
                >
                  {gua.name}
                </text>
                {/* 月建 */}
                <text
                  x={mx} y={my}
                  textAnchor="middle" dominantBaseline="central"
                  fontSize={size * 0.026}
                  fill="#857b66"
                  transform={`rotate(${deg} ${mx} ${my})`}
                >
                  {YUEJIAN[zhi]}
                </text>
              </g>
            )
          })}
        </g>

        {/* 中宫（不随盘转动） */}
        <circle cx={c} cy={c} r={rHub} fill="#f8f4e9" stroke="#1f1c17" strokeWidth="1.4" />
        <circle cx={c} cy={c} r={rHub - 4} fill="none" stroke="#a8382b" strokeWidth="0.8" opacity="0.6" />
        {/* 小太极 */}
        <g opacity="0.92">
          <circle cx={c} cy={c - rHub * 0.45} r={rHub * 0.3} fill="none" />
          <path d={`M ${c} ${c - rHub * 0.62} A ${rHub * 0.62} ${rHub * 0.62} 0 0 1 ${c} ${c + rHub * 0.62} A ${rHub * 0.31} ${rHub * 0.31} 0 0 1 ${c} ${c} A ${rHub * 0.31} ${rHub * 0.31} 0 0 0 ${c} ${c - rHub * 0.62} Z`} fill="#1f1c17" />
          <circle cx={c} cy={c} r={rHub * 0.62} fill="none" stroke="#1f1c17" strokeWidth="1.2" />
          <circle cx={c} cy={c - rHub * 0.31} r={rHub * 0.09} fill="#f8f4e9" />
          <circle cx={c} cy={c + rHub * 0.31} r={rHub * 0.09} fill="#1f1c17" />
        </g>
        <text x={c} y={c + rHub * 0.82} textAnchor="middle" fontSize={size * 0.026} fill="#a8382b" letterSpacing="2">
          {highlightLabel ?? `日主 ${chart.dayGan}${chart.dayGanWx}`}
        </text>
      </svg>
    </div>
  )
}
