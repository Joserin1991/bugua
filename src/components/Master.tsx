// 术语典：点击盘中名词弹出大师详解
import { createContext, useContext, useEffect, useState, type ReactNode } from 'react'
import { TERMS, STARS, type GlossaryEntry } from '../data/glossary'

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
