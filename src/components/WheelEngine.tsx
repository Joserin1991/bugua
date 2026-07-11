// 命盘圆盘引擎 · 渲染层：WheelConfig(JSON) → SVG
// 中心太极不转；环体随 rotateToZhi 旋转，红针固定正上
import { TOKENS } from '../dassets/tokens'
import { ZHI_LIST } from '../lib/wuxing'
import type { WheelConfig, WheelRing } from '../engine/wheel'

const SIZE = 560

function polar(c: number, r: number, deg: number): [number, number] {
  const rad = ((deg - 90) * Math.PI) / 180
  return [c + r * Math.cos(rad), c + r * Math.sin(rad)]
}

export function WheelEngine({ config }: { config: WheelConfig }) {
  const c = SIZE / 2
  const maxR = c - 10
  const targetIdx = config.rotateToZhi ? ZHI_LIST.indexOf(config.rotateToZhi) : 0
  const rotation = -targetIdx * 30
  const outerRingR = Math.max(...config.rings.map((r) => r.radius)) * maxR
  const hubR = Math.min(...config.rings.map((r) => r.radius)) * maxR - 26

  return (
    <div className="destiny-wheel-wrap">
      <span className="pointer" />
      <svg width="100%" viewBox={`0 0 ${SIZE} ${SIZE}`}>
        <defs>
          <filter id="we-rough" x="-10%" y="-10%" width="120%" height="120%">
            <feTurbulence type="fractalNoise" baseFrequency="0.02 0.03" numOctaves="2" seed="11" result="n" />
            <feDisplacementMap in="SourceGraphic" in2="n" scale="5" />
          </filter>
        </defs>

        {/* 外圈禅意墨圈（缓转装饰） */}
        <g className="enso-slow">
          <circle cx={c} cy={c} r={maxR} fill="none" stroke={TOKENS.ink} strokeWidth={SIZE * 0.011}
            opacity="0.75" filter="url(#we-rough)" strokeDasharray={`${maxR * 5.6} ${maxR * 0.7}`} strokeLinecap="round" />
        </g>

        {/* 旋转盘体 */}
        <g className="wheel-rotor" style={{ transform: `rotate(${rotation}deg)` }}>
          <circle cx={c} cy={c} r={outerRingR + 22} fill="rgba(253,253,252,0.92)" stroke={TOKENS.ink} strokeWidth="1.4" />
          {/* 环界线：主环重、辅环淡 */}
          {config.rings.map((ring) => (
            <circle key={ring.id} cx={c} cy={c} r={ring.radius * maxR + (ring.id === 'zhi' ? 20 : 13)}
              fill="none" stroke={TOKENS.ink}
              strokeWidth={ring.tone === 'strong' ? 1.1 : 0.6}
              opacity={ring.tone === 'strong' ? 0.42 : ring.tone === 'mid' ? 0.24 : 0.15} />
          ))}
          {/* 十二分隔线 */}
          {ZHI_LIST.map((_, i) => {
            const [x1, y1] = polar(c, hubR + 4, i * 30 + 15)
            const [x2, y2] = polar(c, outerRingR + 22, i * 30 + 15)
            return <line key={i} x1={x1} y1={y1} x2={x2} y2={y2} stroke={TOKENS.ink} strokeWidth="0.55" opacity="0.16" />
          })}
          {/* 高亮扇区（以地支环 highlight 为准） */}
          {(() => {
            const zhiRing = config.rings.find((r) => r.id === 'zhi')
            const idx = zhiRing?.items.findIndex((it) => it.highlight) ?? -1
            if (idx < 0) return null
            const deg = idx * 30
            const rO = outerRingR + 22
            return (
              <path
                d={`M ${polar(c, hubR + 4, deg - 15).join(' ')} L ${polar(c, rO, deg - 15).join(' ')} A ${rO} ${rO} 0 0 1 ${polar(c, rO, deg + 15).join(' ')} L ${polar(c, hubR + 4, deg + 15).join(' ')} A ${hubR + 4} ${hubR + 4} 0 0 0 ${polar(c, hubR + 4, deg - 15).join(' ')} Z`}
                fill="rgba(168,56,43,0.09)"
              />
            )
          })()}

          {/* 各环内容 */}
          {config.rings.map((ring) => <RingLayer key={ring.id} ring={ring} c={c} maxR={maxR} />)}
        </g>

        {/* 中宫太极（不随盘转） */}
        <circle cx={c} cy={c} r={hubR} fill={TOKENS.card} stroke={TOKENS.ink} strokeWidth="1.4" />
        <circle cx={c} cy={c} r={hubR - 4} fill="none" stroke={TOKENS.seal} strokeWidth="0.8" opacity="0.6" />
        <g opacity="0.92">
          <path d={`M ${c} ${c - hubR * 0.55} A ${hubR * 0.55} ${hubR * 0.55} 0 0 1 ${c} ${c + hubR * 0.55} A ${hubR * 0.275} ${hubR * 0.275} 0 0 1 ${c} ${c} A ${hubR * 0.275} ${hubR * 0.275} 0 0 0 ${c} ${c - hubR * 0.55} Z`} fill={TOKENS.ink} />
          <circle cx={c} cy={c} r={hubR * 0.55} fill="none" stroke={TOKENS.ink} strokeWidth="1.2" />
          <circle cx={c} cy={c - hubR * 0.275} r={hubR * 0.08} fill={TOKENS.card} />
          <circle cx={c} cy={c + hubR * 0.275} r={hubR * 0.08} fill={TOKENS.ink} />
        </g>
        {config.centerLabel && (
          <text x={c} y={c + hubR * 0.78} textAnchor="middle" fontSize={SIZE * 0.024} fill={TOKENS.seal} letterSpacing="2">
            {config.centerLabel}
          </text>
        )}
      </svg>
    </div>
  )
}

