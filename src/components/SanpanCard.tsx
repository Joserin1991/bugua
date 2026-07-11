// 三盘合参卡：四维 × 三系统断语，标注一致度与合参结论
import type { SanpanResult, Stance } from '../lib/sanpan'

const STANCE_CLS: Record<Stance, string> = { 吉: 'ji', 平: 'ping', 慎: 'shen' }
const AGREE_CLS: Record<string, string> = { 高: 'hi', 中: 'mid', 低: 'lo' }

export function SanpanCard({ result }: { result: SanpanResult }) {
  return (
    <div className="sp-wrap">
      {result.dims.map((d) => (
        <div className="sp-dim" key={d.key}>
          <div className="sp-dim-head">
            <span className="sp-dim-name">{d.key}</span>
            <span className={`sp-agree ${AGREE_CLS[d.agree]}`}>一致度 · {d.agree}</span>
            <span className={`sp-stance ${STANCE_CLS[d.final]}`}>{d.final}</span>
          </div>
          {d.verdicts.map((v) => (
            <div className="sp-row" key={v.system}>
              <span className="sp-sys">{v.system}</span>
              <span className={`sp-stance sm ${STANCE_CLS[v.stance]}`}>{v.stance}</span>
              <span className="sp-basis">{v.basis}</span>
            </div>
          ))}
          <p className="sp-concl">{d.conclusion}</p>
        </div>
      ))}
      <p className="sp-overall">{result.overall}</p>
      <p className="sp-note">{result.note}</p>
    </div>
  )
}
