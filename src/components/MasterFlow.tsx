// 大师问命：问话如唠家常，讲解专业而暖心，一步步将天机道来
import { useMemo, useRef, useState, type ReactNode } from 'react'
import { computeBazi, liuNianRange, type BaziChart } from '../lib/bazi'
import { computeZiwei, type ZwChart } from '../lib/ziwei'
import { interpretBazi } from '../lib/interpret'
import { WUXING_TRAITS, type WuXing } from '../lib/wuxing'
import { MasterBubble, GuestBubble, Term } from './Master'
import { RitualOverlay } from './RitualOverlay'
import { ZiweiChart } from './ZiweiChart'
import {
  SimplePillars, ProTable, ChartMeta, WuxingSection, ShenshaSection,
  WheelSection, DayunSection, ReadingSections,
} from './ChartSections'

const HOUR_OPTIONS = [
  { v: 0, label: '深夜 23:00–00:59（早子时）' }, { v: 1, label: '凌晨 01:00–02:59（丑时）' },
  { v: 3, label: '凌晨 03:00–04:59（寅时）' }, { v: 5, label: '清晨 05:00–06:59（卯时）' },
  { v: 7, label: '早上 07:00–08:59（辰时）' }, { v: 9, label: '上午 09:00–10:59（巳时）' },
  { v: 11, label: '中午 11:00–12:59（午时）' }, { v: 13, label: '下午 13:00–14:59（未时）' },
  { v: 15, label: '下午 15:00–16:59（申时）' }, { v: 17, label: '傍晚 17:00–18:59（酉时）' },
  { v: 19, label: '晚上 19:00–20:59（戌时）' }, { v: 21, label: '夜里 21:00–22:59（亥时）' },
  { v: 23, label: '深夜 23:00–23:59（晚子时）' },
]

// 五行性情的白话说法
const WX_PLAIN: Record<WuXing, string> = {
  木: '生长向上、心怀仁厚',
  火: '热忱明亮、感染旁人',
  土: '沉稳可靠、说到做到',
  金: '果断利落、讲义气',
  水: '聪慧灵动、随物赋形',
}

type Ask = 'gender' | 'date' | 'hour' | 'ritual' | 'reveal'

