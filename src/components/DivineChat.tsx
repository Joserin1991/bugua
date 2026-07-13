// 六爻占卜 · 对话流：默念所问 → 摇卦六次（步进/爻列表） → 本卦/变卦/互卦 + 吉凶/概率/时机 → 追问
import { fx } from '../lib/fx'
import { useRef, useState, type ReactNode } from 'react'
import { buildResult, hexUnicode, tossOnce, YAO_NAMES, type CastLine, type CastResult } from '../lib/hexagram'
import { interpretOracle, detectCategory, type OracleCategory } from '../lib/interpret'
import type { HexagramInfo } from '../data/hexagrams'
import { saveRecord, updateRecordChat, type ChatLine } from '../lib/records'
import { MasterMsg, UserMsg, CardMsg, Chips, EnsoRing, InputBar } from './ChatUI'
import { loadAiConfig, buildGuaSystem, parseSuggestReply, askMasterRetry, explainAiError, type ChatTurn, type GuaInfo } from '../lib/ai'
import { YAO_NAMES as YAO_NAMES_AI } from '../lib/hexagram'

// 卦象 → AI 上下文
export function guaInfoOf(cast: CastResult, method: '六爻摇卦' | '梅花易数'): GuaInfo {
  return {
    originalName: cast.original.fullName,
    originalCi: cast.original.guaci,
    originalBrief: cast.original.brief,
    originalOverall: cast.original.overall,
    changedName: cast.changed?.fullName,
    changedOverall: cast.changed?.overall,
    mutualName: cast.mutual.fullName,
    mutualBrief: cast.mutual.brief,
    movingYao: cast.changingIndexes.map((i) => YAO_NAMES_AI[i]).join('、') || '无',
    method,
  }
}

type NewItem =
  | { kind: 'master'; segs: ReactNode[] }
  | { kind: 'user'; text: string }
  | { kind: 'node'; node: ReactNode }

type Item = NewItem & { id: number }

let uid = 10000

const YAO_VAL_NAME: Record<number, string> = { 6: '老阴 ✕', 7: '少阳', 8: '少阴', 9: '老阳 ○' }

