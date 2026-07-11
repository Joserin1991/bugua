// 背景装饰：水墨氛围（雾气/飞鸟）、八卦轮、太极、云纹
import { TRIGRAM_LINES } from '../data/hexagrams'

const INK = '#171717'

export function InkAtmosphere() {
  return (
    <div className="ink-atmosphere">
      <div className="mist-blob" style={{ width: 520, height: 280, top: '6%', left: '-8%' }} />
      <div className="mist-blob" style={{ width: 620, height: 320, top: '58%', left: '62%', animationDelay: '6s' }} />
      <div className="mist-blob" style={{ width: 420, height: 240, top: '76%', left: '-6%', animationDelay: '12s' }} />
      {/* 远山飞鸟 */}
      <svg width="200" height="70" viewBox="0 0 200 70" style={{ position: 'absolute', top: '13%', right: '7%', opacity: 0.5 }}>
        <path d="M10 30 Q 16 22 22 28 Q 28 22 34 30" fill="none" stroke={INK} strokeWidth="1.6" strokeLinecap="round" />
        <path d="M52 44 Q 57 37 62 42 Q 67 37 72 44" fill="none" stroke={INK} strokeWidth="1.4" strokeLinecap="round" />
        <path d="M86 22 Q 90 16 94 20 Q 98 16 102 22" fill="none" stroke={INK} strokeWidth="1.2" strokeLinecap="round" />
        <path d="M120 52 Q 124 47 128 50 Q 132 47 136 52" fill="none" stroke={INK} strokeWidth="1.1" strokeLinecap="round" />
      </svg>
    </div>
  )
}

const TRIGRAM_ORDER = ['乾', '兑', '离', '震', '巽', '坎', '艮', '坤'] // 先天八卦序

export function BaguaWheel({ size = 520, className = '' }: { size?: number; className?: string }) {
  const c = size / 2
  const rOuter = c - 10
  const rings = [0, 1, 2]
  return (
    <svg className={className} width={size} height={size} viewBox={`0 0 ${size} ${size}`}>
      <circle cx={c} cy={c} r={rOuter} fill="none" stroke={INK} strokeWidth="1.5" />
      <circle cx={c} cy={c} r={rOuter - 66} fill="none" stroke={INK} strokeWidth="0.8" />
      {TRIGRAM_ORDER.map((name, k) => {
        const lines = TRIGRAM_LINES[name]
        return (
          <g key={name} transform={`rotate(${k * 45} ${c} ${c})`}>
            {rings.map((ri) => {
              const y = 24 + ri * 13
              const w = 44
              const yang = lines[2 - ri] === 1
              return yang ? (
                <rect key={ri} x={c - w / 2} y={y} width={w} height={7} fill={INK} rx={1.5} />
              ) : (
                <g key={ri}>
                  <rect x={c - w / 2} y={y} width={w * 0.42} height={7} fill={INK} rx={1.5} />
                  <rect x={c + w / 2 - w * 0.42} y={y} width={w * 0.42} height={7} fill={INK} rx={1.5} />
                </g>
              )
            })}
            <text x={c} y={92} textAnchor="middle" fill={INK} fontSize="15" fontFamily="serif">
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
      <circle cx={cx} cy={cy} r={r} fill="#f5f5f3" stroke={INK} strokeWidth="1.5" />
      <path
        d={`M ${cx} ${cy - r} A ${r} ${r} 0 0 1 ${cx} ${cy + r} A ${r / 2} ${r / 2} 0 0 1 ${cx} ${cy} A ${r / 2} ${r / 2} 0 0 0 ${cx} ${cy - r} Z`}
        fill={INK}
      />
      <circle cx={cx} cy={cy - r / 2} r={r / 7} fill="#f5f5f3" />
      <circle cx={cx} cy={cy + r / 2} r={r / 7} fill={INK} />
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
        stroke={INK}
        strokeWidth="1.4"
        strokeLinecap="round"
        opacity="0.5"
      />
      <circle cx="130" cy="17" r="2.4" fill="#a8382b" />
    </svg>
  )
}