export function MasterFlow() {
  const [ask, setAsk] = useState<Ask>('gender')
  const [gender, setGender] = useState<'男' | '女' | null>(null)
  const [date, setDate] = useState('1995-08-16')
  const [hour, setHour] = useState(9)
  const [chart, setChart] = useState<BaziChart | null>(null)
  const [ziwei, setZiwei] = useState<ZwChart | null>(null)
  const [step, setStep] = useState(0)
  const [typingDone, setTypingDone] = useState(false)
  const [dayunIdx, setDayunIdx] = useState(0)
  const [lnYear, setLnYear] = useState<number | null>(null)
  const bottomRef = useRef<HTMLDivElement>(null)

  const reading = useMemo(() => (chart ? interpretBazi(chart) : null), [chart])
  const activeDayun = chart?.daYun[dayunIdx] ?? null
  const liuNians = useMemo(() => {
    if (!chart || !activeDayun) return []
    return liuNianRange(activeDayun.startYear, Math.min(10, activeDayun.endYear - activeDayun.startYear + 1), chart.dayGan)
  }, [chart, activeDayun])
  const activeLn = liuNians.find((l) => l.year === lnYear) ?? null

  const scrollDown = () => setTimeout(() => bottomRef.current?.scrollIntoView({ behavior: 'smooth', block: 'end' }), 120)

  const confirmHour = () => {
    const [y, m, d] = date.split('-').map(Number)
    if (!y || !m || !d || !gender) return
    const c = computeBazi(y, m, d, hour, 30, gender)
    setChart(c)
    try {
      setZiwei(computeZiwei(y, m, d, hour, gender))
    } catch {
      setZiwei(null)
    }
    const now = new Date().getFullYear()
    const idx = c.daYun.findIndex((dy) => now >= dy.startYear && now <= dy.endYear)
    setDayunIdx(idx >= 0 ? idx : 0)
    setLnYear(now)
    setAsk('ritual')
  }

  const restart = () => {
    setAsk('gender'); setGender(null); setChart(null); setZiwei(null)
    setStep(0); setTypingDone(false)
  }

  interface RevealStep {
    speech: ReactNode[]
    content?: ReactNode
  }

  const steps: RevealStep[] = useMemo(() => {
    if (!chart || !reading) return []
    const maxWx = (Object.keys(chart.wuxingCount) as WuXing[]).reduce((a, b) => (chart.wuxingCount[a] >= chart.wuxingCount[b] ? a : b))
    const minWx = (Object.keys(chart.wuxingCount) as WuXing[]).reduce((a, b) => (chart.wuxingCount[a] <= chart.wuxingCount[b] ? a : b))
    const strengthPlain = chart.strength.level.includes('强')
      ? '底气足、能扛事，最怕的反而是用力过猛'
      : chart.strength.level === '中和'
        ? '不偏不倚，是难得的平稳之相'
        : '心思细、感受深，最需要的是懂得借力与休息'
    const list: RevealStep[] = [
      {
        speech: [
          `唔……农历${chart.lunarText.split(' ')[0]}，${chart.jieQi}之后出生。好，你的`,
          <Term key="t" k="四柱八字" />,
          `排出来了——${chart.pillars.map((p) => p.gan + p.zhi).join('、')}，一共八个字。`,
          '别被这几个字唬住，说白了，它就是你落地那一刻，天地间年、月、日、时四股气的一张「快照」。',
          `其中日柱头一个字「${chart.dayGan}」，就是八字里的「你自己」，命书里称`,
          <Term key="t2" k="日元" />,
          `，五行属${chart.dayGanWx}——往后所有的解读，都围着这个字转。`,
        ],
        content: <SimplePillars chart={chart} />,
      },
      {
        speech: [
          '接着看这张细盘。密密麻麻不必怕——每一格，都是那八个字里长出来的细节。',
          '地支里暗藏的字叫',
          <Term key="t" k="藏干" />,
          '，干支对照你自己，就照出了',
          <Term key="t2" k="十神" />,
          '——听着玄，其实说的就是：你命里的贵人、财富、才华、压力，各自站在什么位置。',
          '右边两列，是你正在走的运和今年的年景。红色虚线的词都能点，点开老朽讲给你听，不懂就问，莫客气。',
        ],
        content: (
          <>
            <ProTable chart={chart} activeDayun={activeDayun} activeLn={activeLn} />
            <ChartMeta chart={chart} />
          </>
        ),
      },
      {
        speech: [
          `再看五行。你盘中${maxWx}气最足——骨子里自带${WX_PLAIN[maxWx]}的劲儿，这是老天爷给你的本钱。`,
          `${minWx}气弱了些，但记住：五行弱不是毛病，只是先天带得少，后天补上便是——穿${minWx === '水' ? '蓝黑' : minWx === '木' ? '青绿' : minWx === '火' ? '红' : minWx === '金' ? '白' : '黄'}色、往${WUXING_TRAITS[minWx].direction}走动，都是补法。`,
          `合起来看，你日主${chart.strength.level}——${strengthPlain}。所以老朽给你取${chart.favorable.join('、')}为`,
          <Term key="t" k="喜用神" />,
          '。这两个字请记牢，它们是你一生顺风的方向。',
        ],
        content: <WuxingSection chart={chart} />,
      },
      {
        speech: [
          '你命里还照着几颗星，术数里叫',
          <Term key="t" k="神煞" />,
          '。莫紧张——神煞听着吓人，多数其实是护着你的：像天乙贵人，说的是你危难时总有人伸手；驿马，说的是你越走动越有运。',
          '就算有听着凶的，也别怕。知道它在哪儿，绕开便是——命理从来不是吓唬人，是提前给你递个信儿。',
        ],
        content: <ShenshaSection chart={chart} />,
      },
      {
        speech: [
          '八字看完，老朽为你铸一面',
          <Term key="t" k="命盘天衡" />,
          '。红针指着的，就是你今年站的位置。',
          '往后你点选大运流年，这盘会跟着转。你看着它转，就会明白一件事：命不是刻死的碑，是一年一年流动的水。',
        ],
        content: <WheelSection chart={chart} activeLn={activeLn} />,
      },
      {
        speech: [
          `命好比船，运好比水。${chart.qiYunText}。`,
          `你如今行的是${activeDayun?.ganZhi ?? ''}运，今年是${activeLn?.ganZhi ?? ''}年。`,
          '每十年换一段水路，有顺流也有逆流——顺的时候莫狂，逆的时候莫馁，水总会转弯。',
          '点下面的格子，老朽给你细讲每一段水路、每一年的年景。',
        ],
        content: (
          <DayunSection
            chart={chart}
            dayunIdx={dayunIdx}
            lnYear={lnYear}
            liuNians={liuNians}
            onSelectDayun={(i) => { setDayunIdx(i); setLnYear(chart.daYun[i].startYear) }}
            onSelectYear={setLnYear}
          />
        ),
      },
      ...(ziwei ? [{
        speech: [
          '八字论的是气，星盘观的是象。老朽再为你摆一张紫微星盘——把你出生那一刻的星空，安进十二个宫格里，事业、姻缘、财帛、健康，各归各位。',
          `你是`,
          <Term key="t" k="五行局">{ziwei.fiveElementsClass}</Term>,
          `，命主${ziwei.soul}、身主${ziwei.body}。`,
          '星名都能点——点开就知道那颗星在你命里管什么事。慢慢看，不急。',
        ],
        content: <ZiweiChart chart={ziwei} gender={chart.gender} />,
      } satisfies RevealStep] : []),
      {
        speech: [
          '最后，听老朽把这命从头给你说透——不绕玄话，只说你听得懂的。',
        ],
        content: <ReadingSections reading={reading} />,
      },
      {
        speech: [
          '天机说尽，茶也该凉了。',
          '记住老朽一句话：盘上写的是「势」，不是「定数」。命给你发了牌，牌怎么打，从来都在你自己手里。',
          '你今日肯坐下来认识自己，已经胜过许多浑浑噩噩赶路的人。去吧——有难处，随时回来找老朽。',
        ],
      },
    ]
    return list
  }, [chart, reading, ziwei, activeDayun, activeLn, dayunIdx, lnYear, liuNians])

  const advance = () => {
    setTypingDone(false)
    setStep((s) => s + 1)
    scrollDown()
  }

  const hourLabel = HOUR_OPTIONS.find((h) => h.v === hour)?.label ?? ''

  return (
    <div className="master-dialog">
      {/* 开场 */}
      <MasterBubble
        done={ask !== 'gender'}
        segments={[
          '贵客请坐，不必拘礼。',
          '老朽玄机子，在这阁里看了四十多年的命。今日想看谁的命？',
          '先告诉老朽——测男命，还是女命？',
        ]}
      />
      {ask === 'gender' && (
        <div className="master-actions fade-in">
          <button className="btn-ghost" onClick={() => { setGender('男'); setAsk('date') }}>男命</button>
          <button className="btn-ghost" onClick={() => { setGender('女'); setAsk('date') }}>女命</button>
        </div>
      )}
      {gender && <GuestBubble>{gender === '男' ? '看男命。' : '看女命。'}</GuestBubble>}

      {/* 问生日 */}
      {gender && (
        <MasterBubble
          done={ask !== 'date'}
          segments={[
            '好。',
            '哪年哪月哪日出生的？阳历就行——农历、节气这些麻烦事，老朽自会替你换算，不劳费心。',
          ]}
        />
      )}
      {ask === 'date' && (
        <div className="master-actions fade-in">
          <input
            type="date" value={date} min="1901-01-01" max="2099-12-31"
            onChange={(e) => setDate(e.target.value)}
            className="master-input"
          />
          <button className="btn-gold" onClick={() => { if (date) { setAsk('hour'); scrollDown() } }}>就是这天</button>
        </div>
      )}
      {(ask === 'hour' || ask === 'ritual' || ask === 'reveal') && (
        <GuestBubble>{date.split('-')[0]}年{Number(date.split('-')[1])}月{Number(date.split('-')[2])}日。</GuestBubble>
      )}

      {/* 问时辰 */}
      {(ask === 'hour' || ask === 'ritual' || ask === 'reveal') && (
        <MasterBubble
          done={ask !== 'hour'}
          segments={[
            '几点钟出生的？',
            '记不清确切钟点也不打紧，选个大概——早上、晌午还是半夜，越接近越好。',
          ]}
        />
      )}
      {ask === 'hour' && (
        <div className="master-actions fade-in">
          <select value={hour} onChange={(e) => setHour(Number(e.target.value))} className="master-input">
            {HOUR_OPTIONS.map((h) => <option key={h.label} value={h.v}>{h.label}</option>)}
          </select>
          <button className="btn-gold" onClick={confirmHour}>差不多这时候</button>
        </div>
      )}
      {(ask === 'ritual' || ask === 'reveal') && (
        <GuestBubble>{hourLabel.split('（')[0]}出生的。</GuestBubble>
      )}

      {/* 掐指推演 */}
      {ask === 'ritual' && chart && (
        <RitualOverlay chart={chart} onDone={() => { setAsk('reveal'); setStep(0); setTypingDone(false); scrollDown() }} />
      )}

      {/* 逐步揭示 */}
      {ask === 'reveal' && steps.slice(0, step + 1).map((s, i) => (
        <div key={i}>
          <MasterBubble
            segments={s.speech}
            done={i < step}
            onDone={i === step ? () => { setTypingDone(true); scrollDown() } : undefined}
          />
          {(i < step || typingDone) && s.content && (
            <section className="panel fade-in reveal-panel">{s.content}</section>
          )}
        </div>
      ))}

      {ask === 'reveal' && typingDone && step < steps.length - 1 && (
        <div className="master-actions fade-in">
          <button className="btn-gold" onClick={advance}>
            {step === steps.length - 2 ? '请大师总断' : '愿闻其详'}
          </button>
        </div>
      )}
      {ask === 'reveal' && typingDone && step >= steps.length - 1 && (
        <div className="master-actions fade-in">
          <button className="btn-ghost" onClick={restart}>再问一命</button>
        </div>
      )}
      <div ref={bottomRef} />
    </div>
  )
}