export function DivineChat() {
  const [items, setItems] = useState<Item[]>(() => [{
    id: uid++,
    kind: 'master',
    segs: ['请静心，默念你要问的事。', '可先把问题告诉老朽（在下方输入），也可直接摇卦——心诚则灵。'],
  }])
  const [busy, setBusy] = useState(true)
  const [question, setQuestion] = useState('')
  const [castDone, setCastDone] = useState<CastResult | null>(null)
  const [tossOpen, setTossOpen] = useState(false)
  const [aiThinking, setAiThinking] = useState(false)
  const [aiSuggests, setAiSuggests] = useState<string[]>([])
  const aiHistoryRef = useRef<ChatTurn[]>([])
  const aiSystemRef = useRef<string>('')
  const bottomRef = useRef<HTMLDivElement>(null)
  const castRef = useRef<CastResult | null>(null)
  castRef.current = castDone

  // 卦事 AI 问答（带上下文；失败明示）
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

  const startToss = () => {
    if (tossOpen) return
    setTossOpen(true)
    master(['好。老朽以三枚铜钱代蓍，你来摇——每点一次，掷出一爻，自下而上，六掷成卦。'])
    node(<TossCard onDone={onCastDone} />)
  }

  const onCastDone = (lines: CastLine[]) => {
    const result = buildResult(lines)
    setCastDone(result)
    const q = question || '心中所念之事'
    const cat = detectCategory(question || '综合运势')
    const reading = interpretOracle(result, q, cat)
    log('m', `〔卦象卡〕本卦 ${result.original.fullName}${result.changed ? `，动爻${result.changingIndexes.length}处，变卦 ${result.changed.fullName}` : '，六爻安静'}；互卦 ${result.mutual.fullName}。`)
    recordIdRef.current = saveRecord({
      type: '六爻问事',
      title: `问：${q.slice(0, 18)}`,
      summary: `本卦 ${result.original.fullName}${result.changed ? ` · 变 ${result.changed.fullName}` : ''} · ${reading.luckLabel}`,
      chat: chatLogRef.current,
      gua: { info: guaInfoOf(result, '六爻摇卦'), question: q, category: cat },
    })
    master([`卦象已成，来看本卦——${result.original.fullName}。${result.original.brief}。`])
    node(<GuaCard result={result} question={q} category={cat} />)
    aiSystemRef.current = buildGuaSystem(guaInfoOf(result, '六爻摇卦'), q, cat)
    aiHistoryRef.current = []
    const usedAi = aiAnswer(`【系统指令】卦刚起好，卦象卡已展示。请就命主所问「${q}」解此卦（150~200字）：本卦定基调、动爻与变卦看走向，给出明确倾向与行动叮嘱。`, false)
    if (!usedAi) master(['卦已解毕。若想就此卦再问一事，点下方追问；或重新摇一卦。'])
  }

  const followUps = castDone
    ? [...(aiSuggests.length ? aiSuggests : ['事业上如何？', '感情上如何？', '财运上如何？']), '重新摇卦']
    : []

  const onFollow = (v: string) => {
    if (v === '重新摇卦') {
      user('重新摇一卦。')
      setAiSuggests([])
      aiSystemRef.current = ''
      setCastDone(null)
      setTossOpen(false)
      master(['好，收心，再默念一次所问之事。想好了便摇。'])
      node(<TossCard onDone={onCastDone} />)
      setTossOpen(true)
      return
    }
    setAiSuggests((prev) => prev.filter((x) => x !== v)) // 选过的移除，未选的保留
    if (aiAnswer(v, true)) return
    user(v)
    const cat: OracleCategory = v.includes('事业') ? '事业官运' : v.includes('感情') ? '感情姻缘' : '财运求财'
    const c = castRef.current
    if (!c) return
    const r = interpretOracle(c, question || v, cat)
    const sec = r.sections.find((s) => s.title === '就事论断')
    master([`就${cat.slice(0, 2)}论之：${sec?.text ?? ''}${r.sections.find((s) => s.title === '行动指引')?.text ?? ''}`])
  }

  const onInput = (text: string) => {
    user(text)
    if (!castDone && !tossOpen) {
      setQuestion(text)
      master([`「${text}」——好，老朽记下了。`, '静心，点下方开始摇卦。'])
      // 展示开始摇卦 chip 由 busy=false 后 chips 渲染
    } else if (castDone) {
      if (aiAnswer(text, false)) return
      const cat = detectCategory(text)
      const r = interpretOracle(castRef.current!, text, cat)
      const sec = r.sections.find((s) => s.title === '就事论断')
      master([`以本卦参之：${sec?.text ?? ''}`])
    } else {
      setQuestion(text)
      master(['老朽记下了，继续摇卦便是。'])
    }
  }

  return (
    <>
      <div className="chat-scroll">
        {items.map((it) => {
          if (it.kind === 'master') return <MasterMsg key={it.id} segments={it.segs} onDone={() => { setBusy(false); scroll() }} />
          if (it.kind === 'user') return <UserMsg key={it.id}>{it.text}</UserMsg>
          return <div key={it.id}>{it.node}</div>
        })}
        {!busy && !tossOpen && !castDone && (
          <Chips items={['开始摇卦']} onPick={() => { user('开始摇卦。'); startToss() }} />
        )}
        {aiThinking && (
          <div className="msg-row fade-in">
            <div className="msg-bubble typing" style={{ marginLeft: 44 }}>老朽正在参卦<span className="caret">▌</span></div>
          </div>
        )}
        {!busy && !aiThinking && castDone && <Chips items={followUps} onPick={onFollow} />}
        <div ref={bottomRef} />
      </div>
      <InputBar placeholder="有什么想问的吗？" onSend={onInput} />
    </>
  )
}

