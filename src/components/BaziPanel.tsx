// 八字排盘面板：出生信息 → 四柱 · 五行 · 神煞 · 大运流年 · 命理详解
import { useMemo, useState } from 'react'
import { computeBazi, liuNianRange, type BaziChart } from '../lib/bazi'
import { interpretBazi, interpretLiuNian } from '../lib/interpret'
import { WUXING_COLOR, WUXING_LIST } from '../lib/wuxing'
import { CloudDivider, TaijiSpinner } from './Decor'

const HOUR_OPTIONS = [
  { v: 0, label: '子时 23:00-00:59（早子）' }, { v: 1, label: '丑时 01:00-02:59' },
  { v: 3, label: '寅时 03:00-04:59' }, { v: 5, label: '卯时 05:00-06:59' },
  { v: 7, label: '辰时 07:00-08:59' }, { v: 9, label: '巳时 09:00-10:59' },
  { v: 11, label: '午时 11:00-12:59' }, { v: 13, label: '未时 13:00-14:59' },
  { v: 15, label: '申时 15:00-16:59' }, { v: 17, label: '酉时 17:00-18:59' },
  { v: 19, label: '戌时 19:00-20:59' }, { v: 21, label: '亥时 21:00-22:59' },
  { v: 23, label: '子时 23:00-23:59（晚子）' },
]

