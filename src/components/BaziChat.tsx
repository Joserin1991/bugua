// 问命排盘 · 对话流：问性别/生日/时辰 → 推演进度墨圈 → 四柱卡+命盘 → 胶囊追问逐题细解
import { useEffect, useMemo, useRef, useState, type ReactNode } from 'react'
import { computeBazi, liuNianRange, type BaziChart, type LiuNian } from '../lib/bazi'
import { computeZiwei, type ZwChart } from '../lib/ziwei'
import { interpretBazi, interpretLiuNian, type BaziReading } from '../lib/interpret'
import { tenGod } from '../lib/wuxing'
import { saveRecord } from '../lib/records'
import { MasterMsg, UserMsg, CardMsg, Chips, ProgressEnso, InputBar, InkArt } from './ChatUI'
import { CITIES } from '../lib/cities'
import { traceNarrative } from '../lib/trace'
import { loadAiConfig, buildMasterSystem, askMaster, type ChatTurn } from '../lib/ai'
import { sanpan } from '../lib/sanpan'
import { SanpanCard } from './SanpanCard'
import { PillarCards, WuxingPctBars, Radar, wuxingRadarData, abilityRadarData, TenGodOrbit, DayunLineChart } from './InfoGraphics'
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

type Stage = 'gender' | 'date' | 'hour' | 'city' | 'computing' | 'ready'

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

// 解析 AI 回复协议：正文 + 可选「卡片：XXX」指令 + 可选「建议：问A｜问B｜问C」动态追问
function parseAiReply(raw: string): { body: string; card: Topic | null; suggests: string[] } {
  let body = raw.trim()
  let card: Topic | null = null
  const suggests: string[] = []
  const cardM = body.match(/^卡片[：:]\s*(.+)$/m)
  if (cardM) {
    const t = cardM[1].trim()
    if ((TOPIC_KEYS as readonly string[]).includes(t)) card = t as Topic
    body = body.replace(cardM[0], '').trim()
  }
  const sugM = body.match(/^建议[：:]\s*(.+)$/m)
  if (sugM) {
    suggests.push(...sugM[1].split(/[|｜、；;]/).map((x) => x.trim()).filter(Boolean).slice(0, 4))
    body = body.replace(sugM[0], '').trim()
  }
  return { body, card, suggests }
}

let uid = 1

