// 命盘报告：可存长图（html2canvas）或打印成 PDF 的分享页
import { useRef, useState } from 'react'
import html2canvas from 'html2canvas'
import type { BaziChart } from '../lib/bazi'
import { liuNianOf } from '../lib/bazi'
import { interpretBazi } from '../lib/interpret'
import { PillarCards, WuxingPctBars } from './InfoGraphics'

export function ReportView({ chart, memories, onClose }: { chart: BaziChart; memories: string[]; onClose: () => void }) {
  const ref = useRef<HTMLDivElement>(null)
  const [img, setImg] = useState<string | null>(null)
  const [busy, setBusy] = useState(false)
  const r = interpretBazi(chart)
  const year = new Date().getFullYear()
  const ln = liuNianOf(year, chart.dayGan)

  const genImage = async () => {
    if (!ref.current) return
    setBusy(true)
    try {
      const canvas = await html2canvas(ref.current, { backgroundColor: '#f6f2e6', scale: 2, useCORS: true })
      setImg(canvas.toDataURL('image/png'))
    } catch {
      setImg(null)
    }
    setBusy(false)
  }

  return (
    <div className="report-mask" onClick={(e) => { if (e.target === e.currentTarget) onClose() }}>
      <div className="report-sheet">
        {img ? (
          <>
            <p className="lr-note" style={{ textAlign: 'center' }}>长按图片即可保存 / 分享</p>
            <img className="report-img" src={img} alt="命盘报告" />
            <div className="report-actions">
              <button className="chip chip-ghost" onClick={() => setImg(null)}>返回</button>
              <button className="chip" onClick={onClose}>关闭</button>
            </div>
          </>
        ) : (
          <>
            <div ref={ref} style={{ background: '#f6f2e6', padding: '4px 2px' }}>
              <div className="report-head">
                <h2>玄机阁 · 命盘报告</h2>
                <div className="rp-sub">{chart.gender === '男' ? '乾造' : '坤造'} {chart.solarText} ｜ 农历 {chart.lunarText} ｜ 属{chart.animal}</div>
                {chart.solarCorrection && <div className="rp-sub">真太阳时 {chart.solarCorrection.trueText}（{chart.solarCorrection.city}）</div>}
              </div>
              <div className="report-sec">
                <h3>四柱八字</h3>
                <PillarCards chart={chart} />
              </div>
              <div className="report-sec">
                <h3>五行 · 喜忌</h3>
                <WuxingPctBars chart={chart} />
                <p>日主{chart.dayGan}{chart.dayGanWx}，{chart.strength.level}（{chart.strength.score}分）；喜用 {chart.favorable.join('、')}，忌 {chart.unfavorable.join('、')}。</p>
              </div>
              <div className="report-sec">
                <h3>格局综述</h3>
                <p>{r.geju}</p>
              </div>
              <div className="report-sec">
                <h3>大运</h3>
                <p>{chart.qiYunText}。</p>
                <p>{chart.daYun.slice(0, 8).map((d) => `${d.startAge}岁 ${d.ganZhi}（${d.god}）`).join(' → ')}</p>
              </div>
              <div className="report-sec">
                <h3>今年流年</h3>
                <p>{year} {ln.ganZhi} 年，流年{ln.god}。</p>
              </div>
              <div className="report-sec">
                <h3>神煞照命</h3>
                <p>{chart.shenSha.map((s) => `${s.where}${s.name}`).join('、') || '无'}</p>
              </div>
              {memories.length > 0 && (
                <div className="report-sec">
                  <h3>大师记档</h3>
                  <p>{memories.slice(-5).join('；')}</p>
                </div>
              )}
              <div className="report-sec">
                <h3>开运叮嘱</h3>
                <p>{r.advice}</p>
              </div>
              <div className="report-foot">
                玄机阁 · 卜卦问道<br />
                内容基于传统术数体例生成 · 仅供参考 · 命自我立<br />
                {new Date().toLocaleDateString('zh-CN')}
              </div>
            </div>
            <div className="report-actions">
              <button className="chip" onClick={genImage} disabled={busy}>{busy ? '生成中…' : '保存长图'}</button>
              <button className="chip chip-ghost" onClick={() => window.print()}>打印 / PDF</button>
              <button className="chip chip-ghost" onClick={onClose}>关闭</button>
            </div>
          </>
        )}
      </div>
    </div>
  )
}
