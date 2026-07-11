// 对话式 UI 基础件：禅圈头像、大师气泡（打字机）、用户胶囊、快捷追问、进度墨圈、水墨插画位
import { useEffect, useRef, useState, type ReactNode } from 'react'

// 禅圈头像（若 public/fx/master-avatar.png 存在则用图片）
export function EnsoAvatar({ size = 32 }: { size?: number }) {
  const [imgOk, setImgOk] = useState(true)
  const c = size / 2
  return (
    <span className="msg-avatar" style={{ width: size, height: size, display: 'inline-block' }}>
      {imgOk ? (
        <img
          src="/fx/master-avatar.png"
          width={size} height={size}
          style={{ borderRadius: '50%', display: 'block' }}
          onError={() => setImgOk(false)}
          alt=""
        />
      ) : (
        <svg width={size} height={size} viewBox={`0 0 ${size} ${size}`}>
          <circle cx={c} cy={c} r={c - 1.5} fill="#f7f5ee" stroke="#1e1c18" strokeWidth="1.4" />
          <path
            d={`M ${c + (c - 4)} ${c} A ${c - 4} ${c - 4} 0 1 1 ${c + (c - 4) * 0.72} ${c - (c - 4) * 0.62}`}
            fill="none" stroke="#1e1c18" strokeWidth={size * 0.09} strokeLinecap="round" opacity="0.9"
          />
          <circle cx={c + 2} cy={c - 3} r={size * 0.07} fill="#a8382b" />
        </svg>
      )}
    </span>
  )
}