export function BaziChat() {
  const [items, setItems] = useState<Item[]>([])
  const [stage, setStage] = useState<Stage>('gender')
  const [busy, setBusy] = useState(true) // 大师打字中
  const [gender, setGender] = useState<'男' | '女'>('男')
  const [date, setDate] = useState('1995-08-16')
  const [hour, setHour] = useState(9)
  const [cityIdx, setCityIdx] = useState(0)
  const [pct, setPct] = useState(0)
  const [chart, setChart] = useState<BaziChart | null>(null)
  const [visited, setVisited] = useState<Topic[]>([])
  const bottomRef = useRef<HTMLDivElement>(null)
  const chartRef = useRef<BaziChart | null>(null)
  const readingRef = useRef<BaziReading | null>(null)
  const ziweiRef = useRef<ZwChart | null>(null)
  const birthRef = useRef<Date | null>(null)
  const aiHistoryRef = useRef<ChatTurn[]>([])
  const aiSystemRef = useRef<string>('')
  const [aiThinking, setAiThinking] = useState(false)
  const [aiSuggests, setAiSuggests] = useState<string[]>([])

  const reading = useMemo(() => (chart ? interpretBazi(chart) : null), [chart])
  chartRef.current = chart
  readingRef.current = reading

  const scroll = () => setTimeout(() => bottomRef.current?.scrollIntoView({ behavior: 'smooth', block: 'end' }), 100)

  const push = (item: NewItem) => {
    setItems((arr) => [...arr, { ...item, id: uid++ }])
    scroll()
  }
  const master = (segs: ReactNode[]) => { setBusy(true); push({ kind: 'master', segs }) }
  // 卡片压在话后：等大师这段话打完字，再让卡片晕染浮现
  const pendingCardsRef = useRef<ReactNode[]>([])
  const masterThenCard = (segs: ReactNode[], ...cards: (ReactNode | null)[]) => {
    pendingCardsRef.current.push(...cards.filter(Boolean))
    master(segs)
  }
  const user = (text: string) => push({ kind: 'user', text })
  const node = (n: ReactNode) => push({ kind: 'node', node: n })

  useEffect(() => {
    master(['世间万象，皆有其时。', '既然你想了解自己，我们先从你的出生信息开始，老朽为你排出专属命盘。', '所测是男命，还是女命？'])
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [])

  // ---------- 起盘 ----------
  const confirmHour = (h: number) => {
    setHour(h)
    user(`${HOUR_OPTIONS.find((o) => o.v === h)?.label.split('（')[0] ?? ''}。`)
    master(['最后一问：出生在哪座城市？', '中西部与沿海钟表同刻、日影不同——老朽要按当地真太阳时给你校时，差之一辰谬以千里。'])
    setStage('city')
  }

  const confirmCity = (idx: number) => {
    const city = idx >= 0 ? CITIES[idx] : null
    user(city ? `${city.name}。` : '记不清了，直接排吧。')
    master(['多谢。', '正在为你排演，请稍候片刻。'])
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
    aiSystemRef.current = buildMasterSystem(c, zw)
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
    saveRecord({
      type: '八字排盘',
      title: `${c.gender === '男' ? '乾造' : '坤造'} ${c.solarText}`,
      summary: `日主${c.dayGan}${c.dayGanWx} · ${c.strength.level} · 喜${c.favorable.join('')}`,
    })
    node(
      <CardMsg title="四柱八字" sub={`${c.solarCorrection ? `真太阳时 ${c.solarCorrection.trueText}（${c.solarCorrection.city} ${c.solarCorrection.offsetMin > 0 ? '+' : ''}${c.solarCorrection.offsetMin} 分）｜ ` : ''}农历 ${c.lunarText} ｜ 属${c.animal}`}>
        <PillarCards chart={c} />
        <div className="divider-ink" />
        <WheelSection chart={c} activeLn={currentLn(c)} />
        <ChartMeta chart={c} />
      </CardMsg>,
    )
    const fallbackOpening: ReactNode[] = [
      `你的命盘排好了。日元${c.dayGan}${c.dayGanWx}，生于${c.pillars[1].zhi}月，日主${c.strength.level}，喜`,
      <Term key="t" k="喜用神">{`${c.favorable.join('、')}`}</Term>,
      `。${r.geju.split('。')[2] ?? ''}。`,
      '八字、紫微、卦象三盘老朽都替你起好了——点「三盘合参」可看它们是否互相印证。想先了解哪方面？',
    ]
    const cfg = loadAiConfig()
    if (cfg && aiSystemRef.current) {
      setAiThinking(true)
      Promise.all([
        askMaster(cfg, aiSystemRef.current, [], '【系统指令】命主的命盘刚排好，四柱盘卡已展示在界面上。请作开场解读（180~260字）：报出四柱，点出日主旺衰与格局的关键（引用具体柱位，如「月干戊土食神透出」），用一两句白话讲他的性子，最后请命主说说近来的境况或最挂心的事。'),
        new Promise((res) => setTimeout(res, 900)),
      ])
        .then(([reply]) => {
          const body = applyAiReply(reply as string, null, null)
          aiHistoryRef.current.push({ role: 'assistant', content: body })
        })
        .catch(() => master(fallbackOpening))
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
  const buildTopicView = (topic: Topic, ai = false): { intro: ReactNode[]; card: ReactNode | null } => {
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
              <SanpanCard result={sp} />
            </CardMsg>
          ),
        }
      }
      case '五行分析':
        return {
          intro: ['我们先看你的五行强弱。'],
          card: (
            <CardMsg title="五行能量分布">
              <WuxingPctBars chart={c} />
              <Radar data={wuxingRadarData(c)} max={100} />
              {!ai && <p className="reading-p" style={{ marginTop: 6 }}>{r.personality}</p>}
            </CardMsg>
          ),
        }
      case '十神关系':
        return {
          intro: ['十神者，人事之网也——贵人、财富、才华、压力，皆在此图中各居其位。红点为命中所有，红圈为今岁当值。'],
          card: (
            <CardMsg title="十神环绕 · 日主居中">
              <TenGodOrbit chart={c} activeGod={ln ? ln.god : undefined} />
              <p className="center-note">点<Term k="十神">十神</Term>名可查其义</p>
            </CardMsg>
          ),
        }
      case '专业细盘':
        return {
          intro: ['细盘在此。地支藏干、星运自坐、空亡纳音、神煞，柱柱分明；右二列为现行大运与流年。红字皆可点问。'],
          card: (
            <CardMsg title="专业细盘">
              <ProTable chart={c} activeDayun={c.daYun.find((d) => { const y = new Date().getFullYear(); return y >= d.startYear && y <= d.endYear }) ?? c.daYun[0]} activeLn={ln} />
            </CardMsg>
          ),
        }
      case '大运走势':
        return { intro: [`${c.qiYunText}。大运十年一换，如行船换水道——下图便是你一生的水路起伏。`], card: <DayunCard chart={c} prose={!ai} /> }
      case '流年运势':
        return { intro: ['来看你今年的流年运势。'], card: <LiunianCard chart={c} prose={!ai} /> }
      case '事业运势':
        return {
          intro: ['来看你今年的事业运势。'],
          card: (
            <CardMsg title="事业五维" sub="由命局十神推得">
              <Radar data={abilityRadarData(c)} max={100} />
              {!ai && <p className="reading-p" style={{ marginTop: 4 }}>{r.career}</p>}
            </CardMsg>
          ),
        }
      case '财运走势':
        return {
          intro: ['财帛之事，须看财星与身强身弱相配。'],
          card: ai ? null : (
            <CardMsg title="财帛之道">
              <p className="reading-p">{r.wealth}</p>
            </CardMsg>
          ),
        }
      case '感情运势':
        return {
          intro: ['你的感情格局如下：'],
          card: (
            <CardMsg title="姻缘情感">
              <InkArt name="love" height={140} />
              {!ai && <p className="reading-p">{r.love}</p>}
            </CardMsg>
          ),
        }
      case '健康提点':
        return {
          intro: ['身体是行运的本钱，且听老朽几句提点。'],
          card: ai ? null : (
            <CardMsg title="康健养生">
              <p className="reading-p">{r.health}</p>
            </CardMsg>
          ),
        }
      case '神煞照命':
        return {
          intro: ['你命里照着这几颗星。吉者当用，凶者知避——不必惧，是提前递给你的信儿。'],
          card: (
            <CardMsg title="神煞照命">
              <ShenshaSection chart={c} />
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
              <ZiweiChart chart={zw} gender={c.gender} />
            </CardMsg>
          ),
        }
      }
      case '命理总断':
        return {
          intro: ['最后，老朽将此命从头道来——格局、性情、事业、财帛、姻缘、康健，一一剖解。'],
          card: ai ? null : (
            <CardMsg title="命理总断">
              <ReadingSections reading={r} />
            </CardMsg>
          ),
        }
    }
  }

  // AI 回复落地：解析正文/卡片指令/动态追问建议；卡片压在话后浮现
  const applyAiReply = (raw: string, topicCard: ReactNode | null, alreadyShown: Topic | null) => {
    const parsed = parseAiReply(raw)
    const cards: (ReactNode | null)[] = [topicCard]
    if (parsed.card && parsed.card !== alreadyShown) {
      const view = buildTopicView(parsed.card, true)
      cards.push(view.card)
      setVisited((v) => [...v, parsed.card!])
    }
    masterThenCard([parsed.body], ...cards)
    if (parsed.suggests.length) setAiSuggests(parsed.suggests)
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

    // AI 模式：解读全由 AI 生成，图表卡压在话后浮现
    const fullText = ['财运走势', '感情运势', '健康提点', '命理总断', '推演解说'].includes(topic)
    const instruction = fullText
      ? `【系统指令】命主想听「${topic}」。据盘面证据作完整解读（200~300字，可分两小段）：先专业断语后白话解释，引用具体柱位与分数，务必扣着他此前说过的处境，结尾一句叮嘱。`
      : `【系统指令】命主刚点开「${topic}」，界面稍后会展示对应盘面卡。卡片数据：${topicDigest(topic)}。请为命主解读这张卡（150~250字）：把卡上的关键处点到名字（哪一年、哪一步运、哪个五行），先专业断语后白话解释，扣着他此前聊过的处境，末尾一句指引。不要整段复述数据，挑要紧的讲。`
    setAiThinking(true)
    Promise.all([
      askMaster(aiCfg!, aiSystemRef.current, aiHistoryRef.current.slice(-8), instruction),
      new Promise((res) => setTimeout(res, 900)),
    ])
      .then(([reply]) => {
        const body = applyAiReply(reply as string, card, topic)
        aiHistoryRef.current.push({ role: 'user', content: `（点开了「${topic}」）` }, { role: 'assistant', content: body })
      })
      .catch(() => masterThenCard(intro, card))
      .finally(() => { setAiThinking(false); scroll() })
  }

  // 底部自由提问：配置了 AI 走大模型（带上下文），否则回落规则引擎
  const onAsk = (text: string) => {
    if (stage !== 'ready') {
      user(text)
      master(['莫急，先把生辰告诉老朽，排出命盘，方能为你细断。'])
      return
    }
    user(text)
    const cfg = loadAiConfig()
    if (cfg && aiSystemRef.current) {
      // 问句命中图表话题时：随答案带出盘卡，并把卡片数据交给 AI 点名解读
      const t = detectTopic(text)
      const chartTopic = t && !['财运走势', '感情运势', '健康提点', '命理总断', '推演解说'].includes(t) ? t : null
      let card: ReactNode | null = null
      let q = text
      if (chartTopic) {
        setVisited((v) => [...v, chartTopic])
        card = buildTopicView(chartTopic, true).card
        q = `${text}\n【系统指令】界面稍后会展示「${chartTopic}」盘面卡，卡片数据：${topicDigest(chartTopic)}。请结合卡上数据点名解读（150~250字），先答命主所问，扣着他此前的处境。`
      }
      setAiThinking(true)
      Promise.all([
        askMaster(cfg, aiSystemRef.current, aiHistoryRef.current.slice(-8), q),
        new Promise((res) => setTimeout(res, 900)),
      ])
        .then(([reply]) => {
          const body = applyAiReply(reply as string, card, chartTopic)
          aiHistoryRef.current.push({ role: 'user', content: text }, { role: 'assistant', content: body })
        })
        .catch(() => {
          const topic = detectTopic(text)
          if (topic) { master(['天机线路一时不通，老朽以本盘规则为你细断。']); runTopic(topic, null) }
          else master(['天机线路一时不通（AI 连接失败），且换个问法，或到「我的」页检查 AI 配置。'])
        })
        .finally(() => { setAiThinking(false); scroll() })
      return
    }
    const topic = detectTopic(text)
    if (topic) {
      runTopic(topic, null)
    } else {
      master(['此问尚在天机之外——你可以问老朽事业、财运、感情、健康、大运流年，或让老朽看看五行与紫微星盘。到「我的」页接入 AI 后，老朽便可自由对答。'])
    }
  }

  const suggestions: string[] = stage === 'ready'
    ? (aiSuggests.length ? aiSuggests : TOPIC_KEYS.filter((t) => !visited.includes(t)).slice(0, 4))
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
                pcs.forEach((pc) => node(pc))
                scroll()
              }} />
            )
          }
          if (it.kind === 'user') return <UserMsg key={it.id}>{it.text}</UserMsg>
          return <div key={it.id}>{it.node}</div>
        })}

        {/* 阶段交互 */}
        {!busy && stage === 'gender' && (
          <Chips items={['男命', '女命']} onPick={(v) => {
            setGender(v === '男命' ? '男' : '女')
            user(`${v}。`)
            master(['你的出生日期是？阳历即可，农历节气老朽自会换算。'])
            setStage('date')
          }} />
        )}
        {!busy && stage === 'date' && (
          <div className="inline-input-row fade-in">
            <input type="date" value={date} min="1901-01-01" max="2099-12-31" onChange={(e) => setDate(e.target.value)} />
            <button className="chip" onClick={() => {
              if (!date) return
              user(`${date.split('-')[0]}年${Number(date.split('-')[1])}月${Number(date.split('-')[2])}日。`)
              master(['出生时间是？记不清确切钟点，选个大概也不打紧。'])
              setStage('hour')
            }}>就是这天</button>
          </div>
        )}
        {!busy && stage === 'hour' && (
          <div className="inline-input-row fade-in">
            <select value={hour} onChange={(e) => setHour(Number(e.target.value))}>
              {HOUR_OPTIONS.map((h) => <option key={h.label} value={h.v}>{h.label}</option>)}
            </select>
            <button className="chip" onClick={() => confirmHour(hour)}>差不多这时候</button>
          </div>
        )}
        {!busy && stage === 'city' && (
          <div className="inline-input-row fade-in">
            <select value={cityIdx} onChange={(e) => setCityIdx(Number(e.target.value))}>
              {CITIES.map((ct, i) => <option key={ct.name} value={i}>{ct.name}（东经{ct.lng}°）</option>)}
            </select>
            <button className="chip" onClick={() => confirmCity(cityIdx)}>就是这里</button>
            <button className="chip chip-ghost" onClick={() => confirmCity(-1)}>跳过</button>
          </div>
        )}
        {aiThinking && (
          <div className="msg-row fade-in">
            <div className="msg-bubble typing" style={{ marginLeft: 44 }}>老朽正在掐指推算<span className="caret">▌</span></div>
          </div>
        )}
        {stage === 'computing' && pct > 0 && <ProgressEnso label="排盘中" pct={pct} />}
        {!busy && stage === 'ready' && suggestions.length > 0 && (
          <Chips items={suggestions} onPick={(v) => { if (aiSuggests.includes(v)) onAsk(v); else runTopic(v as Topic) }} />
        )}
        <div ref={bottomRef} />
      </div>
      <InputBar onSend={onAsk} />
    </>
  )
}

