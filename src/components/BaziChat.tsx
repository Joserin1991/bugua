// 问命排盘 · 对话流：问性别/生日/时辰 → 推演进度墨圈 → 四柱卡+命盘 → 胶囊追问逐题细解
import { fx } from '../lib/fx'
import { useEffect, useMemo, useRef, useState, type ReactNode } from 'react'
import { computeBazi, liuNianRange, type BaziChart, type LiuNian } from '../lib/bazi'
import { computeZiwei, type ZwChart } from '../lib/ziwei'
import { interpretBazi, interpretLiuNian, type BaziReading } from '../lib/interpret'
import { tenGod } from '../lib/wuxing'
import { saveRecord, updateRecordChat, type ChatLine } from '../lib/records'
import { MasterMsg, UserMsg, CardMsg, Chips, InputBar, InkArt } from './ChatUI'
import { CITIES } from '../lib/cities'
import { traceNarrative } from '../lib/trace'
import { loadAiConfig, buildMasterSystem, askMasterRetry, askIntake, explainAiError, type ChatTurn } from '../lib/ai'
import { profileId, touchProfile, appendHistory, addMemory, listProfiles } from '../lib/profiles'
import { liuYueOf, liuRiOf, type LiuYue } from '../lib/liuyue'
import { ReportView } from './ReportView'
import { sanpan } from '../lib/sanpan'
import { SanpanCard } from './SanpanCard'
import { PillarCards, WuxingPctBars, Radar, wuxingRadarData, abilityRadarData, TenGodOrbit, TenGodBars, DayunLineChart, dayunScore } from './InfoGraphics'
import { ProTable, ChartMeta, ShenshaSection, WheelSection, ReadingSections } from './ChartSections'
import { ZiweiChart } from './ZiweiChart'
import { Term } from './Master'

const HOUR_OPTIONS = [
  { v: 0, label: '深夜 23:00–00:59（早子时）' }, { v: 1, label: '凌晨 01:00–02:59（丑时）' },
  { v: 3, label: '凌晨 03:00–04:59（寅时）' }, { v: 5, label: '清晨 05:00–06:59（卯时）' },
  { v: 7, label: '早上 07:00–08:59（辰时）' }, { v: 9, label: '上午 09:00–10:59（巳时）' },
  { v: 11, label: '中午 11:00–12:59（午时）' }, { v: 13, label: '下午 13:00–14:59（未时）' },
  { v: 15, label: '下午 15:00–16:59（申时）' }, { v: 17, label: '傍晚 17:00–18:59（酉时）' },
  { v: 19, label: '晚上 19:00–20:59（戌时）' }, { v: 21, label: '夜里 21:00–22:59（亥时）' },
  { v: 23, label: '深夜 23:00–23:59（晚子时）' },
]

type NewItem =
  | { kind: 'master'; segs: ReactNode[] }
  | { kind: 'user'; text: string }
  | { kind: 'node'; node: ReactNode }

type Item = NewItem & { id: number }

type Stage = 'gather' | 'computing' | 'ready'

const TOPIC_KEYS = ['三盘合参', '五行分析', '十神关系', '大运走势', '流年运势', '事业运势', '财运走势', '感情运势', '健康提点', '神煞照命', '专业细盘', '紫微星盘', '命理总断'] as const
// 「推演解说」不上胶囊栏：推理链留在引擎内部，用户问起时由大师口述带过
type Topic = typeof TOPIC_KEYS[number] | '推演解说'

function detectTopic(text: string): Topic | null {
  const rules: [Topic, RegExp][] = [
    ['感情运势', /(感情|恋爱|婚|对象|桃花|脱单|喜欢|复合)/],
    ['事业运势', /(事业|工作|升职|跳槽|职|创业|面试|老板)/],
    ['财运走势', /(财|钱|收入|投资|生意|买卖)/],
    ['健康提点', /(健康|身体|病|养生)/],
    ['大运走势', /(大运)/],
    ['流年运势', /(流年|今年|明年|运势)/],
    ['五行分析', /(五行|喜用|缺什么)/],
    ['三盘合参', /(合参|三盘|印证|交叉|准不准|靠谱)/],
    ['推演解说', /(怎么算|为什么|推演|依据|凭什么|原理)/],
    ['十神关系', /(十神)/],
    ['神煞照命', /(神煞|贵人|桃花星|驿马)/],
    ['紫微星盘', /(紫微|星盘|斗数)/],
    ['专业细盘', /(细盘|排盘表|藏干|纳音|空亡)/],
    ['命理总断', /(总断|整体|性格|命怎么样|格局)/],
  ]
  for (const [t, re] of rules) if (re.test(text)) return t
  return null
}

// 解析 AI 回复协议：正文 + 「卡片：XXX」 + 「卡注：朱批」 + 「建议：问A｜问B｜问C」 + 「记档：…」
function parseAiReply(raw: string): { body: string; card: Topic | null; note: string; suggests: string[]; memo: string } {
  let body = raw.trim()
  let card: Topic | null = null
  let note = ''
  let memo = ''
  const suggests: string[] = []
  const cardM = body.match(/^卡片[：:]\s*(.+)$/m)
  if (cardM) {
    const t = cardM[1].trim()
    if ((TOPIC_KEYS as readonly string[]).includes(t)) card = t as Topic
    body = body.replace(cardM[0], '').trim()
  }
  const noteM = body.match(/^卡注[：:]\s*(.+)$/m)
  if (noteM) { note = noteM[1].trim(); body = body.replace(noteM[0], '').trim() }
  const memoM = body.match(/^记档[：:]\s*(.+)$/m)
  if (memoM) { memo = memoM[1].trim(); body = body.replace(memoM[0], '').trim() }
  const sugM = body.match(/^建议[：:]\s*(.+)$/m)
  if (sugM) {
    suggests.push(...sugM[1].split(/[|｜、；;]/).map((x) => x.trim()).filter(Boolean).slice(0, 4))
    body = body.replace(sugM[0], '').trim()
  }
  return { body, card, note, suggests, memo }
}

// AI 解读正文：印在卡片顶部（图表之上）
function aiProseNode(body: string): ReactNode {
  if (!body) return null
  return (
    <div className="ai-on-card top">
      {body.split(/\n+/).filter(Boolean).map((t, i) => <p className="reading-p" key={i}>{t}</p>)}
    </div>
  )
}

// AI 朱批：印在卡片底部
function aiZhupiNode(note: string): ReactNode {
  if (!note) return null
  return <div className="card-zhupi">批：{note}</div>
}

// ---------- 生辰自由文本解析 ----------
interface BirthDraft { gender?: '男' | '女'; date?: string; hour?: number; cityIdx?: number | null }

const CN_NUM: Record<string, number> = { 一: 1, 二: 2, 两: 2, 三: 3, 四: 4, 五: 5, 六: 6, 七: 7, 八: 8, 九: 9, 十: 10 }
function cnToNum(t: string): number | undefined {
  if (/^\d+$/.test(t)) return Number(t)
  if (CN_NUM[t] != null) return CN_NUM[t]
  const m = t.match(/^十([一二])$/)
  if (m) return 10 + CN_NUM[m[1]]
  const m2 = t.match(/^([一二两三四五六七八九])?十([一二三四五六七八九])?$/)
  if (m2) return (m2[1] ? CN_NUM[m2[1]] : 1) * 10 + (m2[2] ? CN_NUM[m2[2]] : 0)
  return undefined
}

