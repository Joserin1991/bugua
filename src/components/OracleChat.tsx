// 答疑解惑 · 对话流：输入问题 → 梅花易数应时起卦 → 卦象卡 + AI 解卦（无 AI 则卦书断语） → 就卦追问
import { useRef, useState, type ReactNode } from 'react'
import { castByQuestion, normalizeQuestion, type CastResult } from '../lib/hexagram'
import { interpretOracle, detectCategory, type OracleCategory } from '../lib/interpret'
import { saveRecord, updateRecordChat, type ChatLine } from '../lib/records'
import { MasterMsg, UserMsg, Chips, ProgressEnso, InputBar } from './ChatUI'
import { GuaCard, guaInfoOf } from './DivineChat'
import { loadAiConfig, buildGuaSystem, parseSuggestReply, askMasterRetry, explainAiError, type ChatTurn } from '../lib/ai'

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
    segs: ['一事一占，卦定不重摇——心诚则灵。', '把你想问的事告诉老朽——老朽以梅花易数，应时为你起一卦；同一事今日再问，仍是此卦（一事不二占，反复则乱）。', '例：今年适合跳槽吗？我和他还有可能吗？'],
  }])
  const [busy, setBusy] = useState(true)
  const [computing, setComputing] = useState(false)
  const [pct, setPct] = useState(0)
  const [lastCast, setLastCast] = useState<{ cast: CastResult; q: string } | null>(null)
  const [aiThinking, setAiThinking] = useState(false)
  const [aiSuggests, setAiSuggests] = useState<string[]>([])
  const aiHistoryRef = useRef<ChatTurn[]>([])
  const aiSystemRef = useRef<string>('')
  const bottomRef = useRef<HTMLDivElement>(null)
  // 一事不二占：本会话内同一问题复用原卦，不重起（增可信度）
  const sessionCastsRef = useRef<Map<string, { result: CastResult; cat: OracleCategory }>>(new Map())

  const scroll = () => setTimeout(() => bottomRef.current?.scrollIntoView({ behavior: 'smooth', block: 'end' }), 100)
  const push = (item: NewItem) => { setItems((a) => [...a, { ...item, id: uid++ }]); scroll() }
  // 对话全程记档：随聊随存进当条记录
  const chatLogRef = useRef<ChatLine[]>([])
  const recordIdRef = useRef<string | null>(null)
  const log = (r: 'm' | 'u', t: string) => {
    if (!t) return
    chatLogRef.current.push({ r, t })
    if (recordIdRef.current) updateRecordChat(recordIdRef.current, chatLogRef.current)
  }
  const master = (segs: ReactNode[]) => { setBusy(true); push({ kind: 'master', segs }); log('m', segs.filter((x) => typeof x === 'string').join('')) }
  const user = (t: string) => { push({ kind: 'user', text: t }); log('u', t) }
  const node = (n: ReactNode) => push({ kind: 'node', node: n })

  // 就当前卦的 AI 问答（带上下文；失败明示）
  const aiAnswer = (q: string, echo: boolean) => {
    const cfg = loadAiConfig()
    if (!cfg || !aiSystemRef.current) return false
    if (echo) user(q)
    setAiThinking(true)
    Promise.all([
      askMasterRetry(cfg, aiSystemRef.current, aiHistoryRef.current.slice(-8), q),
      new Promise((res) => setTimeout(res, 900)),
    ])
      .then(([raw]) => {
        const { body, suggests } = parseSuggestReply(raw as string)
        master([body])
        if (suggests.length) setAiSuggests((prev) => Array.from(new Set([...suggests, ...prev])).slice(0, 6))
        aiHistoryRef.current.push({ role: 'user', content: q }, { role: 'assistant', content: body })
      })
      .catch((e) => master([`网络一时未通（${explainAiError(e)}）——先以卦书体例为你断，稍后再问一句即接 AI。`]))
      .finally(() => { setAiThinking(false); scroll() })
    return true
  }

  // 就一卦（新起或复用）铺陈卡片、建档、接 AI 解卦
  const settleCast = (result: CastResult, q: string, cat: OracleCategory, reused: boolean) => {
    const reading = interpretOracle(result, q, cat)
    setLastCast({ cast: result, q })
    log('m', `〔卦象卡〕本卦 ${result.original.fullName}${result.changed ? `，变卦 ${result.changed.fullName}` : '，六爻安静'}；互卦 ${result.mutual.fullName}。`)
    recordIdRef.current = saveRecord({
      type: '答疑解惑',
      title: `问：${q.slice(0, 18)}`,
      summary: `${result.original.fullName}${result.changed ? ` 变 ${result.changed.fullName}` : ''} · ${reading.luckLabel}`,
      chat: chatLogRef.current,
      gua: { info: guaInfoOf(result, '梅花易数'), question: q, category: cat },
    })
    if (reused) master([`一事不二占——此事你今日已问过，卦象已定，不必重起。老朽仍以原卦「${result.original.fullName}」为你再参。`])
    else master([`所问「${q}」（${cat}），得${result.original.fullName}${result.changed ? `，变${result.changed.fullName}` : '，六爻安静'}。`])
    node(<GuaCard result={result} question={q} category={cat} />)
    aiSystemRef.current = buildGuaSystem(guaInfoOf(result, '梅花易数'), q, cat)
    aiHistoryRef.current = []
    const usedAi = aiAnswer(`【系统指令】卦${reused ? '仍为原卦（一事不二占）' : '刚起好'}，卦象卡已展示。请就命主所问「${q}」解此卦（150~200字）：本卦定基调、动爻与变卦看走向，给出明确倾向与行动叮嘱。`, false)
    if (!usedAi) {
      const trend = reading.sections.find((s) => s.title.startsWith('变卦') || s.title === '静卦所示')
      const guide = reading.sections.find((s) => s.title === '行动指引')
      master([`${trend?.text ?? ''}`, `${guide?.text ?? ''}`])
    }
  }

  const cast = (q: string) => {
    if (computing) return
    setAiSuggests([])
    // 一事不二占：今日已问过同一问题 → 直接复用原卦，不再摇出新卦
    const key = normalizeQuestion(q)
    const prior = sessionCastsRef.current.get(key)
    if (prior) {
      settleCast(prior.result, q, prior.cat, true)
      return
    }
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
        const result = castByQuestion(q, new Date())
        const cat = detectCategory(q)
        sessionCastsRef.current.set(key, { result, cat })
        settleCast(result, q, cat, false)
      }
    }, 90)
  }

  const ask = (q: string) => {
    user(q)
    if (computing) return
    // 已有卦在手：接着这一卦答；无 AI 时按旧例重新起卦
    if (lastCast && aiAnswer(q, false)) return
    cast(q)
  }

  const resetCast = () => {
    setLastCast(null)
    setAiSuggests([])
    aiSystemRef.current = ''
    aiHistoryRef.current = []
    recordIdRef.current = null // 新一卦另起一条记录
    chatLogRef.current = []
    master(['好，静心，想好了便说。'])
  }

  const followUps = lastCast
    ? [...aiSuggests, '换个问题再问一卦']
    : []

  return (
    <>
      <div className="chat-scroll">
        {items.map((it) => {
          if (it.kind === 'master') return <MasterMsg key={it.id} segments={it.segs} onDone={() => { setBusy(false); scroll() }} />
          if (it.kind === 'user') return <UserMsg key={it.id}>{it.text}</UserMsg>
          return <div key={it.id}>{it.node}</div>
        })}
        {computing && pct > 0 && <ProgressEnso label="起卦中" pct={pct} />}
        {aiThinking && (
          <div className="msg-row fade-in">
            <div className="msg-bubble typing" style={{ marginLeft: 44 }}>老朽正在参卦<span className="caret">▌</span></div>
          </div>
        )}
        {!busy && !computing && !aiThinking && !lastCast && (
          <Chips ghost items={['今年适合跳槽吗？', '这段感情能长久吗？', '这笔投资可行否？']} onPick={ask} />
        )}
        {!busy && !computing && !aiThinking && lastCast && (
          <Chips ghost items={followUps} onPick={(v) => { if (v === '换个问题再问一卦') resetCast(); else { setAiSuggests((prev) => prev.filter((x) => x !== v)); ask(v) } }} />
        )}
        <div ref={bottomRef} />
      </div>
      <InputBar placeholder="有问题尽管问我…" onSend={ask} />
    </>
  )
}
