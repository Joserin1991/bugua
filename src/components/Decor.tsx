// 背景装饰：星空、八卦轮、太极、云纹
import { useMemo } from 'react'
import { TRIGRAM_LINES } from '../data/hexagrams'

export function StarField() {
  const stars = useMemo(
    () =>
      Array.from({ length: 90 }, (_, i) => ({
        cx: (i * 733) % 100,
        cy: (i * 397) % 100,
        r: 0.4 + ((i * 13) % 10) / 12,
        d: 2 + ((i * 7) % 50) / 10,
      })),
    [],
  )
  return (
    <svg className="starfield" width="100%" height="100%" preserveAspectRatio="none">
      {stars.map((s, i) => (
        <circle key={i} cx={`${s.cx}%`} cy={`${s.cy}%`} r={s.r} fill="#e8e4f5">
          <animate attributeName="opacity" values="0.1;0.9;0.1" dur={`${s.d}s`} repeatCount="indefinite" />
        </circle>
      ))}
    </svg>
  )
}

const TRIGRAM_ORDER = ['乾', '兑', '离', '震', '巽', '坎', '艮', '坤'] // 先天八卦序

export function BaguaWheel({ size = 520, className = '' }: { size?: number; className?: string }) {
  const c = size / 2
  const rOuter = c - 10
  const rings = [0, 1, 2] // 三爻，自内而外
  return (
    <svg className={className} width={size} height={size} viewBox={`0 0 ${size} ${size}`}>
      <circle cx={c} cy={c} r={rOuter} fill="none" stroke="#d4af37" strokeWidth="1.5" />
      <circle cx={c} cy={c} r={rOuter - 66} fill="none" stroke="#d4af37" strokeWidth="0.8" />
      {TRIGRAM_ORDER.map((name, k) => {
        const lines = TRIGRAM_LINES[name]
        return (
          <g key={name} transform={`rotate(${k * 45} ${c} ${c})`}>
            {rings.map((ri) => {
              const y = 24 + ri * 13
              const w = 44
              const yang = lines[2 - ri] === 1
              return yang ? (
                <rect key={ri} x={c - w / 2} y={y} width={w} height={7} fill="#d4af37" rx={1.5} />
              ) : (
                <g key={ri}>
                  <rect x={c - w / 2} y={y} width={w * 0.42} height={7} fill="#d4af37" rx={1.5} />
                  <rect x={c + w / 2 - w * 0.42} y={y} width={w * 0.42} height={7} fill="#d4af37" rx={1.5} />
                </g>
              )
            })}
            <text x={c} y={92} textAnchor="middle" fill="#d4af37" fontSize="15" fontFamily="serif">
              {name}
            </text>
          </g>
        )
      })}
      <Taiji cx={c} cy={c} r={54} />
    </svg>
  )
}

export function Taiji({ cx, cy, r, spin = false }: { cx: number; cy: number; r: number; spin?: boolean }) {
  return (
    <g className={spin ? 'taiji-spin' : undefined} style={spin ? { transformOrigin: `${cx}px ${cy}px` } : undefined}>
      <circle cx={cx} cy={cy} r={r} fill="#0d0b1e" stroke="#d4af37" strokeWidth="1.5" />
      <path
        d={`M ${cx} ${cy - r} A ${r} ${r} 0 0 1 ${cx} ${cy + r} A ${r / 2} ${r / 2} 0 0 1 ${cx} ${cy} A ${r / 2} ${r / 2} 0 0 0 ${cx} ${cy - r} Z`}
        fill="#d4af37"
      />
      <circle cx={cx} cy={cy - r / 2} r={r / 7} fill="#0d0b1e" />
      <circle cx={cx} cy={cy + r / 2} r={r / 7} fill="#d4af37" />
    </g>
  )
}

export function TaijiSpinner({ size = 72 }: { size?: number }) {
  const c = size / 2
  return (
    <svg width={size} height={size} viewBox={`0 0 ${size} ${size}`} className="taiji-spin">
      <Taiji cx={c} cy={c} r={c - 3} />
    </svg>
  )
}

export function CloudDivider() {
  return (
    <svg className="cloud-divider" width="260" height="26" viewBox="0 0 260 26">
      <path
        d="M10 18 Q 30 4 55 14 Q 70 2 95 12 Q 118 0 130 12 Q 142 0 165 12 Q 190 2 205 14 Q 230 4 250 18"
        fill="none"
        stroke="#9a7f2a"
        strokeWidth="1.4"
        strokeLinecap="round"
        opacity="0.8"
      />
      <circle cx="130" cy="17" r="2.4" fill="#d4af37" />
    </svg>
  )
}