// ---------- 摇卦卡（六次点击，步进+爻列表） ----------
function TossCard({ onDone }: { onDone: (lines: CastLine[]) => void }) {
  const [lines, setLines] = useState<CastLine[]>([])
  const [tossing, setTossing] = useState(false)
  const [coins, setCoins] = useState<boolean[]>([true, false, true])
  const doneRef = useRef(false)

  const toss = () => {
    if (tossing || lines.length >= 6 || doneRef.current) return
    setTossing(true)
    setTimeout(() => {
      const line = tossOnce()
      setCoins(line.coins)
      const next = [...lines, line]
      setLines(next)
      setTossing(false)
      if (next.length === 6 && !doneRef.current) {
        doneRef.current = true
        setTimeout(() => onDone(next), 600)
      }
    }, 1100)
  }

  return (
    <CardMsg title="起卦中" sub={`第 ${Math.min(6, lines.length + (tossing ? 1 : 0) || 1)} 次掷币 · 共六次`}>
      <div className="yao-steps">
        {[1, 2, 3, 4, 5, 6].map((n, i) => (
          <span key={n} style={{ display: 'flex', alignItems: 'center', gap: 6 }}>
            <span className={`yao-step ${lines.length >= n ? 'done' : lines.length + 1 === n ? 'now' : ''}`}>{n}</span>
            {i < 5 && <span className="yao-step-line" />}
          </span>
        ))}
      </div>
      <div className="coins-stage">
        <div className="coins-in-enso">
          <EnsoRing size={190} className={tossing ? 'enso-rotate' : ''} stroke={7} />
          <div className="coins-tri">
            {[0, 1, 2].map((i) => (
              <div key={i} className={`coin coin-img ${tossing ? 'tossing' : ''} ${!tossing && !coins[i] ? 'tail' : ''}`} style={{ animationDelay: `${i * 0.1}s`, backgroundImage: `url(${fx(!tossing && !coins[i] ? 'coin-back.png' : 'coin-front.png')})` }}>
                <span className="hole" />
                <span>{tossing ? '' : coins[i] ? '字' : '背'}</span>
              </div>
            ))}
          </div>
        </div>
        {lines.length < 6 ? (
          <button className="chip chip-seal" onClick={toss} disabled={tossing}>
            {tossing ? '铜钱旋舞…' : lines.length === 0 ? '摇第一爻' : `摇第${['', '一', '二', '三', '四', '五', '六'][lines.length + 1]}爻`}
          </button>
        ) : (
          <span className="toss-caption">六爻已备 · 卦象将成</span>
        )}
      </div>
      {lines.length > 0 && (
        <div className="yao-list">
          {[5, 4, 3, 2, 1, 0].map((i) => {
            const l = lines[i]
            return (
              <div key={i} className={`yao-line-row ${l?.changing ? 'changing' : ''}`}>
                <span>{YAO_NAMES[i]}</span>
                {l ? (
                  <span className={`glyph ${l.yang ? 'yang' : 'yin'}`}>
                    <span className="b" style={{ width: l.yang ? '100%' : '44%' }} />
                    {!l.yang && <span className="b" style={{ width: '44%' }} />}
                  </span>
                ) : <span className="pending" />}
                <span className="yl-val">{l ? YAO_VAL_NAME[l.value] : ''}</span>
              </div>
            )
          })}
        </div>
      )}
    </CardMsg>
  )
}

// ---------- 卦象卡（本卦/变卦/互卦 tabs + 徽章） ----------
export function GuaCard({ result, question, category }: { result: CastResult; question: string; category: OracleCategory }) {
  const [tab, setTab] = useState<'本卦' | '变卦' | '互卦'>('本卦')
  const reading = interpretOracle(result, question, category)
  const hex: HexagramInfo | null = tab === '本卦' ? result.original : tab === '变卦' ? result.changed : result.mutual
  const luckAvg = result.changed ? (result.original.luck + result.changed.luck) / 2 : result.original.luck
  const prob = Math.round(28 + luckAvg * 13)
  const timing = result.changingIndexes.length >= 3
    ? '变数尚多 · 宜再观望'
    : luckAvg >= 4 ? '近期即有眉目' : luckAvg >= 3 ? '一两月内见分晓' : '宜缓 · 时机未熟'
  return (
    <CardMsg>
      <div className="gua-tabs">
        {(['本卦', '变卦', '互卦'] as const).map((t) => (
          <button
            key={t}
            className={`gua-tab ${tab === t ? 'active' : ''}`}
            onClick={() => setTab(t)}
            disabled={t === '变卦' && !result.changed}
            style={t === '变卦' && !result.changed ? { opacity: 0.35 } : undefined}
          >
            {t}
          </button>
        ))}
      </div>
      {hex ? (
        <div className="gua-figure-block">
          <div className="gf-name">{hex.fullName}</div>
          <div className="gf-symbol">{hexUnicode(hex)}</div>
          <div className="gf-ci">「{hex.guaci}」</div>
          <p className="gf-text">
            {tab === '本卦' && hex.overall}
            {tab === '变卦' && `${result.changingIndexes.map((i) => YAO_NAMES[i]).join('、')}发动，事态走向：${hex.overall}`}
            {tab === '互卦' && `互卦观中程：${hex.overall}`}
          </p>
        </div>
      ) : (
        <p className="center-note">六爻安静，无变卦——以本卦断之。</p>
      )}
      <div className="badge-rows">
        <div className="badge-row"><span className="badge-key">宜</span><span className="badge-val">{result.original.advice.split('；')[0]}。</span></div>
        <div className="badge-row ji"><span className="badge-key">忌</span><span className="badge-val">{luckAvg >= 3.5 ? '得意忘形，乐极生变' : '急于求成，冒进强求'}。</span></div>
        <div className="badge-row"><span className="badge-key">断</span><span className="badge-val">{reading.sections.find((s) => s.title === '就事论断')?.text}</span></div>
      </div>
      <div className="stat-badges">
        <span className="stat-badge">吉凶<b>{reading.luckLabel}</b></span>
        <span className="stat-badge">成事概率<b>{prob}%</b></span>
        <span className="stat-badge">时机<b>{timing}</b></span>
      </div>
    </CardMsg>
  )
}
