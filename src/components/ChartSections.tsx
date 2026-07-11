// 复用盘面区块：专业细盘、命盘天衡、神煞、命理总断
import { useMemo } from 'react'
import { columnDetail, type BaziChart, type ColumnDetail, type DaYunItem, type LiuNian } from '../lib/bazi'
import type { BaziReading } from '../lib/interpret'
import { DestinyWheel } from './DestinyWheel'
import { Term } from './Master'

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

  const cellClass: Record<string, string> = {
    十神: 'pg-shishen', 天干: 'pg-gan', 地支: 'pg-zhi', 藏干: 'pg-canggan',
    星运: 'pg-small', 自坐: 'pg-small', 空亡: 'pg-small', 纳音: 'pg-nayin', 神煞: 'pg-shensha',
  }

  return (
    <div className="pillars-scroll">
      <div className="pillars-grid" style={{ gridTemplateColumns: `64px repeat(${columns.length}, minmax(84px, 1fr))` }}>
        <div className="pg-rowlabel"></div>
        {columns.map((c) => <div key={c.label} className={`pg-head ${c.lu ? 'pg-lucol' : ''}`}>{c.label}</div>)}
        {rows.map(([label, termKey, render]) => (
          <RowGroup key={label} label={label} termKey={termKey} columns={columns} render={render} cellClass={cellClass[label]} />
        ))}
      </div>
    </div>
  )
}

function RowGroup({
  label, termKey, columns, render, cellClass,
}: {
  label: string
  termKey: string
  columns: { label: string; detail: ColumnDetail }[]
  render: (c: { label: string; detail: ColumnDetail }) => React.ReactNode
  cellClass: string
}) {
  return (
    <>
      <div className="pg-rowlabel">{termKey ? <Term k={termKey}>{label}</Term> : label}</div>
      {columns.map((c) => <div key={c.label} className={cellClass}>{render(c)}</div>)}
    </>
  )
}

export function ChartMeta({ chart }: { chart: BaziChart }) {
  return (
    <div className="tag-row">
      <span className="mystic-tag"><Term k="命宫">命宫</Term> {chart.mingGong}</span>
      <span className="mystic-tag"><Term k="胎元">胎元</Term> {chart.taiYuan}</span>
      <span className="mystic-tag"><Term k="身强身弱">日主</Term> {chart.dayGan}{chart.dayGanWx} · {chart.strength.level}</span>
      <span className="mystic-tag"><Term k="喜用神">喜用</Term> {chart.favorable.join(' ')}</span>
      <span className="mystic-tag"><Term k="忌神">忌神</Term> {chart.unfavorable.join(' ')}</span>
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
    <div>
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
    <div>
      {items.map(([h, t]) => (
        <div key={h}>
          <h3 className="reading-h">{h}</h3>
          <p className="reading-p">{t}</p>
        </div>
      ))}
    </div>
  )
}