export function BaziPanel() {
  const [date, setDate] = useState('1995-08-16')
  const [hour, setHour] = useState(9)
  const [gender, setGender] = useState<'男' | '女'>('男')
  const [chart, setChart] = useState<BaziChart | null>(null)
  const [consulting, setConsulting] = useState(false)
  const [dayunIdx, setDayunIdx] = useState(0)
  const [lnYear, setLnYear] = useState<number | null>(null)

  const reading = useMemo(() => (chart ? interpretBazi(chart) : null), [chart])

  const paipan = () => {
    const [y, m, d] = date.split('-').map(Number)
    if (!y || !m || !d) return
    setConsulting(true)
    setChart(null)
    setTimeout(() => {
      const c = computeBazi(y, m, d, hour, 30, gender)
      setChart(c)
      const now = new Date().getFullYear()
      const idx = c.daYun.findIndex((dy) => now >= dy.startYear && now <= dy.endYear)
      setDayunIdx(idx >= 0 ? idx : 0)
      setLnYear(now)
      setConsulting(false)
    }, 1400)
  }

  const activeDayun = chart?.daYun[dayunIdx]
  const liuNians = useMemo(() => {
    if (!chart || !activeDayun) return []
    return liuNianRange(activeDayun.startYear, Math.min(10, activeDayun.endYear - activeDayun.startYear + 1), chart.dayGan)
  }, [chart, activeDayun])
  const activeLn = liuNians.find((l) => l.year === lnYear) ?? null
  const lnReading = useMemo(
    () => (activeLn && chart ? interpretLiuNian(activeLn, chart) : null),
    [activeLn, chart],
  )

  const maxWx = chart ? Math.max(...WUXING_LIST.map((w) => chart.wuxingCount[w]), 1) : 1

  return (
    <>
      <section className="panel fade-in">
        <h2 className="panel-title">乾坤定盘</h2>
        <p className="panel-caption">输入出生信息 · 天干地支立现 · 真太阳时以出生地为准</p>
        <div className="form-grid">
          <div className="field">
            <label>出生日期（公历）</label>
            <input type="date" value={date} min="1901-01-01" max="2099-12-31" onChange={(e) => setDate(e.target.value)} />
          </div>
          <div className="field">
            <label>出生时辰</label>
            <select value={hour} onChange={(e) => setHour(Number(e.target.value))}>
              {HOUR_OPTIONS.map((h) => (
                <option key={h.label} value={h.v}>{h.label}</option>
              ))}
            </select>
          </div>
          <div className="field">
            <label>乾坤（性别）</label>
            <select value={gender} onChange={(e) => setGender(e.target.value as '男' | '女')}>
              <option value="男">乾造 · 男</option>
              <option value="女">坤造 · 女</option>
            </select>
          </div>
        </div>
        <div className="form-actions">
          <button className="btn-gold" onClick={paipan} disabled={consulting}>
            {consulting ? '推演中' : '起盘排演'}
          </button>
        </div>
        {consulting && (
          <div className="consulting">
            <TaijiSpinner />
            <span>正在推演天干地支 · 阴阳五行流转…</span>
          </div>
        )}
      </section>

      {chart && reading && (
        <>
          <section className="panel fade-in">
            <h2 className="panel-title">{gender === '男' ? '乾造' : '坤造'} 四柱排盘</h2>
            <p className="panel-caption">
              公历 {chart.solarText} ｜ 农历 {chart.lunarText} ｜ 生肖属{chart.animal} ｜ {chart.xingZuo} ｜ 节气 {chart.jieQi}后
            </p>
            <div className="pillars-grid">
              <div className="pg-rowlabel"></div>
              {chart.pillars.map((p) => (
                <div key={p.label} className="pg-head">{p.label}</div>
              ))}
              <div className="pg-rowlabel">十神</div>
              {chart.pillars.map((p) => (
                <div key={p.label} className="pg-shishen">{p.ganGod}</div>
              ))}
              <div className="pg-rowlabel">天干</div>
              {chart.pillars.map((p) => (
                <div key={p.label} className={`pg-gan wx-${p.ganWx}`}>{p.gan}</div>
              ))}
              <div className="pg-rowlabel">地支</div>
              {chart.pillars.map((p) => (
                <div key={p.label} className={`pg-zhi wx-${p.zhiWx}`}>{p.zhi}</div>
              ))}
              <div className="pg-rowlabel">藏干</div>
              {chart.pillars.map((p) => (
                <div key={p.label} className="pg-canggan">
                  {p.cangGan.map((c) => (
                    <div key={c.gan}>
                      <span className={`wx-${c.wx}`}>{c.gan}</span>
                      <span style={{ opacity: 0.75 }}> {c.god}</span>
                    </div>
                  ))}
                </div>
              ))}
              <div className="pg-rowlabel">纳音</div>
              {chart.pillars.map((p) => (
                <div key={p.label} className="pg-nayin">{p.naYin}</div>
              ))}
            </div>
            <div className="tag-row" style={{ marginTop: 16, justifyContent: 'center' }}>
              <span className="mystic-tag">命宫 {chart.mingGong}</span>
              <span className="mystic-tag">胎元 {chart.taiYuan}</span>
              <span className="mystic-tag">日主 {chart.dayGan}{chart.dayGanWx} · {chart.strength.level}</span>
              <span className="mystic-tag">喜用 {chart.favorable.join(' ')}</span>
              <span className="mystic-tag">忌神 {chart.unfavorable.join(' ')}</span>
            </div>
          </section>

          <section className="panel fade-in">
            <h2 className="panel-title">五行气数</h2>
            <p className="panel-caption">干支藏气加权统计 · 观其盈虚</p>
            <div className="wuxing-bars">
              {WUXING_LIST.map((w) => (
                <div key={w} className="wx-bar-row">
                  <span className={`wx-bar-label wx-${w}`}>{w}{chart.favorable.includes(w) ? ' ✦' : ''}</span>
                  <div className="wx-bar-track">
                    <div
                      className="wx-bar-fill"
                      style={{ width: `${(chart.wuxingCount[w] / maxWx) * 100}%`, color: WUXING_COLOR[w] }}
                    />
                  </div>
                  <span className="wx-bar-count">{chart.wuxingCount[w]}</span>
                </div>
              ))}
            </div>
            {chart.shenSha.length > 0 && (
              <>
                <h3 className="reading-h">神煞照命</h3>
                <div className="shensha-grid">
                  {chart.shenSha.map((s, i) => (
                    <div className="shensha-item" key={i}>
                      <div className="ss-name">{s.name} <small style={{ color: 'var(--text-dim)' }}>{s.where}</small></div>
                      <div className="ss-desc">{s.desc}</div>
                    </div>
                  ))}
                </div>
              </>
            )}
          </section>

          <section className="panel fade-in">
            <h2 className="panel-title">大运流年</h2>
            <p className="panel-caption">{chart.qiYunText}</p>
            <div className="dayun-strip">
              {chart.daYun.map((d, i) => (
                <div
                  key={d.ganZhi + d.startYear}
                  className={`dayun-cell ${i === dayunIdx ? 'active' : ''}`}
                  onClick={() => { setDayunIdx(i); setLnYear(d.startYear) }}
                >
                  <div className="dayun-gz">{d.ganZhi}</div>
                  <div className="dayun-age">{d.startAge}岁起<br />{d.startYear}—{d.endYear}</div>
                  <div className="pg-shishen" style={{ marginTop: 4 }}>{d.god}运</div>
                </div>
              ))}
            </div>
            {activeDayun && (
              <div className="liunian-grid">
                {liuNians.map((l) => (
                  <div
                    key={l.year}
                    className={`liunian-cell ${l.year === lnYear ? 'active' : ''}`}
                    onClick={() => setLnYear(l.year)}
                  >
                    <div className="liunian-gz">{l.ganZhi}</div>
                    <div className="liunian-year">{l.year} · {l.god}</div>
                  </div>
                ))}
              </div>
            )}
            {lnReading && (
              <div className="reading-section fade-in" key={lnYear}>
                <h3 className="reading-h">{lnReading.theme}</h3>
                <p className="reading-p">{lnReading.text}</p>
                {lnReading.extra && <p className="reading-p" style={{ color: 'var(--gold-bright)' }}>⚑ {lnReading.extra}。</p>}
              </div>
            )}
          </section>

          <section className="panel fade-in">
            <h2 className="panel-title">命理详解</h2>
            <CloudDivider />
            <div className="reading-section">
              <h3 className="reading-h">格局总论</h3>
              <p className="reading-p">{reading.geju}</p>
              <h3 className="reading-h">禀性气质</h3>
              <p className="reading-p">{reading.personality}</p>
              <h3 className="reading-h">事业方向</h3>
              <p className="reading-p">{reading.career}</p>
              <h3 className="reading-h">财帛之道</h3>
              <p className="reading-p">{reading.wealth}</p>
              <h3 className="reading-h">姻缘情感</h3>
              <p className="reading-p">{reading.love}</p>
              <h3 className="reading-h">康健养生</h3>
              <p className="reading-p">{reading.health}</p>
              <h3 className="reading-h">趋吉之道</h3>
              <p className="reading-p">{reading.advice}</p>
            </div>
          </section>
        </>
      )}
    </>
  )
}
