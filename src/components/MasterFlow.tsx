// 大师问命：问话如唠家常，讲解专业而暖心，一步步将天机道来
import { useMemo, useRef, useState, type ReactNode } from 'react'
import { computeBazi, liuNianRange, type BaziChart } from '../lib/bazi'
import { computeZiwei, type ZwChart } from '../lib/ziwei'
import { interpretBazi } from '../lib/interpret'
import type { WuXing } from '../lib/wuxing'
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
  const [explained, setExplained] = useState<number[]>([])
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
    setStep(0); setTypingDone(false); setExplained([])
  }

  interface RevealStep {
    speech: ReactNode[]      // 专业断语（先行）
    plain?: ReactNode[]      // 白话细解（「此话怎讲？」后展开）
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
          `唔……${chart.gender === '男' ? '乾造' : '坤造'}，生于农历${chart.lunarText.split(' ')[0]}，${chart.jieQi}之后。`,
          <Term key="t" k="四柱八字" />,
          `既立：${chart.pillars.map((p) => p.gan + p.zhi).join('　')}。`,
          <Term key="t2" k="日元" />,
          `${chart.dayGan}${chart.dayGanWx}，生于${chart.pillars[1].zhi}月。`,
        ],
        plain: [
          '此话怎讲？不难——这八个字，就是你落地那一刻，天地间年、月、日、时四股气的一张「快照」。',
          `其中日柱头一个字「${chart.dayGan}」，就是八字里的「你自己」，往后所有解读都围着它转。`,
          '八字没有好坏之分，只有配得巧不巧。且往下看。',
        ],
        content: <SimplePillars chart={chart} />,
      },
      {
        speech: [
          '细盘在此。地支',
          <Term key="t" k="藏干" />,
          '映出',
          <Term key="t2" k="十神" />,
          '，柱柱各有',
          <Term key="t3" k="星运" />,
          '、',
          <Term key="t4" k="自坐" />,
          '、',
          <Term key="t5" k="空亡" />,
          '、',
          <Term key="t6" k="纳音" />,
          '；右二列为现行大运与流年太岁。红字名目皆可点。',
        ],
        plain: [
          '看着密，其实一点就通：十神说的是你命里的贵人、财富、才华、压力各自站在什么位置；藏干是地支里暗藏的底牌；星运空亡，是每根柱子的气数盛衰。',
          '不必一次看懂——哪个词不明白，点它，老朽讲到你懂为止。',
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
          `五行气数：${(['木', '火', '土', '金', '水'] as WuXing[]).map((w) => `${w}${chart.wuxingCount[w]}`).join('、')}。`,
          `${maxWx}气当旺，${minWx}气式微。综合得令、得地、得势，日主判「${chart.strength.level}」。`,
          `扶抑取用，以${chart.favorable.join('、')}为`,
          <Term key="t" k="喜用神" />,
          `，忌${chart.unfavorable.join('、')}。`,
        ],
        plain: [
          `白话说：你骨子里${maxWx}的劲儿最足——${WX_PLAIN[maxWx]}，这是老天爷给你的本钱。${minWx}弱了些，但五行弱不是毛病，后天补上便是：穿对颜色、走对方位，都是补法。`,
          `日主${chart.strength.level}，意思是你${strengthPlain}。`,
          `「喜用神」这三个字请记牢——${chart.favorable.join('、')}就是你一生顺风的方向，选行业、挑方位、定颜色，都照着它来，错不了。`,
        ],
        content: <WuxingSection chart={chart} />,
      },
      {
        speech: [
          '再看',
          <Term key="t" k="神煞" />,
          '：',
          chart.shenSha.length
            ? chart.shenSha.slice(0, 4).map((s) => `${s.name}临${s.where}`).join('，') + '。吉者当用，凶者当制。'
            : '四柱清净，无甚神煞——亦是安稳之相。',
        ],
        plain: [
          '神煞听着吓人，多数其实是护着你的：天乙贵人，说的是你危难时总有人伸手；驿马，说的是你越走动越有运；桃花，是人缘魅力。',
          '就算有听着凶的也别怕——知道它在哪儿，绕开便是。命理从来不是吓唬人，是提前给你递个信儿。',
        ],
        content: <ShenshaSection chart={chart} />,
      },
      {
        speech: [
          <Term key="t" k="命盘天衡" />,
          '既成。外环十二宫，中列',
          <Term key="t2" k="十二消息卦" />,
          '，朱印标四柱本位，红针所指为流年太岁。',
        ],
        plain: [
          '这面盘，就是你的命摊开在天地十二宫里的样子。红针指着的，是你今年站的位置。',
          '往后你点选大运流年，盘会跟着转——你看着它转，就会明白：命不是刻死的碑，是一年一年流动的水。',
        ],
        content: <WheelSection chart={chart} activeLn={activeLn} />,
      },
      {
        speech: [
          `${chart.qiYunText}。`,
          `现行${activeDayun?.ganZhi ?? ''}${activeDayun ? `大运（${activeDayun.god}）` : ''}，流年${activeLn?.ganZhi ?? ''}太岁${activeLn ? `（${activeLn.god}）` : ''}。`,
          '点选任一',
          <Term key="t" k="大运" />,
          '与',
          <Term key="t2" k="流年" />,
          '，细盘与天衡随之更易。',
        ],
        plain: [
          '命好比船，运好比水——大运就是你十年一段的水路，流年是每一年的风浪。',
          '有顺流也有逆流：顺的时候莫狂，逆的时候莫馁，水总会转弯。点下面的格子，老朽给你细讲每段水路的吉凶。',
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
          '八字论气，斗数观星。紫微星盘布毕——',
          <Term key="t" k="五行局">{ziwei.fiveElementsClass}</Term>,
          `，命主${ziwei.soul}，身主${ziwei.body}。十四正曜各守其垣，`,
          <Term key="t2" k="四化" />,
          '飞布，',
          <Term key="t3" k="大限" />,
          '十年一宫。',
        ],
        plain: [
          '这张盘，是把你出生那一刻的星空安进十二个宫格里——事业、姻缘、财帛、健康，各归各位，一格管一摊事。',
          '每颗星名都能点，点开就知道它在你命里管什么。慢慢看，不急——星星等了你几十年，不差这一会儿。',
        ],
        content: <ZiweiChart chart={ziwei} gender={chart.gender} />,
      } satisfies RevealStep] : []),
      {
        speech: [
          '最后，听老朽将此命从头道来——格局、性情、事业、财帛、姻缘、康健，一一剖解。',
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
          {(i < step || typingDone) && s.plain && !explained.includes(i) && (
            <div className="explain-row fade-in">
              <button className="explain-btn" onClick={() => { setExplained((e) => [...e, i]); scrollDown() }}>
                此话怎讲？
              </button>
            </div>
          )}
          {s.plain && explained.includes(i) && (
            <MasterBubble segments={s.plain} onDone={i === step ? scrollDown : undefined} />
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
