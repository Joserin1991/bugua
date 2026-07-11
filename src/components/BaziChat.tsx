// 问命排盘 · 对话流：问性别/生日/时辰 → 推演进度墨圈 → 四柱卡+命盘 → 胶囊追问逐题细解
import { useEffect, useMemo, useRef, useState, type ReactNode } from 'react'
import { computeBazi, liuNianRange, type BaziChart, type LiuNian } from '../lib/bazi'
import { computeZiwei, type ZwChart } from '../lib/ziwei'
import { interpretBazi, interpretLiuNian, type BaziReading } from '../lib/interpret'
import { tenGod } from '../lib/wuxing'
import { saveRecord } from '../lib/records'
import { MasterMsg, UserMsg, CardMsg, Chips, ProgressEnso, InputBar, InkArt } from './ChatUI'
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

type Stage = 'gender' | 'date' | 'hour' | 'computing' | 'ready'

const TOPIC_KEYS = ['五行分析', '十神关系', '大运走势', '流年运势', '事业运势', '财运走势', '感情运势', '健康提点', '神煞照命', '专业细盘', '紫微星盘', '命理总断'] as const
type Topic = typeof TOPIC_KEYS[number]

function detectTopic(text: string): Topic | null {
  const rules: [Topic, RegExp][] = [
    ['感情运势', /(感情|恋爱|婚|对象|桃花|脱单|喜欢|复合)/],
    ['事业运势', /(事业|工作|升职|跳槽|职|创业|面试|老板)/],
    ['财运走势', /(财|钱|收入|投资|生意|买卖)/],
    ['健康提点', /(健康|身体|病|养生)/],
    ['大运走势', /(大运)/],
    ['流年运势', /(流年|今年|明年|运势)/],
    ['五行分析', /(五行|喜用|缺什么)/],
    ['十神关系', /(十神)/],
    ['神煞照命', /(神煞|贵人|桃花星|驿马)/],
    ['紫微星盘', /(紫微|星盘|斗数)/],
    ['专业细盘', /(细盘|排盘表|藏干|纳音|空亡)/],
    ['命理总断', /(总断|整体|性格|命怎么样|格局)/],
  ]
  for (const [t, re] of rules) if (re.test(text)) return t
  return null
}

let uid = 1