function RingLayer({ ring, c, maxR }: { ring: WheelRing; c: number; maxR: number }) {
  const r = ring.radius * maxR
  const fs = SIZE * 0.032 * (ring.fontScale ?? 1)
  const toneColor = ring.tone === 'faint' ? TOKENS.inkFaint : ring.tone === 'mid' ? TOKENS.inkSoft : TOKENS.ink
  return (
    <g>
      {ring.items.map((it, i) => {
        if (!it.label) return null
        const deg = i * 30
        const [x, y] = polar(c, r, deg)
        const fill = it.highlight ? TOKENS.seal : (it.color ?? toneColor)
        return (
          <g key={i} transform={`rotate(${deg} ${x} ${y})`}>
            <text
              x={x} y={it.sub ? y - fs * 0.32 : y}
              textAnchor="middle" dominantBaseline="central"
              fontSize={fs}
              fill={fill}
              fontFamily={ring.brush ? TOKENS.font.brush : TOKENS.font.kai}
              fontWeight={it.highlight ? 600 : 400}
            >
              {it.label}
            </text>
            {it.sub && (
              <text x={x} y={y + fs * 0.72} textAnchor="middle" dominantBaseline="central"
                fontSize={fs * 0.62} fill={TOKENS.inkFaint}>
                {it.sub}
              </text>
            )}
            {it.marks && it.marks.length > 0 && (
              <g>
                {it.marks.map((m, k) => (
                  <g key={m} transform={`translate(${x - ((it.marks!.length - 1) * 7.5) + k * 15} ${y + fs * 1.05})`}>
                    <rect x={-6.5} y={-6.5} width={13} height={13} rx={2} fill={TOKENS.seal} />
                    <text x={0} y={0.5} textAnchor="middle" dominantBaseline="central" fontSize={SIZE * 0.017} fill={TOKENS.paperText}>{m}</text>
                  </g>
                ))}
              </g>
            )}
          </g>
        )
      })}
    </g>
  )
}