// 大师文字消息（打字机，点击跳过）
export function MasterMsg({
  segments, done = false, onDone, speed = 30,
}: {
  segments: ReactNode[]
  done?: boolean
  onDone?: () => void
  speed?: number
}) {
  const [visible, setVisible] = useState(done ? segments.length : 0)
  const [charCount, setCharCount] = useState(0)
  const finished = visible >= segments.length
  const onDoneRef = useRef(onDone)
  onDoneRef.current = onDone
  const firedRef = useRef(false)

  useEffect(() => {
    if (done) setVisible(segments.length)
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [done])

  useEffect(() => {
    if (finished) {
      if (!firedRef.current) { firedRef.current = true; onDoneRef.current?.() }
      return
    }
    const seg = segments[visible]
    if (typeof seg !== 'string') {
      const t = setTimeout(() => { setVisible((v) => v + 1); setCharCount(0) }, 150)
      return () => clearTimeout(t)
    }
    if (charCount >= seg.length) {
      const t = setTimeout(() => { setVisible((v) => v + 1); setCharCount(0) }, 100)
      return () => clearTimeout(t)
    }
    const t = setTimeout(() => setCharCount((n) => n + 1), speed)
    return () => clearTimeout(t)
  }, [visible, charCount, finished, segments, speed])

  return (
    <div className="msg-row fade-in">
      <EnsoAvatar />
      <div
        className={`msg-bubble ${finished ? '' : 'typing'}`}
        onClick={finished ? undefined : () => { setVisible(segments.length); setCharCount(0) }}
      >
        {segments.slice(0, visible).map((s, i) => <span key={i}>{s}</span>)}
        {!finished && typeof segments[visible] === 'string' && (
          <span>{(segments[visible] as string).slice(0, charCount)}</span>
        )}
        {!finished && <span className="caret">▌</span>}
      </div>
    </div>
  )
}

export function UserMsg({ children }: { children: ReactNode }) {
  return (
    <div className="user-row fade-in">
      <div className="user-pill">{children}</div>
    </div>
  )
}

// 卡片消息（图表/盘面容器）
export function CardMsg({ title, sub, children }: { title?: string; sub?: string; children: ReactNode }) {
  return (
    <div className="card-msg fade-in">
      {title && <div className="card-title">{title}</div>}
      {sub && <div className="card-sub">{sub}</div>}
      {children}
    </div>
  )
}

// 快捷追问胶囊
export function Chips({
  items, onPick, ghost = false,
}: {
  items: string[]
  onPick: (v: string) => void
  ghost?: boolean
}) {
  if (!items.length) return null
  return (
    <div className="chips-row fade-in">
      {items.map((it) => (
        <button key={it} className={`chip ${ghost ? 'chip-ghost' : ''}`} onClick={() => onPick(it)}>
          {it}
        </button>
      ))}
    </div>
  )
}

// 手绘感禅圈 SVG（可复用）
export function EnsoRing({ size = 150, className = '', stroke = 6 }: { size?: number; className?: string; stroke?: number }) {
  const c = size / 2
  const r = c - stroke - 2
  return (
    <svg width={size} height={size} viewBox={`0 0 ${size} ${size}`} className={className}>
      <defs>
        <filter id={`enso-r-${size}`} x="-20%" y="-20%" width="140%" height="140%">
          <feTurbulence type="fractalNoise" baseFrequency="0.03 0.05" numOctaves="2" seed="9" result="n" />
          <feDisplacementMap in="SourceGraphic" in2="n" scale={stroke * 0.9} />
        </filter>
      </defs>
      <g filter={`url(#enso-r-${size})`}>
        <path
          d={`M ${c + r} ${c} A ${r} ${r} 0 1 1 ${c + r * 0.8} ${c - r * 0.55}`}
          fill="none" stroke="#1e1c18" strokeWidth={stroke} strokeLinecap="round" opacity="0.88"
        />
      </g>
    </svg>
  )
}

// 进度墨圈（排盘中 72%）
export function ProgressEnso({ label, pct }: { label: string; pct: number }) {
  return (
    <div className="progress-enso fade-in">
      <div className="pe-stage">
        <EnsoRing size={150} className="enso-rotate" />
        <div className="pe-center">
          <span className="pe-label">{label}</span>
          <span className="pe-pct">{Math.min(99, Math.round(pct))}%</span>
        </div>
      </div>
    </div>
  )
}

// 水墨插画位：有素材用素材，无素材用内置 SVG 山水兜底
export function InkArt({ name, height = 150 }: { name: string; height?: number }) {
  const [imgOk, setImgOk] = useState(true)
  return (
    <div style={{ display: 'flex', justifyContent: 'center', margin: '6px 0' }}>
      {imgOk ? (
        <img
          src={`/fx/art-${name}.png`}
          style={{ maxWidth: '100%', maxHeight: height, objectFit: 'contain' }}
          onError={() => setImgOk(false)}
          alt=""
        />
      ) : (
        <EnsoLandscape height={height} seed={name.length} />
      )}
    </div>
  )
}

// 内置兜底：禅圈里的远山红日
export function EnsoLandscape({ height = 150, seed = 3 }: { height?: number; seed?: number }) {
  const s = height
  const c = s / 2
  return (
    <svg width={s} height={s} viewBox={`0 0 ${s} ${s}`}>
      <defs>
        <filter id={`el-${seed}`} x="-20%" y="-20%" width="140%" height="140%">
          <feTurbulence type="fractalNoise" baseFrequency="0.03 0.05" numOctaves="2" seed={seed + 5} result="n" />
          <feDisplacementMap in="SourceGraphic" in2="n" scale="5" />
        </filter>
        <clipPath id={`elc-${seed}`}>
          <circle cx={c} cy={c} r={c * 0.78} />
        </clipPath>
      </defs>
      <g clipPath={`url(#elc-${seed})`}>
        <rect width={s} height={s} fill="#f7f5ee" />
        <circle cx={c + s * 0.14} cy={c - s * 0.16} r={s * 0.06} fill="#a8382b" opacity="0.85" />
        <path d={`M ${-s * 0.1} ${c + s * 0.18} Q ${s * 0.2} ${c - s * 0.08} ${s * 0.42} ${c + s * 0.14} T ${s * 0.85} ${c + s * 0.1} L ${s * 1.1} ${s} L ${-s * 0.1} ${s} Z`} fill="#5c584c" opacity="0.5" filter={`url(#el-${seed})`} />
        <path d={`M ${-s * 0.1} ${c + s * 0.3} Q ${s * 0.3} ${c + s * 0.06} ${s * 0.6} ${c + s * 0.26} T ${s * 1.1} ${c + s * 0.22} L ${s * 1.1} ${s} L ${-s * 0.1} ${s} Z`} fill="#1e1c18" opacity="0.65" filter={`url(#el-${seed})`} />
        <path d={`M ${s * 0.12} ${c - s * 0.02} q ${s * 0.03} ${-s * 0.025} ${s * 0.06} 0`} fill="none" stroke="#1e1c18" strokeWidth="1.2" opacity="0.6" />
        <path d={`M ${s * 0.24} ${c - s * 0.08} q ${s * 0.025} ${-s * 0.02} ${s * 0.05} 0`} fill="none" stroke="#1e1c18" strokeWidth="1" opacity="0.5" />
      </g>
      <g filter={`url(#el-${seed})`}>
        <path
          d={`M ${c + c * 0.82} ${c} A ${c * 0.82} ${c * 0.82} 0 1 1 ${c + c * 0.82 * 0.78} ${c - c * 0.82 * 0.58}`}
          fill="none" stroke="#1e1c18" strokeWidth={s * 0.035} strokeLinecap="round" opacity="0.85"
        />
      </g>
    </svg>
  )
}

// 底部输入栏
export function InputBar({ placeholder = '有问题尽管问我…', onSend }: { placeholder?: string; onSend: (text: string) => void }) {
  const [text, setText] = useState('')
  const send = () => {
    const t = text.trim()
    if (!t) return
    setText('')
    onSend(t)
  }
  return (
    <div className="input-bar">
      <input
        value={text}
        placeholder={placeholder}
        onChange={(e) => setText(e.target.value)}
        onKeyDown={(e) => { if (e.key === 'Enter') send() }}
      />
      <button className="send-btn" onClick={send}>➤</button>
    </div>
  )
}

// 屏头
export function ScreenHead({ title, onBack, right }: { title: string; onBack?: () => void; right?: ReactNode }) {
  return (
    <div className="screen-head">
      <button className="head-btn" onClick={onBack} style={{ visibility: onBack ? 'visible' : 'hidden' }}>←</button>
      <div className="screen-title">{title}</div>
      <span style={{ textAlign: 'center' }}>{right}</span>
    </div>
  )
}
