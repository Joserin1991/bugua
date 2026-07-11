// 排盘展示区块：供「大师问命」流程逐步揭示复用
import { useMemo } from 'react'
import { columnDetail, type BaziChart, type ColumnDetail, type DaYunItem, type LiuNian } from '../lib/bazi'
import { interpretLiuNian, type BaziReading } from '../lib/interpret'
import { WUXING_COLOR, WUXING_LIST } from '../lib/wuxing'
import { DestinyWheel } from './DestinyWheel'
import { Term } from './Master'
import { CloudDivider } from './Decor'

// 四柱简盘（初现天机：只有干支）
export function SimplePillars({ chart }: { chart: BaziChart }) {
  return (
    <div className="pillars-scroll">
      <div className="pillars-grid pillars-simple">
        <div className="pg-rowlabel"></div>
        {chart.pillars.map((p) => <div key={p.label} className="pg-head">{p.label}</div>)}
        <div className="pg-rowlabel">天干</div>
        {chart.pillars.map((p) => <div key={p.label} className={`pg-gan wx-${p.ganWx}`}>{p.gan}</div>)}
        <div className="pg-rowlabel">地支</div>
        {chart.pillars.map((p) => <div key={p.label} className={`pg-zhi wx-${p.zhiWx}`}>{p.zhi}</div>)}
      </div>
    </div>
  )
}

// 专业细盘（含大运流年列）
export function ProTable({
  chart, activeDayun, activeLn,
}: {
  chart: BaziChart
  activeDayun: DaYunItem | null
  activeLn: LiuNian | null
}) {
  const columns = useMemo(() => {
    const yearZhi = chart.pillars[0].zhi
    const dayZhi = chart.pillars[2].zhi
    const cols: { label: string; detail: ColumnDetail; lu: boolean }[] = chart.pillars.map((p) => ({
      label: p.label,
      lu: false,
      detail: columnDetail(p.gan, p.zhi, chart.dayGan, yearZhi, dayZhi, p.label === '日柱'),
    }))
    if (activeDayun) cols.push({ label: '大运', lu: true, detail: columnDetail(activeDayun.ganZhi[0], activeDayun.ganZhi[1], chart.dayGan, yearZhi, dayZhi) })
    if (activeLn) cols.push({ label: '流年', lu: true, detail: columnDetail(activeLn.ganZhi[0], activeLn.ganZhi[1], chart.dayGan, yearZhi, dayZhi) })
    return cols
  }, [chart, activeDayun, activeLn])

  const rows: [string, string, (c: { label: string; detail: ColumnDetail }) => React.ReactNode][] = [
    ['十神', '十神', (c) => c.detail.ganGod === '日元'
      ? <Term k="日元">日元</Term>
      : <Term k={c.detail.ganGod}>{c.detail.ganGod}</Term>],
    ['天干', '', (c) => <span className={`wx-${c.detail.ganWx}`}>{c.detail.gan}</span>],
    ['地支', '', (c) => <span className={`wx-${c.detail.zhiWx}`}>{c.detail.zhi}</span>],
    ['藏干', '藏干', (c) => c.detail.cangGan.map((g) => (
      <div key={g.gan}>
        <span className={`wx-${g.wx}`}>{g.gan}</span>
        <span style={{ opacity: 0.8 }}> <Term k={g.god}>{g.god}</Term></span>
      </div>
    ))],
    ['星运', '星运', (c) => c.detail.xingYun],
    ['自坐', '自坐', (c) => c.detail.ziZuo],
    ['空亡', '空亡', (c) => c.detail.kong],
    ['纳音', '纳音', (c) => c.detail.naYin],
    ['神煞', '神煞', (c) => c.detail.shenSha.length
      ? c.detail.shenSha.map((s) => <div key={s}>{s}</div>)
      : <span style={{ opacity: 0.4 }}>—</span>],
  ]

  return (
    <div className="pillars-scroll">
      <div className="pillars-grid" style={{ gridTemplateColumns: `72px repeat(${columns.length}, minmax(96px, 1fr))` }}>
        <div className="pg-rowlabel"></div>
        {columns.map((c) => <div key={c.label} className={`pg-head ${c.lu ? 'pg-lucol' : ''}`}>{c.label}</div>)}
        {rows.map(([label, termKey, render]) => (
          <RowGroup key={label} label={label} termKey={termKey} columns={columns} render={render} />
        ))}
      </div>
    </div>
  )
}

function RowGroup({
  label, termKey, columns, render,
}: {
  label: string
  termKey: string
  columns: { label: string; detail: ColumnDetail }[]
  render: (c: { label: string; detail: ColumnDetail }) => React.ReactNode
}) {
  const cellClass: Record<string, string> = {
    十神: 'pg-shishen', 天干: 'pg-gan', 地支: 'pg-zhi', 藏干: 'pg-canggan',
    星运: 'pg-small', 自坐: 'pg-small', 空亡: 'pg-small', 纳音: 'pg-nayin', 神煞: 'pg-shensha',
  }
  return (
    <>
      <div className="pg-rowlabel">{termKey ? <Term k={termKey}>{label}</Term> : label}</div>
      {columns.map((c) => <div key={c.label} className={cellClass[label]}>{render(c)}</div>)}
    </>
  )
}

