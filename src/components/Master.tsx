// 大师问命：对话气泡（打字机）、术语点解、典籍弹窗
import { createContext, useContext, useEffect, useRef, useState, type ReactNode } from 'react'
import { TERMS, STARS, type GlossaryEntry } from '../data/glossary'

// ---------- 术语弹窗上下文 ----------
const GlossaryCtx = createContext<(e: GlossaryEntry) => void>(() => {})

export function GlossaryProvider({ children }: { children: ReactNode }) {
  const [entry, setEntry] = useState<GlossaryEntry | null>(null)
  useEffect(() => {
    if (!entry) return
    const onKey = (e: KeyboardEvent) => { if (e.key === 'Escape') setEntry(null) }
    window.addEventListener('keydown', onKey)
    return () => window.removeEventListener('keydown', onKey)
  }, [entry])
  return (
    <GlossaryCtx.Provider value={setEntry}>
      {children}
      {entry && (
        <div className="glossary-overlay" onClick={() => setEntry(null)}>
          <div className="glossary-modal fade-in" onClick={(e) => e.stopPropagation()}>
            <div className="glossary-title">{entry.title}</div>
            <p className="glossary-text">{entry.text}</p>
            <div className="glossary-close" onClick={() => setEntry(null)}>知道了</div>
          </div>
        </div>
      )}
    </GlossaryCtx.Provider>
  )
}

// 术语：点击可查典
export function Term({ k, star = false, children }: { k: string; star?: boolean; children?: ReactNode }) {
  const open = useContext(GlossaryCtx)
  const dict = star ? STARS : TERMS
  const entry = dict[k]
  if (!entry) return <>{children ?? k}</>
  return (
    <span className="term" onClick={(e) => { e.stopPropagation(); open(entry) }}>
      {children ?? k}
    </span>
  )
}

export function useGlossary() {
  return useContext(GlossaryCtx)
}

// ---------- 大师头像 ----------
export function MasterAvatar({ size = 46 }: { size?: number }) {
  const c = size / 2
  return (
    <svg width={size} height={size} viewBox={`0 0 ${size} ${size}`} className="master-avatar-svg">
      <circle cx={c} cy={c} r={c - 2} fill="#fbfbfa" stroke="#171717" strokeWidth="1.6" />
      <circle cx={c} cy={c} r={c - 5.5} fill="none" stroke="#171717" strokeWidth="0.7" opacity="0.4" strokeDasharray="3 2" />
      <text x={c} y={c + 1} textAnchor="middle" dominantBaseline="central" fontSize={size * 0.46} fill="#171717" fontFamily='"Ma Shan Zheng","STKaiti",serif'>玄</text>
    </svg>
  )
}

// ---------- 打字机气泡 ----------
// 大师说话逐字浮现；点击气泡立即显全。支持 ReactNode 分段（含 Term 链接）。
export function MasterBubble({
  segments, done, onDone, instant = false,
}: {
  segments: ReactNode[]      // 文案分段：字符串段落逐字打出，元素段落整体浮现
  done?: boolean             // 已完成的历史气泡（直接显全）
  onDone?: () => void
  instant?: boolean
}) {
  const [visible, setVisible] = useState(done || instant ? segments.length : 0)
  const [charCount, setCharCount] = useState(0)
  const finished = visible >= segments.length
  const onDoneRef = useRef(onDone)
  onDoneRef.current = onDone
  const firedRef = useRef(false)

  useEffect(() => {
    if (done || instant) { setVisible(segments.length); return }
    setVisible(0)
    setCharCount(0)
    firedRef.current = false
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [])

  useEffect(() => {
    if (finished) {
      if (!firedRef.current) { firedRef.current = true; onDoneRef.current?.() }
      return
    }
    const seg = segments[visible]
    if (typeof seg !== 'string') {
      const t = setTimeout(() => { setVisible((v) => v + 1); setCharCount(0) }, 180)
      return () => clearTimeout(t)
    }
    if (charCount >= seg.length) {
      const t = setTimeout(() => { setVisible((v) => v + 1); setCharCount(0) }, 120)
      return () => clearTimeout(t)
    }
    const t = setTimeout(() => setCharCount((n) => n + 1), 38)
    return () => clearTimeout(t)
  }, [visible, charCount, finished, segments])

  const skip = () => {
    setVisible(segments.length)
    setCharCount(0)
  }

  return (
    <div className="master-row fade-in">
      <MasterAvatar />
      <div className={`master-bubble ${finished ? '' : 'typing'}`} onClick={finished ? undefined : skip}>
        {segments.slice(0, visible).map((s, i) => <span key={i}>{s}</span>)}
        {!finished && typeof segments[visible] === 'string' && (
          <span>{(segments[visible] as string).slice(0, charCount)}</span>
        )}
        {!finished && <span className="caret">▌</span>}
      </div>
    </div>
  )
}

// 访客回话（右侧）
export function GuestBubble({ children }: { children: ReactNode }) {
  return (
    <div className="guest-row fade-in">
      <div className="guest-bubble">{children}</div>
    </div>
  )
}