const ZHI_HOUR: Record<string, number> = { 子: 23, 丑: 1, 寅: 3, 卯: 5, 辰: 7, 巳: 9, 午: 11, 未: 13, 申: 15, 酉: 17, 戌: 19, 亥: 21 }

// 钟点 → HOUR_OPTIONS 档位
function hourToOption(h: number): number {
  if (h >= 23) return 23
  if (h <= 0) return 0
  return h % 2 === 1 ? h : h - 1
}

function parseBirthText(text: string, draft: BirthDraft) {
  if (/女/.test(text)) draft.gender = '女'
  else if (/男/.test(text)) draft.gender = '男'
  const dm = text.match(/((?:19|20)\d{2})\s*[年.\-\/]\s*(\d{1,2})\s*[月.\-\/]\s*(\d{1,2})/)
  if (dm) {
    const y = Number(dm[1]); const mo = Number(dm[2]); const dd = Number(dm[3])
    if (mo >= 1 && mo <= 12 && dd >= 1 && dd <= 31) draft.date = `${y}-${String(mo).padStart(2, '0')}-${String(dd).padStart(2, '0')}`
  }
  const zm = text.match(/([子丑寅卯辰巳午未申酉戌亥])[时時]/)
  if (zm) draft.hour = ZHI_HOUR[zm[1]]
  const hm = text.match(/([\d一二两三四五六七八九十]{1,3})\s*[点點]/)
  if (hm) {
    let h = cnToNum(hm[1])
    if (h != null) {
      if (/(下午|傍晚|晚上|夜里|晚间)/.test(text) && h < 12) h += 12
      if (/凌晨/.test(text) && h >= 12) h -= 12
      if (h === 24) h = 0
      if (h >= 0 && h <= 23) draft.hour = hourToOption(h)
    }
  }
  if (draft.hour == null) {
    if (/(中午|正午)/.test(text)) draft.hour = 11
    else if (/(清晨|拂晓)/.test(text)) draft.hour = 5
    else if (/上午/.test(text)) draft.hour = 9
    else if (/(早上|早晨)/.test(text)) draft.hour = 7
    else if (/(傍晚|黄昏)/.test(text)) draft.hour = 17
    else if (/(深夜|半夜)/.test(text)) draft.hour = 23
  }
  const ci = CITIES.findIndex((ct) => text.includes(ct.name))
  if (ci >= 0) draft.cityIdx = ci
  else if (draft.cityIdx === undefined && /(跳过|不知道|不清楚|记不清|不记得)/.test(text)) draft.cityIdx = null
}

let uid = 1

// 档案ID → 生辰草稿（id 格式：性别|日期|时辰|城市）
function draftFromPid(pid: string): BirthDraft | null {
  const [g, d, h, city] = pid.split('|')
  if ((g !== '男' && g !== '女') || !d || h === undefined) return null
  const ci = city ? CITIES.findIndex((c) => c.name === city) : -1
  return { gender: g, date: d, hour: Number(h), cityIdx: ci >= 0 ? ci : null }
}

