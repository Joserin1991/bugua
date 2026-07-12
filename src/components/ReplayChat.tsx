// 记录回看 · 续问：重放当次完整对话；卦类记录可就原卦接着问（AI 语境按存档重建）
import { useRef, useState } from 'react'
import { updateRecordChat, type ChatLine, type RecordItem } from '../lib/records'
import { MasterMsg, UserMsg, Chips, InputBar } from './ChatUI'
import { loadAiConfig, buildGuaSystem, parseSuggestReply, askMasterRetry, explainAiError, type ChatTurn } from '../lib/ai'

let uid = 40000

export function ReplayChat({ record }: { record: RecordItem }) {
  const replay = record.chat ?? []
  const [liveItems, setLiveItems] = useState<{ id: number; r: 'm' | 'u'; t: string }[]>([])
  const [busy, setBusy] = useState(false)
  const [thinking, setThinking] = useState(false)
  const [suggests, setSuggests] = useState<string[]>([])
  const chatLogRef = useRef<ChatLine[]>([...replay])
  const aiHistoryRef = useRef<ChatTurn[]>(
    replay.filter((l) => !l.t.startsWith('〔')).slice(-10).map((l) => ({ role: l.r === 'u' ? 'user' as const : 'assistant' as const, content: l.t })),
  )
  const sysRef = useRef(record.gua ? buildGuaSystem(record.gua.info, record.gua.question, record.gua.category) : '')
  const bottomRef = useRef<HTMLDivElement>(null)
  const scroll = () => setTimeout(() => bottomRef.current?.scrollIntoView({ behavior: 'smooth', block: 'end' }), 100)

  const pushLine = (r: 'm' | 'u', t: string) => {
    chatLogRef.current.push({ r, t })
    updateRecordChat(record.id, chatLogRef.current)
    setLiveItems((a) => [...a, { id: uid++, r, t }])
    scroll()
  }

  const ask = (q: string) => {
    if (thinking) return
    pushLine('u', q)
    if (!sysRef.current) {
      pushLine('m', '这条是旧档回看——想接着细问，请回「问命排盘」用原生辰重新起盘，老朽自会接上旧话。')
      return
    }
    setThinking(true)
    Promise.all([
      askMasterRetry(loadAiConfig(), sysRef.current, aiHistoryRef.current.slice(-8), q),
      new Promise((res) => setTimeout(res, 900)),
    ])
      .then(([raw]) => {
        const { body, suggests: sg } = parseSuggestReply(raw as string)
        setBusy(true)
        pushLine('m', body)
        if (sg.length) setSuggests(sg)
        aiHistoryRef.current.push({ role: 'user', content: q }, { role: 'assistant', content: body })
      })
      .catch((e) => { setBusy(true); pushLine('m', `未能接通 AI（${explainAiError(e)}）——稍后再试。`) })
      .finally(() => { setThinking(false); scroll() })
  }

  return (
    <>
      <div className="chat-scroll">
        <div className="replay-head card-msg" style={{ marginLeft: 0 }}>
          <div className="card-title">{record.type} · {record.title}</div>
          <div className="card-sub">{record.date} ｜ {record.summary}</div>
        </div>
        <div className="chat-replay">
          {replay.length === 0 && <div className="replay-divider">这条记录较早，未存下对话</div>}
          {replay.map((l, i) => (
            l.r === 'u'
              ? <UserMsg key={i}>{l.t}</UserMsg>
              : <MasterMsg key={i} segments={[l.t]} done />
          ))}
          {(replay.length > 0 || record.gua) && <div className="replay-divider">— 以上为当时对话{record.gua ? '，可接着问' : ''} —</div>}
        </div>
        {liveItems.map((it) => (
          it.r === 'u'
            ? <UserMsg key={it.id}>{it.t}</UserMsg>
            : <MasterMsg key={it.id} segments={[it.t]} onDone={() => { setBusy(false); scroll() }} />
        ))}
        {thinking && (
          <div className="msg-row fade-in">
            <div className="msg-bubble typing" style={{ marginLeft: 44 }}>老朽正在回想此卦<span className="caret">▌</span></div>
          </div>
        )}
        {!busy && !thinking && suggests.length > 0 && <Chips ghost items={suggests} onPick={ask} />}
        <div ref={bottomRef} />
      </div>
      {record.gua && <InputBar placeholder="就这一卦，接着问…" onSend={ask} />}
    </>
  )
}
