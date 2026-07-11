// 排盘仪式动画：水墨太极旋转 → 烟雾消散 → 命盘浮现
// 若 public/fx/taiji-ink-spin.webm 存在则播放视频素材，否则用内置水墨 SVG 动画
import { useEffect, useRef, useState } from 'react'
import { DestinyWheel } from './DestinyWheel'
import type { BaziChart } from '../lib/bazi'

const TAIJI_VIDEO_URL = '/fx/taiji-ink-spin.webm'

type Phase = 'spin' | 'dissolve' | 'reveal' | 'leave'

const PHASE_CAPTION: Record<Phase, string> = {
  spin: '太极初判 · 两仪既分',
  dissolve: '烟散云收 · 天机将现',
  reveal: '命盘既成 · 斗转星移',
  leave: '',
}

// 水墨太极 SVG（笔触毛边 + 墨晕）
export function InkTaiji({ size = 300 }: { size?: number }) {
  const c = size / 2
  const r = c * 0.82
  return (
    <svg width={size} height={size} viewBox={`0 0 ${size} ${size}`}>
      <defs>
        <filter id="inkrough" x="-20%" y="-20%" width="140%" height="140%">
          <feTurbulence type="fractalNoise" baseFrequency="0.014 0.02" numOctaves="3" seed="7" result="n" />
          <feDisplacementMap in="SourceGraphic" in2="n" scale="10" />
        </filter>
        <filter id="inkbleed" x="-40%" y="-40%" width="180%" height="180%">
          <feGaussianBlur stdDeviation="7" />
        </filter>
        <radialGradient id="inkfill" cx="42%" cy="38%" r="80%">
          <stop offset="0%" stopColor="#343434" />
          <stop offset="70%" stopColor="#171717" />
          <stop offset="100%" stopColor="#0e0e0e" />
        </radialGradient>
      </defs>
      {/* 墨晕底 */}
      <circle cx={c} cy={c} r={r} fill="#171717" opacity="0.18" filter="url(#inkbleed)" />
      <g filter="url(#inkrough)">
        <circle cx={c} cy={c} r={r} fill="none" stroke="#171717" strokeWidth={size * 0.02} opacity="0.9" />
        <path
          d={`M ${c} ${c - r} A ${r} ${r} 0 0 1 ${c} ${c + r} A ${r / 2} ${r / 2} 0 0 1 ${c} ${c} A ${r / 2} ${r / 2} 0 0 0 ${c} ${c - r} Z`}
          fill="url(#inkfill)"
        />
        <circle cx={c} cy={c - r / 2} r={r / 6.5} fill="#f5f5f3" />
        <circle cx={c} cy={c + r / 2} r={r / 6.5} fill="url(#inkfill)" />
      </g>
      {/* 飞白笔锋 */}
      <path
        d={`M ${c - r * 0.95} ${c + r * 0.4} A ${r} ${r} 0 0 1 ${c - r * 0.2} ${c - r * 0.97}`}
        fill="none" stroke="#f5f5f3" strokeWidth={size * 0.012} opacity="0.35" strokeLinecap="round" filter="url(#inkrough)"
      />
    </svg>
  )
}

const MISTS = [
  { w: 200, h: 130, top: '8%', left: '-6%', delay: '0s' },
  { w: 260, h: 150, top: '52%', left: '58%', delay: '0.8s' },
  { w: 180, h: 120, top: '66%', left: '-4%', delay: '1.5s' },
  { w: 230, h: 140, top: '-4%', left: '52%', delay: '0.4s' },
]

export function RitualOverlay({ chart, onDone }: { chart: BaziChart; onDone: () => void }) {
  const [phase, setPhase] = useState<Phase>('spin')
  const [videoOk, setVideoOk] = useState(false)
  const videoRef = useRef<HTMLVideoElement>(null)
  const doneRef = useRef(onDone)
  doneRef.current = onDone

  useEffect(() => {
    const t1 = setTimeout(() => setPhase('dissolve'), 2600)
    const t2 = setTimeout(() => setPhase('reveal'), 3650)
    const t3 = setTimeout(() => setPhase('leave'), 5400)
    const t4 = setTimeout(() => doneRef.current(), 6300)
    return () => [t1, t2, t3, t4].forEach(clearTimeout)
  }, [])

  const dissolving = phase !== 'spin'

  return (
    <div className={`ritual-overlay ${phase === 'leave' ? 'leaving' : ''}`}>
      <div className="ritual-stage">
        {/* 太极：视频素材优先，SVG 兜底 */}
        {phase === 'spin' || phase === 'dissolve' ? (
          <>
            <video
              ref={videoRef}
              className={`ritual-video ${dissolving ? 'dissolving' : ''}`}
              src={TAIJI_VIDEO_URL}
              muted
              loop
              autoPlay
              playsInline
              onCanPlay={() => setVideoOk(true)}
              onError={() => setVideoOk(false)}
              style={{ display: videoOk ? 'block' : 'none' }}
            />
            {!videoOk && (
              <div className={`ritual-taiji ${dissolving ? 'dissolving' : ''}`}>
                <InkTaiji size={300} />
              </div>
            )}
            {MISTS.map((m, i) => (
              <div
                key={i}
                className={`ritual-mist ${dissolving ? 'dissolving' : ''}`}
                style={{ width: m.w, height: m.h, top: m.top, left: m.left, animationDelay: m.delay }}
              />
            ))}
          </>
        ) : null}

        {(phase === 'reveal' || phase === 'leave') && (
          <div className="ritual-wheel">
            <DestinyWheel chart={chart} size={400} highlightZhi={chart.pillars[0].zhi} />
          </div>
        )}
      </div>
      <div className="ritual-caption">{PHASE_CAPTION[phase] || PHASE_CAPTION.reveal}</div>
    </div>
  )
}