// ---------- 大运卡（内部可交互） ----------
function DayunCard({ chart, prose = true }: { chart: BaziChart; prose?: boolean }) {
  const now = new Date().getFullYear()
  const init = Math.max(0, chart.daYun.findIndex((d) => now >= d.startYear && now <= d.endYear))
  const [idx, setIdx] = useState(init)
  const d = chart.daYun[idx]
  const god = tenGod(chart.dayGan, d.ganZhi[0])
  return (
    <CardMsg title="大运排盘" sub="每十年一运 · 岁数为虚岁 · 点折线上的节点切换">
      <div className="dayun-strip">
        {chart.daYun.map((dy, i) => (
          <div key={dy.ganZhi + dy.startYear} className={`dayun-cell ${i === idx ? 'active' : ''}`} onClick={() => setIdx(i)}>
            <div className="dayun-gz">{dy.ganZhi}</div>
            <div className="dayun-age">{dy.startAge}–{dy.startAge + 9}岁</div>
          </div>
        ))}
      </div>
      <DayunLineChart chart={chart} activeIdx={idx} onPick={setIdx} />
      {prose && <p className="reading-p" style={{ marginTop: 8 }}>
        你{now >= d.startYear && now <= d.endYear ? '当前行' : '于此段行'}「{d.ganZhi}」大运（{d.startYear}—{d.endYear}，<Term k={god}>{god}</Term>运）。
        {['正官', '正印', '正财', '食神'].includes(god)
          ? '此运正星当值，宜稳中求进、积累根基，是修成正果的十年。'
          : ['七杀', '伤官', '劫财', '偏印'].includes(god)
            ? '此运动星当值，压力与机遇并存，敢闯者得势，唯忌意气用事。'
            : '此运气象平顺，宜按部就班经营，勿贪快求变。'}
      </p>}
    </CardMsg>
  )
}

// ---------- 流年卡（内部可交互） ----------
function LiunianCard({ chart, prose = true }: { chart: BaziChart; prose?: boolean }) {
  const now = new Date().getFullYear()
  const years = useMemo(() => liuNianRange(now - 1, 6, chart.dayGan), [chart, now])
  const [year, setYear] = useState(now)
  const ln = years.find((l) => l.year === year) ?? years[0]
  const r = interpretLiuNian(ln, chart)
  return (
    <CardMsg title={`${ln.year} ${ln.ganZhi}年`} sub={`流年${ln.god} · 红针指向流年地支`}>
      <InkArt name="liunian" height={120} />
      <div className="liunian-grid" style={{ marginBottom: 10 }}>
        {years.map((l) => (
          <div key={l.year} className={`liunian-cell ${l.year === year ? 'active' : ''}`} onClick={() => setYear(l.year)}>
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
    </CardMsg>
  )
}