export function BaziChat() {
  const [items, setItems] = useState<Item[]>([])
  const [stage, setStage] = useState<Stage>('gender')
  const [busy, setBusy] = useState(true) // 大师打字中
  const [gender, setGender] = useState<'男' | '女'>('男')
  const [date, setDate] = useState('1995-08-16')
  const [hour, setHour] = useState(9)
  const [pct, setPct] = useState(0)
  const [chart, setChart] = useState<BaziChart | null>(null)
  const [ziwei, setZiwei] = useState<ZwChart | null>(null)
  const [visited, setVisited] = useState<Topic[]>([])
  const bottomRef = useRef<HTMLDivElement>(null)
  const chartRef = useRef<BaziChart | null>(null)
  const readingRef = useRef<BaziReading | null>(null)

  const reading = useMemo(() => (chart ? interpretBazi(chart) : null), [chart])
  chartRef.current = chart
  readingRef.current = reading

  const scroll = () => setTimeout(() => bottomRef.current?.scrollIntoView({ behavior: 'smooth', block: 'end' }), 100)

  const push = (item: NewItem) => {
    setItems((arr) => [...arr, { ...item, id: uid++ }])
    scroll()
  }
  const master = (segs: ReactNode[]) => { setBusy(true); push({ kind: 'master', segs }) }
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
    master(['多谢。', '正在为你排演，请稍候片刻。'])
    setStage('computing')
    const [y, m, d] = date.split('-').map(Number)
    const c = computeBazi(y, m, d, h, 30, gender)
    let zw: ZwChart | null = null
    try { zw = computeZiwei(y, m, d, h, gender) } catch { /* 忽略 */ }
    // 进度动画
    let p = 0
    const timer = setInterval(() => {
      p += 3 + Math.random() * 7
      setPct(Math.min(99, p))
      if (p >= 100) {
        clearInterval(timer)
        setChart(c)
        setZiwei(zw)
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
      <CardMsg title="四柱八字" sub={`公历 ${c.solarText} ｜ 农历 ${c.lunarText} ｜ 属${c.animal}`}>
        <PillarCards chart={c} />
        <div className="divider-ink" />
        <WheelSection chart={c} activeLn={currentLn(c)} />
        <ChartMeta chart={c} />
      </CardMsg>,
    )
    master([
      `你的命盘排好了。日元${c.dayGan}${c.dayGanWx}，生于${c.pillars[1].zhi}月，日主${c.strength.level}，喜`,
      <Term key="t" k="喜用神">{`${c.favorable.join('、')}`}</Term>,
      `。${r.geju.split('。')[2] ?? ''}。`,
      '这是你的命盘核心结构。你想先了解哪方面？',
    ])
  }

  const currentLn = (c: BaziChart): LiuNian | null => {
    const y = new Date().getFullYear()
    return liuNianRange(y, 1, c.dayGan)[0] ?? null
  }

  // ---------- 话题 ----------
  // echoText: 追加的用户气泡文案；传 null 表示用户已通过输入框发过话
  const runTopic = (topic: Topic, echoText: string | null = '') => {
    const c = chartRef.current
    const r = readingRef.current
    if (!c || !r) return
    setVisited((v) => [...v, topic])
    if (echoText !== null) {
      user(echoText || (topic.endsWith('势') || topic.endsWith('断') ? `那我的${topic}如何？` : `想看看${topic}。`))
    }

    const ln = currentLn(c)
    switch (topic) {
      case '五行分析': {
        master(['我们先看你的五行强弱。'])
        node(
          <CardMsg title="五行能量分布">
            <WuxingPctBars chart={c} />
            <Radar data={wuxingRadarData(c)} max={100} />
            <p className="reading-p" style={{ marginTop: 6 }}>{r.personality}</p>
          </CardMsg>,
        )
        break
      }
      case '十神关系': {
        const lnGod = ln ? ln.god : undefined
        master(['十神者，人事之网也——贵人、财富、才华、压力，皆在此图中各居其位。红点为命中所有，红圈为今岁当值。'])
        node(
          <CardMsg title="十神环绕 · 日主居中">
            <TenGodOrbit chart={c} activeGod={lnGod} />
            <p className="center-note">点<Term k="十神">十神</Term>名可查其义</p>
          </CardMsg>,
        )
        break
      }
      case '专业细盘': {
        master(['细盘在此。地支藏干、星运自坐、空亡纳音、神煞，柱柱分明；右二列为现行大运与流年。红字皆可点问。'])
        node(
          <CardMsg title="专业细盘">
            <ProTable chart={c} activeDayun={c.daYun.find((d) => { const y = new Date().getFullYear(); return y >= d.startYear && y <= d.endYear }) ?? c.daYun[0]} activeLn={ln} />
          </CardMsg>,
        )
        break
      }
      case '大运走势': {
        master([`${c.qiYunText}。大运十年一换，如行船换水道——下图便是你一生的水路起伏。`])
        node(<DayunCard chart={c} />)
        break
      }
      case '流年运势': {
        master(['来看你今年的流年运势。'])
        node(<LiunianCard chart={c} />)
        break
      }
      case '事业运势': {
        master(['来看你今年的事业运势。'])
        node(
          <CardMsg title="事业五维" sub="由命局十神推得">
            <Radar data={abilityRadarData(c)} max={100} />
            <p className="reading-p" style={{ marginTop: 4 }}>{r.career}</p>
          </CardMsg>,
        )
        break
      }
      case '财运走势': {
        master(['财帛之事，须看财星与身强身弱相配。'])
        node(
          <CardMsg title="财帛之道">
            <p className="reading-p">{r.wealth}</p>
          </CardMsg>,
        )
        break
      }
      case '感情运势': {
        master(['你的感情格局如下：'])
        node(
          <CardMsg title="姻缘情感">
            <InkArt name="love" height={140} />
            <p className="reading-p">{r.love}</p>
          </CardMsg>,
        )
        break
      }
      case '健康提点': {
        master(['身体是行运的本钱，且听老朽几句提点。'])
        node(
          <CardMsg title="康健养生">
            <p className="reading-p">{r.health}</p>
          </CardMsg>,
        )
        break
      }
      case '神煞照命': {
        master(['你命里照着这几颗星。吉者当用，凶者知避——不必惧，是提前递给你的信儿。'])
        node(
          <CardMsg title="神煞照命">
            <ShenshaSection chart={c} />
          </CardMsg>,
        )
        break
      }
      case '紫微星盘': {
        if (!ziwei) { master(['星盘一时布不开，且以八字为凭。']); break }
        master([`八字论气，斗数观星。你是${ziwei.fiveElementsClass}，命主${ziwei.soul}，身主${ziwei.body}。星名皆可点问。`])
        node(
          <CardMsg title="紫微星盘">
            <ZiweiChart chart={ziwei} gender={c.gender} />
          </CardMsg>,
        )
        break
      }
      case '命理总断': {
        master(['最后，老朽将此命从头道来——格局、性情、事业、财帛、姻缘、康健，一一剖解。'])
        node(
          <CardMsg title="命理总断">
            <ReadingSections reading={r} />
          </CardMsg>,
        )
        break
      }
    }
  }

  // 底部自由提问
  const onAsk = (text: string) => {
    if (stage !== 'ready') {
      user(text)
      master(['莫急，先把生辰告诉老朽，排出命盘，方能为你细断。'])
      return
    }
    const topic = detectTopic(text)
    user(text)
    if (topic) {
      runTopic(topic, null)
    } else {
      master(['此问尚在天机之外——你可以问老朽事业、财运、感情、健康、大运流年，或让老朽看看五行与紫微星盘。'])
    }
  }

  const suggestions: string[] = stage === 'ready'
    ? TOPIC_KEYS.filter((t) => !visited.includes(t)).slice(0, 4)
    : []

  return (
    <>
      <div className="chat-scroll">
        {items.map((it) => {
          if (it.kind === 'master') {
            return <MasterMsg key={it.id} segments={it.segs} onDone={() => { setBusy(false); scroll() }} />
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
        {stage === 'computing' && pct > 0 && <ProgressEnso label="排盘中" pct={pct} />}
        {!busy && stage === 'ready' && suggestions.length > 0 && (
          <Chips items={suggestions} onPick={(v) => runTopic(v as Topic)} />
        )}
        <div ref={bottomRef} />
      </div>
      <InputBar onSend={onAsk} />
    </>
  )
}

// ---------- 大运卡（内部可交互） ----------
function DayunCard({ chart }: { chart: BaziChart }) {
  const now = new Date().getFullYear()
  const init = Math.max(0, chart.daYun.findIndex((d) => now >= d.startYear && now <= d.endYear))
  const [idx, setIdx] = useState(init)
  const d = chart.daYun[idx]
  const god = tenGod(chart.dayGan, d.ganZhi[0])
  return (
    <CardMsg title="大运排盘" sub="每十年一运 · 点折线上的节点切换">
      <div className="dayun-strip">
        {chart.daYun.map((dy, i) => (
          <div key={dy.ganZhi + dy.startYear} className={`dayun-cell ${i === idx ? 'active' : ''}`} onClick={() => setIdx(i)}>
            <div className="dayun-gz">{dy.ganZhi}</div>
            <div className="dayun-age">{dy.startAge}–{dy.startAge + 9}岁</div>
          </div>
        ))}
      </div>
      <DayunLineChart chart={chart} activeIdx={idx} onPick={setIdx} />
      <p className="reading-p" style={{ marginTop: 8 }}>
        你{now >= d.startYear && now <= d.endYear ? '当前行' : '于此段行'}「{d.ganZhi}」大运（{d.startYear}—{d.endYear}，{god}运）。
        {['正官', '正印', '正财', '食神'].includes(god)
          ? '此运正星当值，宜稳中求进、积累根基，是修成正果的十年。'
          : ['七杀', '伤官', '劫财', '偏印'].includes(god)
            ? '此运动星当值，压力与机遇并存，敢闯者得势，唯忌意气用事。'
            : '此运气象平顺，宜按部就班经营，勿贪快求变。'}
      </p>
    </CardMsg>
  )
}

// ---------- 流年卡（内部可交互） ----------
function LiunianCard({ chart }: { chart: BaziChart }) {
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
      <h3 className="reading-h">{r.theme}</h3>
      <p className="reading-p">{r.text}</p>
      {r.extra && (
        <div className="badge-rows" style={{ marginTop: 8 }}>
          <div className="badge-row ji"><span className="badge-key">提点</span><span className="badge-val">{r.extra}。</span></div>
        </div>
      )}
    </CardMsg>
  )
}