export function BaziChat({ resumePid = null }: { resumePid?: string | null }) {
  const [items, setItems] = useState<Item[]>([])
  const [stage, setStage] = useState<Stage>('gather')
  const [busy, setBusy] = useState(true) // 大师打字中
  const draftRef = useRef<BirthDraft>({})
  const lastAskRef = useRef<'gender' | 'date' | 'hour' | 'city' | null>(null)
  const [pct, setPct] = useState(0)
  const [chart, setChart] = useState<BaziChart | null>(null)
  const [visited, setVisited] = useState<Topic[]>([])
  const bottomRef = useRef<HTMLDivElement>(null)
  const chartRef = useRef<BaziChart | null>(null)
  const readingRef = useRef<BaziReading | null>(null)
  const ziweiRef = useRef<ZwChart | null>(null)
  const birthRef = useRef<Date | null>(null)
  const aiHistoryRef = useRef<ChatTurn[]>([])
  const profileIdRef = useRef<string>('')
  const aiSystemRef = useRef<string>('')
  const [aiThinking, setAiThinking] = useState(false)
  const [aiSuggests, setAiSuggests] = useState<string[]>([])
  const [showReport, setShowReport] = useState(false)

  const reading = useMemo(() => (chart ? interpretBazi(chart) : null), [chart])
  chartRef.current = chart
  readingRef.current = reading

  const scroll = () => setTimeout(() => bottomRef.current?.scrollIntoView({ behavior: 'smooth', block: 'end' }), 100)

  const push = (item: NewItem) => {
    setItems((arr) => [...arr, { ...item, id: uid++ }])
    scroll()
  }
  // 对话全程记档：随聊随存进当条记录
  const chatLogRef = useRef<ChatLine[]>([])
  const recordIdRef = useRef<string | null>(null)
  const log = (r: 'm' | 'u', t: string) => {
    if (!t) return
    chatLogRef.current.push({ r, t })
    if (recordIdRef.current) updateRecordChat(recordIdRef.current, chatLogRef.current)
  }
  const master = (segs: ReactNode[]) => { setBusy(true); push({ kind: 'master', segs }); log('m', segs.filter((x) => typeof x === 'string').join('')) }
  // 时序：大师话音（打字机）落定 → 「布盘」转圈动效 → 卡片研墨显形
  const pendingCardsRef = useRef<ReactNode[]>([])
  const [cardCasting, setCardCasting] = useState(false)
  const masterThenCard = (segs: ReactNode[], ...cards: (ReactNode | null)[]) => {
    pendingCardsRef.current.push(...cards.filter(Boolean))
    master(segs)
  }
  const user = (text: string) => { push({ kind: 'user', text }); log('u', text) }
  const node = (n: ReactNode) => push({ kind: 'node', node: n })

  const archives = useMemo(() => listProfiles(3), [])

  const bootRef = useRef(false)
  useEffect(() => {
    if (bootRef.current) return // StrictMode 双跑守卫，防止重复起盘/重复记录
    bootRef.current = true
    if (resumePid) {
      const d = draftFromPid(resumePid)
      if (d) {
        draftRef.current = d
        master(['稍候，老朽把你的旧盘从柜里取出来——上回聊到哪儿，咱们接着说。'])
        setTimeout(() => startCompute(), 600)
        return
      }
    }
    master([
      '世间万象，皆有其时。',
      '既然你想了解自己，把出生信息一并说与老朽——是男是女、哪年哪月哪日（阳历）、大概几点、生在哪座城市。',
      '例如：「女，1991年11月2日上午10点，杭州」。缺哪样，老朽再单问。',
      ...(archives.length ? ['若是旧相识，点下方档案即可取旧盘续问。'] : []),
    ])
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [])

  // ---------- 起盘（对话式收集） ----------
  const askMissing = () => {
    const d = draftRef.current
    if (!d.gender) { lastAskRef.current = 'gender'; master(['所测是男命，还是女命？']); return }
    if (!d.date) { lastAskRef.current = 'date'; master(['出生的年月日是？如「1991年11月2日」（阳历即可，农历节气老朽自会换算）。']); return }
    if (d.hour == null) { lastAskRef.current = 'hour'; master(['几点钟出生？大概时段亦可——如「上午十点」「下午两点」「戌时」。']); return }
    if (d.cityIdx === undefined) { lastAskRef.current = 'city'; master(['最后一问：生在哪座城市？老朽按当地真太阳时给你校时——记不清说「跳过」。']); return }
    lastAskRef.current = null
    startCompute()
  }

  const intakeHistoryRef = useRef<ChatTurn[]>([])
  const [intakeThinking, setIntakeThinking] = useState(false)

  const handleGather = (text: string) => {
    user(text)
    const d = draftRef.current
    // 先离线正则预填（快、稳，也给 AI 兜底）
    parseBirthText(text, d)
    const cfg = loadAiConfig()
    if (!cfg) {
      if (lastAskRef.current === 'city' && d.cityIdx === undefined) d.cityIdx = null
      askMissing()
      return
    }
    // AI 接引：自然对话 + 结构化抽取
    setIntakeThinking(true)
    Promise.all([
      askIntake(cfg, intakeHistoryRef.current.slice(-8), text),
      new Promise((res) => setTimeout(res, 700)),
    ])
      .then(([ex]) => {
        if (ex.gender) d.gender = ex.gender
        if (ex.date) d.date = ex.date
        if (ex.hour != null) d.hour = hourToOption(ex.hour)
        if (ex.city) {
          const i = CITIES.findIndex((c) => ex.city!.includes(c.name) || c.name.includes(ex.city!))
          if (i >= 0) d.cityIdx = i
        } else if (ex.citySkipped) {
          d.cityIdx = null
        }
        intakeHistoryRef.current.push({ role: 'user', content: text }, { role: 'assistant', content: ex.reply })
        const haveEssentials = !!d.gender && !!d.date && d.hour != null
        const cityResolved = d.cityIdx !== undefined
        if (haveEssentials && cityResolved) {
          master([ex.reply || '都齐了，老朽这就为你排盘。'])
          startCompute()
        } else {
          master([ex.reply || '好，老朽记下了，还差一点。'])
        }
      })
      .catch(() => {
        // AI 不通 → 回落规则问答（正则已预填部分）
        if (lastAskRef.current === 'city' && d.cityIdx === undefined) d.cityIdx = null
        askMissing()
      })
      .finally(() => { setIntakeThinking(false); scroll() })
  }

  const startCompute = () => {
    const draft = draftRef.current
    const gender = draft.gender!
    const date = draft.date!
    const hour = draft.hour!
    const city = draft.cityIdx != null && draft.cityIdx >= 0 ? CITIES[draft.cityIdx] : null
    const hourLabel = HOUR_OPTIONS.find((o) => o.v === hour)?.label.split('（')[0] ?? ''
    master([`听全了——${gender}命，${date.replace(/-0?/g, '/').replace('/', '年').replace('/', '月')}日，${hourLabel}，${city ? city.name : '出生地未知'}。`, '正在为你排演，请稍候片刻。'])
    setStage('computing')
    const [y, m, d] = date.split('-').map(Number)
    // 用时辰中点作钟表时刻，交由引擎做真太阳时校正
    const clockH = hour === 0 ? 0 : hour === 23 ? 23 : hour + 1
    const clockM = (hour === 0 || hour === 23) ? 30 : 0
    const c = computeBazi(y, m, d, clockH, clockM, gender, city)
    let zw: ZwChart | null = null
    try { zw = computeZiwei(y, m, d, hour, gender) } catch { /* 忽略 */ }
    ziweiRef.current = zw
    birthRef.current = new Date(y, m - 1, d, clockH, clockM)
    // 命主档案：同一生辰再来，接上旧话
    const pid = profileId(gender, date, hour, city?.name ?? null)
    profileIdRef.current = pid
    const prof = touchProfile(pid, `${gender === '男' ? '乾造' : '坤造'} ${c.solarText}`)
    const returning = prof.visits > 1 && (prof.history.length > 0 || prof.memories.length > 0)
    if (returning) aiHistoryRef.current = prof.history.slice(-10)
    aiSystemRef.current = buildMasterSystem(c, zw, prof.memories, returning)
    // 进度动画
    let p = 0
    const timer = setInterval(() => {
      p += 3 + Math.random() * 7
      setPct(Math.min(99, p))
      if (p >= 100) {
        clearInterval(timer)
        setChart(c)
        revealChart(c)
      }
    }, 110)
  }

  const revealChart = (c: BaziChart) => {
    setStage('ready')
    setPct(0)
    const r = interpretBazi(c)
    log('m', `〔命盘卡〕${c.gender === '男' ? '乾造' : '坤造'} ${c.solarText}，四柱 ${c.pillars.map((pl) => pl.gan + pl.zhi).join(' ')}，日主${c.dayGan}${c.dayGanWx}·${c.strength.level}。`)
    recordIdRef.current = saveRecord({
      type: '八字排盘',
      title: `${c.gender === '男' ? '乾造' : '坤造'} ${c.solarText}`,
      summary: `日主${c.dayGan}${c.dayGanWx} · ${c.strength.level} · 喜${c.favorable.join('')}`,
      pid: profileIdRef.current,
      chat: chatLogRef.current,
    })
    // 续盘：把上回对话可见地回放在命盘卡之前
    if (resumePid && aiHistoryRef.current.length) {
      node(
        <div className="chat-replay">
          <div className="replay-divider">— 上回聊到 —</div>
          {aiHistoryRef.current.slice(-8).map((t, i) => (
            t.role === 'user'
              ? <UserMsg key={i}>{t.content}</UserMsg>
              : <MasterMsg key={i} segments={[t.content]} done />
          ))}
          <div className="replay-divider">— 接着说 —</div>
        </div>,
      )
    }
    node(
      <CardMsg title="四柱八字" sub={`${c.solarCorrection ? `真太阳时 ${c.solarCorrection.trueText}（${c.solarCorrection.city} ${c.solarCorrection.offsetMin > 0 ? '+' : ''}${c.solarCorrection.offsetMin} 分）｜ ` : ''}农历 ${c.lunarText} ｜ 属${c.animal}`}>
        <PillarCards chart={c} />
        <div className="divider-ink" />
        <WheelSection chart={c} activeLn={currentLn(c)} />
        <ChartMeta chart={c} />
      </CardMsg>,
    )
    const isReturning = aiHistoryRef.current.length > 0
    const fallbackOpening: ReactNode[] = [
      isReturning ? '又见面了——上回的盘老朽还留着底。' : '',
      `你的命盘排好了。日元${c.dayGan}${c.dayGanWx}，生于${c.pillars[1].zhi}月，日主${c.strength.level}，喜`,
      <Term key="t" k="喜用神">{`${c.favorable.join('、')}`}</Term>,
      `。${r.geju.split('。')[2] ?? ''}。`,
      '八字、紫微、卦象三盘老朽都替你起好了——点「三盘合参」可看它们是否互相印证。想先了解哪方面？',
    ]
    const cfg = loadAiConfig()
    if (cfg && aiSystemRef.current) {
      setAiThinking(true)
      Promise.all([
        askMasterRetry(cfg, aiSystemRef.current, aiHistoryRef.current.slice(-6), `【系统指令】命主的命盘刚排好，四柱盘卡已展示在界面上。${aiHistoryRef.current.length ? '这位是回头客（档案见系统提示），开场先自然接上旧话，再点盘。' : ''}请作开场解读（180~260字）：报出四柱，点出日主旺衰与格局的关键（引用具体柱位，如「月干戊土食神透出」），用一两句白话讲他的性子，最后请命主说说近来的境况或最挂心的事。`),
        new Promise((res) => setTimeout(res, 900)),
      ])
        .then(([reply]) => {
          const body = applyChatReply(reply as string)
          aiHistoryRef.current.push({ role: 'assistant', content: body })
          if (profileIdRef.current) appendHistory(profileIdRef.current, [{ role: 'assistant', content: body }])
        })
        .catch((e) => master([`网络一时未通（${explainAiError(e)}）——先以本地古法为你开场；稍后随便再发一句，接通即为 AI 详解。`, ...fallbackOpening]))
        .finally(() => { setAiThinking(false); scroll() })
    } else {
      master(fallbackOpening)
    }
  }

  const currentLn = (c: BaziChart): LiuNian | null => {
    const y = new Date().getFullYear()
    return liuNianRange(y, 1, c.dayGan)[0] ?? null
  }

  // ---------- 话题 ----------
  // 每张盘卡的数据摘要：交给 AI，让它对着卡上的字解读
  const topicDigest = (topic: Topic): string => {
    const c = chartRef.current!
    const cur = new Date().getFullYear()
    switch (topic) {
      case '流年运势': {
        const years = liuNianRange(cur - 1, 6, c.dayGan)
        return `流年卡展示六年：${years.map((l) => `${l.year}年${l.ganZhi}(流年${l.god}${l.year === cur ? '·今年·命盘红针所指' : ''})`).join('、')}`
      }
      case '大运走势':
        return `大运卡展示八步（虚岁）：${c.daYun.slice(0, 8).map((d) => `${d.startAge}岁起${d.ganZhi}(${d.god}${cur >= d.startYear && cur <= d.endYear ? '·现行' : ''})`).join('、')}；${c.qiYunText}`
      case '五行分析':
        return `五行条形与雷达数据：${(Object.entries(c.wuxingCount) as [string, number][]).map(([w, n]) => `${w}${n}分`).join('、')}；喜用${c.favorable.join('、')}，忌${c.unfavorable.join('、')}`
      case '十神关系': {
        const all = c.pillars.flatMap((pp) => [pp.ganGod, ...pp.cangGan.map((g) => g.god)]).filter((g) => g !== '日元')
        const uniq = [...new Set(all)]
        const ALL = ['比肩', '劫财', '食神', '伤官', '正财', '偏财', '正官', '七杀', '正印', '偏印']
        const missing = ALL.filter((g) => !uniq.includes(g))
        return `十神环绕图：命中所有——${uniq.join('、')}；未见——${missing.join('、') || '无'}；今年流年${currentLn(c)?.god ?? ''}为红圈当值`
      }
      case '三盘合参': {
        const sp = sanpan(c, ziweiRef.current, birthRef.current ?? new Date(2000, 0, 1))
        return `合参卡四维结论：${sp.dims.map((d) => `${d.key}(${d.verdicts.map((v) => v.system + v.stance).join('/')}→一致度${d.agree}·断${d.final})`).join('；')}`
      }
      case '神煞照命':
        return `神煞卡：${c.shenSha.map((x) => `${x.where}${x.name}`).join('、') || '无神煞'}`
      case '紫微星盘': {
        const zw = ziweiRef.current
        if (!zw) return ''
        const hua = zw.palaces.flatMap((pp) => [...pp.majorStars, ...pp.minorStars].filter((st) => st.mutagen).map((st) => `${st.name}化${st.mutagen}在${pp.name}`))
        return `紫微盘：${zw.fiveElementsClass}，命宫${zw.soulZhi}（${zw.palaces.find((pp) => pp.name.includes('命'))?.majorStars.map((st) => st.name).join('、') || '无主星'}），命主${zw.soul}身主${zw.body}；四化：${hua.join('、')}`
      }
      case '专业细盘':
        return `细盘表：四柱${c.pillars.map((pp) => pp.gan + pp.zhi).join('、')}，各柱纳音${c.pillars.map((pp) => pp.naYin).join('、')}；含藏干/星运/自坐/空亡/神煞行`
      case '事业运势':
        return `事业五维雷达：${abilityRadarData(c).map((d2) => `${d2.label}${Math.round(d2.value)}`).join('、')}`
      default:
        return ''
    }
  }

  // 各话题的固定开场白与盘面卡（AI 模式下开场白仅作断网保底）
  const buildTopicView = (topic: Topic, ai = false, aiProse: ReactNode = null, aiZhupi: ReactNode = null): { intro: ReactNode[]; card: ReactNode | null } => {
    const c = chartRef.current!
    const r = readingRef.current!
    const ln = currentLn(c)
    switch (topic) {
      case '推演解说':
        return { intro: traceNarrative(c), card: null }
      case '三盘合参': {
        const sp = sanpan(c, ziweiRef.current, birthRef.current ?? new Date(2000, 0, 1))
        return {
          intro: ['孤证不立。老朽把八字、紫微、卦象三盘并起，对事业、财帛、姻缘、康健逐一互证——三盘同断者十拿九稳，各执一词者，老朽也给你说分明。'],
          card: (
            <CardMsg title="三盘合参" sub="八字 × 紫微 × 卦象 · 交叉印证">
              <InkArt name="sanpan" height={110} />
              {aiProse}
              <SanpanCard result={sp} />
              {aiZhupi}
            </CardMsg>
          ),
        }
      }
      case '五行分析':
        return {
          intro: ['我们先看你的五行强弱。'],
          card: (
            <CardMsg title="五行能量分布">
              {aiProse}
              <WuxingPctBars chart={c} />
              <Radar data={wuxingRadarData(c)} max={100} />
              {!ai && <p className="reading-p" style={{ marginTop: 6 }}>{r.personality}</p>}
              {aiZhupi}
            </CardMsg>
          ),
        }
      case '十神关系':
        return {
          intro: ['十神者，人事之网也——贵人、财富、才华、压力，皆在此图中各居其位。红点为命中所有，红圈为今岁当值。'],
          card: (
            <CardMsg title="十神环绕 · 日主居中">
              {aiProse}
              <TenGodOrbit chart={c} activeGod={ln ? ln.god : undefined} />
              <TenGodBars chart={c} />
              <p className="center-note">点<Term k="十神">十神</Term>名可查其义</p>
              {aiZhupi}
            </CardMsg>
          ),
        }
      case '专业细盘':
        return {
          intro: ['细盘在此。地支藏干、星运自坐、空亡纳音、神煞，柱柱分明；右二列为现行大运与流年。红字皆可点问。'],
          card: (
            <CardMsg title="专业细盘">
              {aiProse}
              <ProTable chart={c} activeDayun={c.daYun.find((d) => { const y = new Date().getFullYear(); return y >= d.startYear && y <= d.endYear }) ?? c.daYun[0]} activeLn={ln} />
              {aiZhupi}
            </CardMsg>
          ),
        }
      case '大运走势':
        return { intro: [`${c.qiYunText}。大运十年一换，如行船换水道——下图便是你一生的水路起伏。`], card: <DayunCard chart={c} prose={!ai} extraTop={aiProse} extraBottom={aiZhupi} aiAsk={ai ? aiAsk : undefined} /> }
      case '流年运势':
        return { intro: ['来看你今年的流年运势。'], card: <LiunianCard chart={c} prose={!ai} extraTop={aiProse} extraBottom={aiZhupi} aiAsk={ai ? aiAsk : undefined} /> }
      case '事业运势':
        return {
          intro: ['来看你今年的事业运势。'],
          card: (
            <CardMsg title="事业五维" sub="由命局十神推得">
              <InkArt name="career" height={110} />
              {aiProse}
              <Radar data={abilityRadarData(c)} max={100} />
              {!ai && <p className="reading-p" style={{ marginTop: 4 }}>{r.career}</p>}
              {aiZhupi}
            </CardMsg>
          ),
        }
      case '财运走势':
        return {
          intro: ['财帛之事，须看财星与身强身弱相配。'],
          card: ai
            ? (aiProse ? <CardMsg title="财帛之道"><InkArt name="wealth" height={110} />{aiProse}{aiZhupi}</CardMsg> : null)
            : (
              <CardMsg title="财帛之道">
                <InkArt name="wealth" height={110} />
                <p className="reading-p">{r.wealth}</p>
              </CardMsg>
            ),
        }
      case '感情运势':
        return {
          intro: ['你的感情格局如下：'],
          card: (
            <CardMsg title="姻缘情感">
              {aiProse}
              <InkArt name="love" height={140} />
              {!ai && <p className="reading-p">{r.love}</p>}
              {aiZhupi}
            </CardMsg>
          ),
        }
      case '健康提点':
        return {
          intro: ['身体是行运的本钱，且听老朽几句提点。'],
          card: ai
            ? (aiProse ? <CardMsg title="康健养生"><InkArt name="health" height={110} />{aiProse}{aiZhupi}</CardMsg> : null)
            : (
              <CardMsg title="康健养生">
                <InkArt name="health" height={110} />
                <p className="reading-p">{r.health}</p>
              </CardMsg>
            ),
        }
      case '神煞照命':
        return {
          intro: ['你命里照着这几颗星。吉者当用，凶者知避——不必惧，是提前递给你的信儿。'],
          card: (
            <CardMsg title="神煞照命">
              {aiProse}
              <ShenshaSection chart={c} />
              {aiZhupi}
            </CardMsg>
          ),
        }
      case '紫微星盘': {
        const zw = ziweiRef.current
        if (!zw) return { intro: ['星盘一时布不开，且以八字为凭。'], card: null }
        return {
          intro: [`八字论气，斗数观星。你是${zw.fiveElementsClass}，命主${zw.soul}，身主${zw.body}。星名皆可点问。`],
          card: (
            <CardMsg title="紫微星盘">
              {aiProse}
              <ZiweiChart chart={zw} gender={c.gender} />
              {aiZhupi}
            </CardMsg>
          ),
        }
      }
      case '命理总断':
        return {
          intro: ['最后，老朽将此命从头道来——格局、性情、事业、财帛、姻缘、康健，一一剖解。'],
          card: ai
            ? (aiProse ? <CardMsg title="命理总断">{aiProse}{aiZhupi}</CardMsg> : null)
            : (
              <CardMsg title="命理总断">
                <ReadingSections reading={r} />
              </CardMsg>
            ),
        }
    }
  }

  // 卡片内部切换（流年/大运）时的就地追问
  const aiAsk = async (q: string): Promise<string> => {
    const cfg = loadAiConfig()
    if (!cfg || !aiSystemRef.current) throw new Error('AI 未接入')
    return askMasterRetry(cfg, aiSystemRef.current, aiHistoryRef.current.slice(-6), q)
  }

  // 通用后处理：建议换胶囊、记档入库
  const applyMeta = (parsed: ReturnType<typeof parseAiReply>) => {
    if (parsed.suggests.length) setAiSuggests(parsed.suggests)
    if (parsed.memo && profileIdRef.current) addMemory(profileIdRef.current, parsed.memo)
  }

  // 聊天路：正文走气泡；模型点名的指令卡（含朱批印卡内）压在话后
  const applyChatReply = (raw: string): string => {
    const parsed = parseAiReply(raw)
    const cards: (ReactNode | null)[] = []
    if (parsed.card) {
      const view = buildTopicView(parsed.card, true, null, aiZhupiNode(parsed.note))
      cards.push(view.card)
      setVisited((v) => [...v, parsed.card!])
    }
    masterThenCard([parsed.body], ...cards)
    applyMeta(parsed)
    return parsed.body
  }

  // 卡路：AI 返回后才开始布盘，解读正文与朱批全部印在卡片内部
  const applyCardReply = (topic: Topic, raw: string): string => {
    const parsed = parseAiReply(raw)
    const view = buildTopicView(topic, true, aiProseNode(parsed.body), aiZhupiNode(parsed.note))
    if (view.card) {
      setCardCasting(true)
      setTimeout(() => {
        setCardCasting(false)
        node(view.card)
        scroll()
      }, 1400)
    } else {
      master([parsed.body])
    }
    applyMeta(parsed)
    return parsed.body
  }

  // echoText: 追加的用户气泡文案；传 null 表示用户已通过输入框发过话
  const runTopic = (topic: Topic, echoText: string | null = '') => {
    const c = chartRef.current
    const r = readingRef.current
    if (!c || !r) return
    setVisited((v) => [...v, topic])
    if (echoText !== null) {
      user(echoText || (topic.endsWith('势') || topic.endsWith('断') ? `那我的${topic}如何？` : `想看看${topic}。`))
    }

    const aiCfg = loadAiConfig()
    const aiMode = Boolean(aiCfg && aiSystemRef.current)
    const { intro, card } = buildTopicView(topic, aiMode)

    if (!aiMode) {
      // 无 AI：掐指思忖后开口，卡片等话说完再浮现
      setAiThinking(true)
      setTimeout(() => {
        setAiThinking(false)
        masterThenCard(intro, card)
        scroll()
      }, 900 + Math.random() * 900)
      return
    }

    // AI 模式：等 AI 返回后布盘出卡，解读正文直接印在卡上（推演解说走气泡口述）
    if (topic === '推演解说') {
      setAiThinking(true)
      Promise.all([
        askMasterRetry(aiCfg!, aiSystemRef.current, aiHistoryRef.current.slice(-8), '【系统指令】命主想知道这盘怎么算的。据推理链口述（150~220字），像说话一样，不列表格。'),
        new Promise((res) => setTimeout(res, 900)),
      ])
        .then(([reply]) => {
          const body = applyChatReply(reply as string)
          const turns: ChatTurn[] = [{ role: 'user', content: '（问推演过程）' }, { role: 'assistant', content: body }]
          aiHistoryRef.current.push(...turns)
          if (profileIdRef.current) appendHistory(profileIdRef.current, turns)
        })
        .catch((e) => master([`未能接通 AI（${explainAiError(e)}）。`, ...intro]))
        .finally(() => { setAiThinking(false); scroll() })
      return
    }
    const digest = topicDigest(topic)
    const instruction = `【系统指令】命主刚点开「${topic}」。你的解读正文将印在这张盘面卡顶部（图表之上），朱批印在卡底——所以直接以解读开头，不要寒暄。${digest ? `卡片数据：${digest}。` : ''}请解读（150~260字）：把卡上的关键处点到名字（哪一年、哪一步运、哪个五行），先专业断语后白话解释，扣着他此前聊过的处境，末尾一句指引；并按规则写一行「卡注」。`
    setAiThinking(true)
    Promise.all([
      askMasterRetry(aiCfg!, aiSystemRef.current, aiHistoryRef.current.slice(-8), instruction),
      new Promise((res) => setTimeout(res, 900)),
    ])
      .then(([reply]) => {
        const body = applyCardReply(topic, reply as string)
        const turns: ChatTurn[] = [{ role: 'user', content: `（点开了「${topic}」）` }, { role: 'assistant', content: body }]
        aiHistoryRef.current.push(...turns)
        if (profileIdRef.current) appendHistory(profileIdRef.current, turns)
      })
      .catch((e) => masterThenCard(
        [`未能接通 AI（${explainAiError(e)}）——此卡的解读须 AI 现写，下面仅列盘面数据；到「我的」页测试连接修好后再问。`],
        buildTopicView(topic, true).card,
      ))
      .finally(() => { setAiThinking(false); scroll() })
  }

  // 底部自由提问：配置了 AI 走大模型（带上下文），否则回落规则引擎
  const onAsk = (text: string) => {
    if (stage === 'gather') { handleGather(text); return }
    if (stage !== 'ready') {
      user(text)
      master(['莫急，盘正在排，稍候片刻。'])
      return
    }
    user(text)
    const cfg = loadAiConfig()
    if (cfg && aiSystemRef.current) {
      // 问句命中话题 → 卡路（解读印卡上）；否则聊天路（气泡）
      const t = detectTopic(text)
      const cardTopic = t && t !== '推演解说' ? t : null
      let q = text
      if (cardTopic) {
        setVisited((v) => [...v, cardTopic])
        const digest = topicDigest(cardTopic)
        q = `${text}\n【系统指令】你的解读正文将印在「${cardTopic}」盘面卡顶部（图表之上）——直接以解读开头，不要寒暄。${digest ? `卡片数据：${digest}。` : ''}结合卡上数据点名解读（150~260字），先答命主所问，扣着他此前的处境；并按规则写一行「卡注」。`
      }
      setAiThinking(true)
      Promise.all([
        askMasterRetry(cfg, aiSystemRef.current, aiHistoryRef.current.slice(-8), q),
        new Promise((res) => setTimeout(res, 900)),
      ])
        .then(([reply]) => {
          const body = cardTopic ? applyCardReply(cardTopic, reply as string) : applyChatReply(reply as string)
          const turns: ChatTurn[] = [{ role: 'user', content: text }, { role: 'assistant', content: body }]
          aiHistoryRef.current.push(...turns)
          if (profileIdRef.current) appendHistory(profileIdRef.current, turns)
        })
        .catch((e) => {
          master([`未能接通 AI（${explainAiError(e)}）。已重试一次仍不通——到「我的」页点「测试连接」看具体原因，修好后老朽必以 AI 细断。`])
        })
        .finally(() => { setAiThinking(false); scroll() })
      return
    }
    const topic = detectTopic(text)
    if (topic) {
      runTopic(topic, null)
    } else {
      master(['此问尚在天机之外——你可以问老朽事业、财运、感情、健康、大运流年，或让老朽看看五行与紫微星盘。'])
    }
  }

  const suggestions: string[] = stage === 'ready'
    ? [...(aiSuggests.length ? aiSuggests : TOPIC_KEYS.filter((t) => !visited.includes(t)).slice(0, 4)), '命盘报告']
    : []

  return (
    <>
      <div className="chat-scroll">
        {items.map((it) => {
          if (it.kind === 'master') {
            return (
              <MasterMsg key={it.id} segments={it.segs} onDone={() => {
                setBusy(false)
                const pcs = pendingCardsRef.current.splice(0)
                if (pcs.length) {
                  setCardCasting(true)
                  setTimeout(() => {
                    setCardCasting(false)
                    pcs.forEach((pc) => node(pc))
                    scroll()
                  }, 1500)
                }
                scroll()
              }} />
            )
          }
          if (it.kind === 'user') return <UserMsg key={it.id}>{it.text}</UserMsg>
          return <div key={it.id}>{it.node}</div>
        })}

        {!busy && stage === 'gather' && !resumePid && archives.length > 0 && (
          <Chips
            items={archives.map((a) => `${a.title.slice(0, 14)}｜续`)}
            onPick={(v) => {
              const a = archives.find((x) => `${x.title.slice(0, 14)}｜续` === v)
              if (!a) return
              const d = draftFromPid(a.id)
              if (!d) return
              draftRef.current = d
              user(`取旧盘：${a.title}。`)
              startCompute()
            }}
          />
        )}
        {(aiThinking || intakeThinking) && (
          <div className="msg-row fade-in">
            <div className="msg-bubble typing" style={{ marginLeft: 44 }}>{intakeThinking ? '老朽正在听你说' : '老朽正在掐指推算'}<span className="caret">▌</span></div>
          </div>
        )}
        {cardCasting && (
          <div className="casting-fx fade-in">
            <svg viewBox="0 0 60 60" className="casting-ring">
              <circle cx="30" cy="30" r="24" fill="none" stroke="currentColor" strokeWidth="2.6" strokeLinecap="round" strokeDasharray="108 44" opacity="0.85" />
              <circle cx="30" cy="30" r="16" fill="none" stroke="currentColor" strokeWidth="1" strokeDasharray="3 5" opacity="0.5" />
            </svg>
            <span>布盘之中…</span>
          </div>
        )}
        {stage === 'computing' && pct > 0 && (
          <div className="computing-fx fade-in">
            <video src={fx('fx-ink-loop.mp4')} autoPlay loop muted playsInline />
            <span>排盘中 · {Math.round(pct)}%</span>
          </div>
        )}
        {!busy && stage === 'ready' && suggestions.length > 0 && (
          <Chips items={suggestions} onPick={(v) => {
            if (v === '命盘报告') { setShowReport(true); return }
            if (aiSuggests.includes(v)) onAsk(v)
            else runTopic(v as Topic)
          }} />
        )}
        <div ref={bottomRef} />
      </div>
      <InputBar onSend={onAsk} />
      {showReport && chart && (
        <ReportView
          chart={chart}
          memories={(() => { try { return (JSON.parse(localStorage.getItem('xjg-profiles') ?? '{}')[profileIdRef.current]?.memories ?? []) as string[] } catch { return [] } })()}
          onClose={() => setShowReport(false)}
        />
      )}
    </>
  )
}

// 十神 → 流年简说 / 四维短评
const LN_BRIEF: Record<string, string> = {
  比肩: '朋友助力，防分财', 劫财: '竞争破耗，守财库', 食神: '福禄才华，宜表达', 伤官: '锋芒外露，慎言行',
  偏财: '机遇流财，见好就收', 正财: '勤耕有获，置业佳', 七杀: '压力挑战，砺刃上位', 正官: '名位晋升，走正道',
  偏印: '沉潜进修，防孤郁', 正印: '贵人文书，宜安家',
}
const LN_DIMS: Record<string, [string, string, string, string]> = {
  // [事业, 财运, 感情, 健康]
  比肩: ['合作可为', '防友分财', '桃花平平', '体气尚可'],
  劫财: ['竞争激烈', '忌借贷', '防口角', '劳逸结合'],
  食神: ['才华显露', '福财缓进', '人缘旺', '气色佳'],
  伤官: ['宜技不宜仕', '偏财可图', '易生口舌', '防小恙'],
  偏财: ['机会外来', '流财快进出', '桃花外露', '奔波注意'],
  正财: ['稳中有升', '正财入库', '姻缘正旺', '平顺'],
  七杀: ['压力升职', '费心之财', '强缘将至', '防劳损'],
  正官: ['晋升名分', '稳定收益', '婚缘正星', '规律作息'],
  偏印: ['宜学宜研', '收成平缓', '心事宜诉', '防思虑伤神'],
  正印: ['贵人提携', '文书之财', '长辈牵缘', '静养得宜'],
}

function Stars({ n }: { n: number }) {
  const full = Math.round(n)
  return <span className="stars">{'★'.repeat(full)}{'☆'.repeat(5 - full)}</span>
}

// ---------- 大运卡（内部可交互） ----------
function DayunCard({ chart, prose = true, extraTop = null, extraBottom = null, aiAsk }: { chart: BaziChart; prose?: boolean; extraTop?: ReactNode; extraBottom?: ReactNode; aiAsk?: (q: string) => Promise<string> }) {
  const now = new Date().getFullYear()
  const init = Math.max(0, chart.daYun.findIndex((d) => now >= d.startYear && now <= d.endYear))
  const [idx, setIdx] = useState(init)
  const [aiCache, setAiCache] = useState<Record<number, { body: string; note: string }>>({})
  const [loadingIdx, setLoadingIdx] = useState<number | null>(null)
  const d = chart.daYun[idx]
  const god = tenGod(chart.dayGan, d.ganZhi[0])
  const pick = (i: number) => {
    setIdx(i)
    if (!aiAsk || i === init || aiCache[i]) return
    const dy = chart.daYun[i]
    const g = tenGod(chart.dayGan, dy.ganZhi[0])
    setLoadingIdx(i)
    aiAsk(`【系统指令】命主在大运卡上切换到「${dy.ganZhi}」大运（${dy.startYear}—${dy.endYear}，${dy.startAge}—${dy.startAge + 9}岁，运干${g}）。请解读这步运的要点（80~150字，扣着他的喜忌与处境），另起一行「卡注：不超过26字」。不要写「建议」「卡片」行。`)
      .then((raw) => { const pr = parseAiReply(raw); setAiCache((m) => ({ ...m, [i]: { body: pr.body, note: pr.note } })) })
      .catch(() => setAiCache((m) => ({ ...m, [i]: { body: '未能接通 AI，此运解读暂缺——修好配置后重选即可。', note: '' } })))
      .finally(() => setLoadingIdx((v) => (v === i ? null : v)))
  }
  const topNode = !aiAsk || idx === init ? extraTop : (aiCache[idx] ? aiProseNode(aiCache[idx].body) : null)
  const bottomNode = !aiAsk || idx === init ? extraBottom : (aiCache[idx]?.note ? aiZhupiNode(aiCache[idx].note) : null)
  return (
    <CardMsg title="大运排盘" sub="每十年一运 · 岁数为虚岁 · 点节点切换即时解读">
      <InkArt name="dayun" height={100} />
      {topNode}
      {loadingIdx === idx && <div className="card-loading">老朽正在推算此运…</div>}
      <div className="dayun-strip">
        {chart.daYun.map((dy, i) => (
          <div key={dy.ganZhi + dy.startYear} className={`dayun-cell ${i === idx ? 'active' : ''}`} onClick={() => pick(i)}>
            <div className="dayun-god">{tenGod(chart.dayGan, dy.ganZhi[0])}</div>
            <div className="dayun-gz">{dy.ganZhi}</div>
            <div className="dayun-age">{dy.startAge}岁<br />{dy.startYear}</div>
          </div>
        ))}
      </div>
      <DayunLineChart chart={chart} activeIdx={idx} onPick={pick} />
      <div className="ln-rate">整体运势 <Stars n={dayunScore(d, chart)} /></div>
      {prose && <p className="reading-p" style={{ marginTop: 8 }}>
        你{now >= d.startYear && now <= d.endYear ? '当前行' : '于此段行'}「{d.ganZhi}」大运（{d.startYear}—{d.endYear}，<Term k={god}>{god}</Term>运）。
        {['正官', '正印', '正财', '食神'].includes(god)
          ? '此运正星当值，宜稳中求进、积累根基，是修成正果的十年。'
          : ['七杀', '伤官', '劫财', '偏印'].includes(god)
            ? '此运动星当值，压力与机遇并存，敢闯者得势，唯忌意气用事。'
            : '此运气象平顺，宜按部就班经营，勿贪快求变。'}
      </p>}
      {bottomNode}
    </CardMsg>
  )
}

// ---------- 流年卡（内部可交互） ----------
function LiunianCard({ chart, prose = true, extraTop = null, extraBottom = null, aiAsk }: { chart: BaziChart; prose?: boolean; extraTop?: ReactNode; extraBottom?: ReactNode; aiAsk?: (q: string) => Promise<string> }) {
  const now = new Date().getFullYear()
  const years = useMemo(() => liuNianRange(now - 1, 6, chart.dayGan), [chart, now])
  const [year, setYear] = useState(now)
  const [aiCache, setAiCache] = useState<Record<number, { body: string; note: string }>>({})
  const [loadingYear, setLoadingYear] = useState<number | null>(null)
  const ln = years.find((l) => l.year === year) ?? years[0]
  const r = interpretLiuNian(ln, chart)
  const pick = (y: number) => {
    setYear(y)
    if (!aiAsk || y === now || aiCache[y]) return
    const l = years.find((x) => x.year === y)
    if (!l) return
    setLoadingYear(y)
    aiAsk(`【系统指令】命主在流年卡上切换到 ${l.year} ${l.ganZhi} 年（流年${l.god}）。请解读该年运势要点（80~150字，扣着他的喜忌与处境，说明吉凶与该做什么），另起一行「卡注：不超过26字」。不要写「建议」「卡片」行。`)
      .then((raw) => { const pr = parseAiReply(raw); setAiCache((m) => ({ ...m, [y]: { body: pr.body, note: pr.note } })) })
      .catch(() => setAiCache((m) => ({ ...m, [y]: { body: '未能接通 AI，此年解读暂缺——修好配置后重选此年即可。', note: '' } })))
      .finally(() => setLoadingYear((v) => (v === y ? null : v)))
  }
  const topNode = !aiAsk || year === now ? extraTop : (aiCache[year] ? aiProseNode(aiCache[year].body) : null)
  const bottomNode = !aiAsk || year === now ? extraBottom : (aiCache[year]?.note ? aiZhupiNode(aiCache[year].note) : null)
  return (
    <CardMsg title={`${ln.year} ${ln.ganZhi}年`} sub={`流年${ln.god} · 红针指向流年地支 · 点年份即时解读`}>
      {topNode}
      {loadingYear === year && <div className="card-loading">老朽正在推算 {year} 年…</div>}
      <InkArt name="liunian" height={120} />
      <div className="liunian-grid" style={{ marginBottom: 10 }}>
        {years.map((l) => (
          <div key={l.year} className={`liunian-cell ${l.year === year ? 'active' : ''}`} onClick={() => pick(l.year)}>
            <div className="liunian-gz">{l.ganZhi}</div>
            <div className="liunian-year">{l.year} · {l.god}</div>
          </div>
        ))}
      </div>
      <WheelSection chart={chart} activeLn={ln} />
      {prose && <h3 className="reading-h">{r.theme}</h3>}
      {prose && <p className="reading-p">{r.text}</p>}
      {prose && r.extra && (
        <div className="badge-rows" style={{ marginTop: 8 }}>
          <div className="badge-row ji"><span className="badge-key">提点</span><span className="badge-val">{r.extra}。</span></div>
        </div>
      )}
      <div className="ln-dims">
        {(['事业', '财运', '感情', '健康'] as const).map((k, i) => (
          <div className="ln-dim" key={k}>
            <span className="ln-dim-k">{k}</span>
            <span className="ln-dim-v">{(LN_DIMS[ln.god] ?? ['—', '—', '—', '—'])[i]}</span>
          </div>
        ))}
      </div>
      <div className="ln-rate">整体运势 <Stars n={lnStars(ln, chart)} /></div>
      <table className="ln-table">
        <thead><tr><th>年份</th><th>干支</th><th>十神</th><th>说明</th></tr></thead>
        <tbody>
          {years.map((l) => (
            <tr key={l.year} className={l.year === year ? 'on' : ''} onClick={() => pick(l.year)}>
              <td>{l.year}</td><td>{l.ganZhi}</td><td>{l.god}</td><td>{LN_BRIEF[l.god] ?? ''}</td>
            </tr>
          ))}
        </tbody>
      </table>
      <LiuYueSection year={year} yearGan={ln.ganZhi[0]} chart={chart} aiAsk={aiAsk} />
      {bottomNode}
    </CardMsg>
  )
}

// ---------- 流月流日（点月即解，逐日干支） ----------
function LiuYueSection({ year, yearGan, chart, aiAsk }: { year: number; yearGan: string; chart: BaziChart; aiAsk?: (q: string) => Promise<string> }) {
  const months = useMemo(() => liuYueOf(year, yearGan, chart.dayGan), [year, yearGan, chart])
  const today = new Date()
  const curIdx = months.findIndex((m) => today >= m.start && today < m.end)
  const [idx, setIdx] = useState<number | null>(curIdx >= 0 ? curIdx : null)
  const [aiCache, setAiCache] = useState<Record<string, string>>({})
  const [loading, setLoading] = useState<string | null>(null)
  const m: LiuYue | null = idx != null ? months[idx] : null
  const days = useMemo(() => (m ? liuRiOf(m, chart.dayGan) : []), [m, chart])

  const pick = (i: number) => {
    setIdx(i)
    const key = `${year}-${i}`
    if (!aiAsk || aiCache[key]) return
    const mm = months[i]
    setLoading(key)
    aiAsk(`【系统指令】命主在流月表上点开 ${year} 年${mm.label}（${mm.ganZhi}月，流月${mm.god}）。请解读该月要点（60~100字，扣着他的喜忌与处境），直接给正文，不写建议/卡片/卡注。`)
      .then((raw) => setAiCache((c) => ({ ...c, [key]: parseAiReply(raw).body })))
      .catch(() => setAiCache((c) => ({ ...c, [key]: '未能接通 AI，此月解读暂缺。' })))
      .finally(() => setLoading((v) => (v === key ? null : v)))
  }

  return (
    <div style={{ marginTop: 12 }}>
      <h3 className="reading-h">流月 · {year}年</h3>
      <div className="ly-grid">
        {months.map((mm, i) => (
          <div key={mm.ganZhi + i} className={`ly-cell ${i === idx ? 'on' : ''}`} onClick={() => pick(i)}>
            <span className="ly-gz">{mm.ganZhi}</span>
            {mm.god}
          </div>
        ))}
      </div>
      {m && (
        <>
          <p className="lr-note">{m.label}（{m.start.getMonth() + 1}/{m.start.getDate()} 起）· 流月{m.god}{aiAsk ? '' : ` · ${LN_BRIEF[m.god] ?? ''}`}</p>
          {aiAsk && (loading === `${year}-${idx}` ? <div className="card-loading">老朽正在推算此月…</div>
            : aiCache[`${year}-${idx}`] ? <p className="reading-p" style={{ fontSize: '0.8rem' }}>{aiCache[`${year}-${idx}`]}</p> : null)}
          <div className="lr-grid">
            {days.map((d) => (
              <div key={d.date.toISOString()} className={`lr-cell ${d.date.toDateString() === today.toDateString() ? 'today' : ''}`}>
                {d.day}日<b>{d.ganZhi}</b>{d.god.slice(0, 2)}
              </div>
            ))}
          </div>
        </>
      )}
    </div>
  )
}

function lnStars(ln: LiuNian, chart: BaziChart): number {
  const wx = { 甲: '木', 乙: '木', 丙: '火', 丁: '火', 戊: '土', 己: '土', 庚: '金', 辛: '金', 壬: '水', 癸: '水' }[ln.ganZhi[0]]
  let n = 3
  if (chart.favorable.includes(wx as never)) n += 1
  if (chart.unfavorable.includes(wx as never)) n -= 1
  if (['正官', '正印', '正财', '食神'].includes(ln.god)) n += 0.5
  if (['七杀', '伤官', '劫财'].includes(ln.god)) n -= 0.5
  return Math.max(1, Math.min(5, n))
}
