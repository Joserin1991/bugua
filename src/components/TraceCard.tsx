// 推演过程卡：规则 · 证据 · 结论 三段式步骤条（可折叠）
import { useState } from 'react'
import type { TraceStep } from '../lib/trace'

export function TraceCard({ steps }: { steps: TraceStep[] }) {
  const [open, setOpen] = useState<number | null>(0)
  return (
    <div className="trace-list">
      {steps.map((s, i) => {
        const expanded = open === i
        return (
          <div key={s.title} className={`trace-step ${expanded ? 'open' : ''}`}>
            <button className="trace-head" onClick={() => setOpen(expanded ? null : i)}>
              <span className="trace-no">{['一', '二', '三', '四', '五', '六', '七', '八'][i] ?? i + 1}</span>
              <span className="trace-title">{s.title}</span>
              <span className="trace-result-mini">{expanded ? '收' : s.result.slice(0, 14) + (s.result.length > 14 ? '…' : '')}</span>
            </button>
            {expanded && (
              <div className="trace-body fade-in">
                <div className="trace-row"><span className="trace-key">法</span><span>{s.rule}</span></div>
                {s.evidence.map((e, k) => (
                  <div className="trace-row" key={k}><span className="trace-key ev">证</span><span>{e}</span></div>
                ))}
                <div className="trace-row"><span className="trace-key rs">断</span><b>{s.result}</b></div>
              </div>
            )}
          </div>
        )
      })}
    </div>
  )
}
