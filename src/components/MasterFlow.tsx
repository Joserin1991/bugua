// 大师问命：问年庚 → 掐指推演 → 逐步揭示天机
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
  { v: 0, label: '子时 23:00-00:59（早子）' }, { v: 1, label: '丑时 01:00-02:59' },
  { v: 3, label: '寅时 03:00-04:59' }, { v: 5, label: '卯时 05:00-06:59' },
  { v: 7, label: '辰时 07:00-08:59' }, { v: 9, label: '巳时 09:00-10:59' },
  { v: 11, label: '午时 11:00-12:59' }, { v: 13, label: '未时 13:00-14:59' },
  { v: 15, label: '申时 15:00-16:59' }, { v: 17, label: '酉时 17:00-18:59' },
  { v: 19, label: '戌时 19:00-20:59' }, { v: 21, label: '亥时 21:00-22:59' },
  { v: 23, label: '子时 23:00-23:59（晚子）' },
]

type Ask = 'gender' | 'date' | 'hour' | 'ritual' | 'reveal'

export function MasterFlow() {
  const [ask, setAsk] = useState<Ask>('gender')
  const [gender, setGender] = useState<'男' | '女' | null>(null)
  const [date, setDate] = useState('1995-08-16')
  const [hour, setHour] = useState(9)
  const [chart, setChart] = useState<BaziChart | null>(null)
  const [ziwei, setZiwei] = useState<ZwChart | null>(null)
  const [step, setStep] = useState(0)        // 已揭示到的步数
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

  // ---------- 揭示步骤 ----------
  interface RevealStep {
    speech: ReactNode[]
    content?: ReactNode
  }

  const steps: RevealStep[] = useMemo(() => {
    if (!chart || !reading) return []
    const zao = chart.gender === '男' ? '乾造' : '坤造'
    const maxWx = (Object.keys(chart.wuxingCount) as WuXing[]).reduce((a, b) => (chart.wuxingCount[a] >= chart.wuxingCount[b] ? a : b))
    const minWx = (Object.keys(chart.wuxingCount) as WuXing[]).reduce((a, b) => (chart.wuxingCount[a] <= chart.wuxingCount[b] ? a : b))
    const list: RevealStep[] = [
      {
        speech: [
          `唔……${zao}，生于${chart.lunarText.split(' ')[0]}，${chart.jieQi}之后。老朽掐指一算，你的`,
          <Term key="t" k="四柱八字" />,
          `已然立定——年柱${chart.pillars[0].gan}${chart.pillars[0].zhi}，月柱${chart.pillars[1].gan}${chart.pillars[1].zhi}，日柱${chart.pillars[2].gan}${chart.pillars[2].zhi}，时柱${chart.pillars[3].gan}${chart.pillars[3].zhi}。日柱天干${chart.dayGan}，便是你的`,
          <Term key="t2" k="日元" />,
          `，五行属${chart.dayGanWx}——此乃你命之本体。`,
        ],
        content: <SimplePillars chart={chart} />,
      },
      {
        speech: [
          '八个字不过是门面，门内乾坤方是真章。且看细盘——地支之中皆有',
          <Term key="t" k="藏干" />,
          '，干支映照日元而成',
          <Term key="t2" k="十神" />,
          '；柱柱各有',
          <Term key="t3" k="星运" />,
          '、',
          <Term key="t4" k="空亡" />,
          '、',
          <Term key="t5" k="纳音" />,
          '。此表右侧两列，便是你当下所行的大运与流年。凡有不明之处，点其名目，老朽自当细说。',
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
          `再观五行之气。你盘中${maxWx}气最盛，得${WUXING_TRAITS[maxWx].virtue}德之性；${minWx}气最弱，${WUXING_TRAITS[minWx].organ}与${WUXING_TRAITS[minWx].virtue}道皆宜留意涵养。综合得令、得地、得势，日主判为「${chart.strength.level}」，故老朽为你取${chart.favorable.join('、')}为`,
          <Term key="t" k="喜用神" />,
          `，忌${chart.unfavorable.join('、')}。记住这几个字——衣色、方位、行业，皆可依此趋吉。`,
        ],
        content: <WuxingSection chart={chart} />,
      },
      {
        speech: [
          '你的命上还照着几颗',
          <Term key="t" k="神煞" />,
          '。神煞如天上使者，吉者暗中扶持，凶者提点防范——不必惧，知其所在，便可用其所长。',
        ],
        content: <ShenshaSection chart={chart} />,
      },
      {
        speech: [
          '八字既明，老朽为你铸一面',
          <Term key="t" k="命盘天衡" />,
          '。红针所指，便是今岁太岁所在。往后你点选大运流年，此盘亦随之转动——命运流转，尽在盘中。',
        ],
        content: <WheelSection chart={chart} activeLn={activeLn} />,
      },
      {
        speech: [
          `命如舟，运如水。${chart.qiYunText}。你如今行${activeDayun?.ganZhi ?? ''}${activeDayun ? `大运（${activeDayun.god}运）` : ''}，今岁流年${activeLn?.ganZhi ?? ''}。点选任一`,
          <Term key="t" k="大运" />,
          '与',
          <Term key="t2" k="流年" />,
          '，老朽为你细断那十年、那一年的气象。',
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
          '八字论气数，斗数观星垣。老朽再为你布一张紫微星盘——十二宫分列，众星各守其垣。你是',
          <Term key="t" k="五行局">{ziwei.fiveElementsClass}</Term>,
          `，命主${ziwei.soul}，身主${ziwei.body}。星曜、`,
          <Term key="t2" k="四化" />,
          '、',
          <Term key="t3" k="大限" />,
          '皆在盘上，点星名可知其义，点宫格可观其垣。',
        ],
        content: <ZiweiChart chart={ziwei} gender={chart.gender} />,
      } satisfies RevealStep] : []),
      {
        speech: [
          '最后，且听老朽将此命从头道来——格局、性情、事业、财帛、姻缘、康健，一一为你剖解。',
        ],
        content: <ReadingSections reading={reading} />,
      },
      {
        speech: [
          '天机已尽于此。',
          '命由天定，运在人为——盘上所示是「势」，路怎么走，终究在你自己脚下。',
          '若有他事相问，可再来问卦；若为亲友问命，老朽随时恭候。',
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

  return (
    <div className="master-dialog">
      {/* 开场 */}
      <MasterBubble
        done={ask !== 'gender'}
        segments={[
          '贵客请坐。',
          '老朽玄机子，隐于此阁，观星推命四十余载。',
          '今日所测何人——是乾造，还是坤造？',
        ]}
      />
      {ask === 'gender' && (
        <div className="master-actions fade-in">
          <button className="btn-ghost" onClick={() => { setGender('男'); setAsk('date') }}>乾造 · 男命</button>
          <button className="btn-ghost" onClick={() => { setGender('女'); setAsk('date') }}>坤造 · 女命</button>
        </div>
      )}
      {gender && <GuestBubble>{gender === '男' ? '乾造，男命。' : '坤造，女命。'}</GuestBubble>}

      {/* 问年庚 */}
      {gender && (
        <MasterBubble
          done={ask !== 'date'}
          segments={[
            `好，${gender === '男' ? '乾造' : '坤造'}。`,
            '敢问贵客年庚——何年、何月、何日降生？公历即可，老朽自会换算农历节气。',
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
          <button className="btn-gold" onClick={() => { if (date) { setAsk('hour'); scrollDown() } }}>回禀大师</button>
        </div>
      )}
      {(ask === 'hour' || ask === 'ritual' || ask === 'reveal') && (
        <GuestBubble>{date.split('-')[0]}年{Number(date.split('-')[1])}月{Number(date.split('-')[2])}日生。</GuestBubble>
      )}

      {/* 问时辰 */}
      {(ask === 'hour' || ask === 'ritual' || ask === 'reveal') && (
        <MasterBubble
          done={ask !== 'hour'}
          segments={[
            '几时所生？',
            '时辰定时柱，差之一辰，命盘便谬以千里。若实在不知，可择大概时分。',
          ]}
        />
      )}
      {ask === 'hour' && (
        <div className="master-actions fade-in">
          <select value={hour} onChange={(e) => setHour(Number(e.target.value))} className="master-input">
            {HOUR_OPTIONS.map((h) => <option key={h.label} value={h.v}>{h.label}</option>)}
          </select>
          <button className="btn-gold" onClick={confirmHour}>如实相告</button>
        </div>
      )}
      {(ask === 'ritual' || ask === 'reveal') && (
        <GuestBubble>{HOUR_OPTIONS.find((h) => h.v === hour)?.label.split(' ')[0]}生人。</GuestBubble>
      )}

      {/* 仪式 */}
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