export function ChartMeta({ chart }: { chart: BaziChart }) {
  return (
    <div className="tag-row" style={{ marginTop: 16, justifyContent: 'center' }}>
      <span className="mystic-tag"><Term k="命宫">命宫</Term> {chart.mingGong}</span>
      <span className="mystic-tag"><Term k="胎元">胎元</Term> {chart.taiYuan}</span>
      <span className="mystic-tag"><Term k="身强身弱">日主</Term> {chart.dayGan}{chart.dayGanWx} · {chart.strength.level}</span>
      <span className="mystic-tag"><Term k="喜用神">喜用</Term> {chart.favorable.join(' ')}</span>
      <span className="mystic-tag"><Term k="忌神">忌神</Term> {chart.unfavorable.join(' ')}</span>
    </div>
  )
}

export function WuxingSection({ chart }: { chart: BaziChart }) {
  const maxWx = Math.max(...WUXING_LIST.map((w) => chart.wuxingCount[w]), 1)
  return (
    <div className="wuxing-bars">
      {WUXING_LIST.map((w) => (
        <div key={w} className="wx-bar-row">
          <span className={`wx-bar-label wx-${w}`}>{w}{chart.favorable.includes(w) ? ' ✦' : ''}</span>
          <div className="wx-bar-track">
            <div className="wx-bar-fill" style={{ width: `${(chart.wuxingCount[w] / maxWx) * 100}%`, color: WUXING_COLOR[w] }} />
          </div>
          <span className="wx-bar-count">{chart.wuxingCount[w]}</span>
        </div>
      ))}
    </div>
  )
}

export function ShenshaSection({ chart }: { chart: BaziChart }) {
  if (!chart.shenSha.length) return <p className="reading-p">此造四柱清净，并无显著神煞照命——平淡即是安稳之福。</p>
  return (
    <div className="shensha-grid">
      {chart.shenSha.map((s, i) => (
        <div className="shensha-item" key={i}>
          <div className="ss-name">{s.name} <small style={{ color: 'var(--ink-faint)' }}>{s.where}</small></div>
          <div className="ss-desc">{s.desc}</div>
        </div>
      ))}
    </div>
  )
}

export function WheelSection({ chart, activeLn }: { chart: BaziChart; activeLn: LiuNian | null }) {
  return (
    <div className="wheel-stage">
      <DestinyWheel
        chart={chart}
        highlightZhi={activeLn?.zhi ?? chart.pillars[0].zhi}
        highlightLabel={activeLn ? `流年 ${activeLn.ganZhi} · ${activeLn.year}` : undefined}
      />
      <span className="wheel-hint">
        外为<Term k="命盘天衡">地支十二宫</Term> · 中为<Term k="十二消息卦">十二消息卦</Term> · 内为月建 · 朱印标注四柱本位
      </span>
    </div>
  )
}

export function DayunSection({
  chart, dayunIdx, lnYear, liuNians, onSelectDayun, onSelectYear,
}: {
  chart: BaziChart
  dayunIdx: number
  lnYear: number | null
  liuNians: LiuNian[]
  onSelectDayun: (i: number) => void
  onSelectYear: (y: number) => void
}) {
  const activeLn = liuNians.find((l) => l.year === lnYear) ?? null
  const lnReading = activeLn ? interpretLiuNian(activeLn, chart) : null
  return (
    <>
      <p className="panel-caption" style={{ marginBottom: 10 }}>{chart.qiYunText}</p>
      <div className="dayun-strip">
        {chart.daYun.map((d, i) => (
          <div
            key={d.ganZhi + d.startYear}
            className={`dayun-cell ${i === dayunIdx ? 'active' : ''}`}
            onClick={() => onSelectDayun(i)}
          >
            <div className="dayun-gz">{d.ganZhi}</div>
            <div className="dayun-age">{d.startAge}岁起<br />{d.startYear}—{d.endYear}</div>
            <div className="pg-shishen" style={{ marginTop: 4 }}>{d.god}运</div>
          </div>
        ))}
      </div>
      <div className="liunian-grid">
        {liuNians.map((l) => (
          <div
            key={l.year}
            className={`liunian-cell ${l.year === lnYear ? 'active' : ''}`}
            onClick={() => onSelectYear(l.year)}
          >
            <div className="liunian-gz">{l.ganZhi}</div>
            <div className="liunian-year">{l.year} · {l.god}</div>
          </div>
        ))}
      </div>
      {lnReading && (
        <div className="reading-section fade-in" key={lnYear}>
          <h3 className="reading-h">{lnReading.theme}</h3>
          <p className="reading-p">{lnReading.text}</p>
          {lnReading.extra && <p className="reading-p" style={{ color: 'var(--seal)' }}>⚑ {lnReading.extra}。</p>}
        </div>
      )}
    </>
  )
}

export function ReadingSections({ reading }: { reading: BaziReading }) {
  const items: [string, string][] = [
    ['格局总论', reading.geju],
    ['禀性气质', reading.personality],
    ['事业方向', reading.career],
    ['财帛之道', reading.wealth],
    ['姻缘情感', reading.love],
    ['康健养生', reading.health],
    ['趋吉之道', reading.advice],
  ]
  return (
    <div className="reading-section">
      <CloudDivider />
      {items.map(([h, t]) => (
        <div key={h}>
          <h3 className="reading-h">{h}</h3>
          <p className="reading-p">{t}</p>
        </div>
      ))}
    </div>
  )
}
