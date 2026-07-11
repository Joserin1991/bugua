// 答疑解惑 · 对话流：输入问题 → 梅花易数应时起卦 → 卦象卡 + 分节断语 → 追问
import { useRef, useState, type ReactNode } from 'react'
import { castByQuestion, type CastResult } from '../lib/hexagram'
import { interpretOracle, detectCategory } from '../lib/interpret'
import { saveRecord } from '../lib/records'
import { MasterMsg, UserMsg, Chips, ProgressEnso, InputBar } from './ChatUI'
import { GuaCard } from './DivineChat'

type NewItem =
  | { kind: 'master'; segs: ReactNode[] }
  | { kind: 'user'; text: string }
  | { kind: 'node'; node: ReactNode }

type Item = NewItem & { id: number }

let uid = 20000

export function OracleChat() {
  const [items, setItems] = useState<Item[]>(() => [{
    id: uid++,
    kind: 'master',
    segs: ['一事一问，心诚则灵。', '把你想问的事告诉老朽——老朽以梅花易数，应时为你起一卦。', '例：今年适合跳槽吗？我和他还有可能吗？'],
  }])
  const [busy, setBusy] = useState(true)
  const [computing, setComputing] = useState(false)
  const [pct, setPct] = useState(0)
  const [lastCast, setLastCast] = useState<{ cast: CastResult; q: string } | null>(null)
  const bottomRef = useRef<HTMLDivElement>(null)

  const scroll = () => setTimeout(() => bottomRef.current?.scrollIntoView({ behavior: 'smooth', block: 'end' }), 100)
  const push = (item: NewItem) => { setItems((a) => [...a, { ...item, id: uid++ }]); scroll() }
  const master = (segs: ReactNode[]) => { setBusy(true); push({ kind: 'master', segs }) }
  const user = (t: string) => push({ kind: 'user', text: t })
  const node = (n: ReactNode) => push({ kind: 'node', node: n })

  const ask = (q: string) => {
    user(q)
    if (computing) return
    setComputing(true)
    master(['凝神起卦 · 观梅问数……'])
    let p = 0
    const timer = setInterval(() => {
      p += 5 + Math.random() * 9
      setPct(Math.min(99, p))
      if (p >= 100) {
        clearInterval(timer)
        setComputing(false)
        setPct(0)
        const cast = castByQuestion(q, new Date())
        const cat = detectCategory(q)
        const reading = interpretOracle(cast, q, cat)
        setLastCast({ cast, q })
        saveRecord({
          type: '答疑解惑',
          title: `问：${q.slice(0, 18)}`,
          summary: `${cast.original.fullName}${cast.changed ? ` 变 ${cast.changed.fullName}` : ''} · ${reading.luckLabel}`,
        })
        master([`所问「${q}」（${cat}），得${cast.original.fullName}${cast.changed ? `，变${cast.changed.fullName}` : '，六爻安静'}。`])
        node(<GuaCard result={cast} question={q} category={cat} />)
        const trend = reading.sections.find((s) => s.title.startsWith('变卦') || s.title === '静卦所示')
        const guide = reading.sections.find((s) => s.title === '行动指引')
        master([`${trend?.text ?? ''}`, `${guide?.text ?? ''}`])
      }
    }, 90)
  }

  return (
    <>
      <div className="chat-scroll">
        {items.map((it) => {
          if (it.kind === 'master') return <MasterMsg key={it.id} segments={it.segs} onDone={() => { setBusy(false); scroll() }} />
          if (it.kind === 'user') return <UserMsg key={it.id}>{it.text}</UserMsg>
          return <div key={it.id}>{it.node}</div>
        })}
        {computing && pct > 0 && <ProgressEnso label="起卦中" pct={pct} />}
        {!busy && !computing && !lastCast && (
          <Chips ghost items={['今年适合跳槽吗？', '这段感情能长久吗？', '这笔投资可行否？']} onPick={ask} />
        )}
        {!busy && !computing && lastCast && (
          <Chips ghost items={['换个问题再问一卦']} onPick={() => {
            setLastCast(null)
            master(['好，静心，想好了便说。'])
          }} />
        )}
        <div ref={bottomRef} />
      </div>
      <InputBar placeholder="有问题尽管问我…" onSend={ask} />
    </>
  )
}
