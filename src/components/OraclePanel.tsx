// 答疑解惑面板：输入问题 → 梅花易数起卦 → 分类断语
import { useState } from 'react'
import { castByQuestion, hexUnicode, type CastResult } from '../lib/hexagram'
import { detectCategory, interpretOracle, ORACLE_CATEGORIES, type OracleCategory, type OracleReading } from '../lib/interpret'
import { CloudDivider, TaijiSpinner } from './Decor'

export function OraclePanel() {
  const [question, setQuestion] = useState('')
  const [category, setCategory] = useState<OracleCategory>('综合运势')
  const [autoCategory, setAutoCategory] = useState(true)
  const [consulting, setConsulting] = useState(false)
  const [result, setResult] = useState<{ cast: CastResult; reading: OracleReading; q: string } | null>(null)

  const ask = () => {
    const q = question.trim()
    if (!q || consulting) return
    const cat = autoCategory ? detectCategory(q) : category
    setCategory(cat)
    setConsulting(true)
    setResult(null)
    setTimeout(() => {
      const cast = castByQuestion(q, new Date())
      setResult({ cast, reading: interpretOracle(cast, q, cat), q })
      setConsulting(false)
    }, 1800)
  }

  return (
    <>
      <section className="panel fade-in">
        <h2 className="panel-title">仙机问答</h2>
        <p className="panel-caption">一事一问 · 心诚则灵 · 以梅花易数应时起卦</p>
        <div className="category-row">
          {ORACLE_CATEGORIES.map((c) => (
            <button
              key={c}
              className={`category-chip ${category === c && !autoCategory ? 'active' : ''}`}
              onClick={() => { setCategory(c); setAutoCategory(false) }}
            >
              {c}
            </button>
          ))}
          <button
            className={`category-chip ${autoCategory ? 'active' : ''}`}
            onClick={() => setAutoCategory(true)}
          >
            ✦ 自动识别
          </button>
        </div>
        <div className="oracle-input">
          <textarea
            placeholder="例：今年适合跳槽吗？ / 我和他还有可能吗？ / 这笔投资可行否？"
            value={question}
            onChange={(e) => setQuestion(e.target.value)}
            onKeyDown={(e) => { if (e.key === 'Enter' && (e.metaKey || e.ctrlKey)) ask() }}
          />
        </div>
        <div className="form-actions">
          <button className="btn-gold" onClick={ask} disabled={consulting || !question.trim()}>
            {consulting ? '起卦中' : '求 卦'}
          </button>
        </div>
        {consulting && (
          <div className="consulting">
            <TaijiSpinner />
            <span>凝神起卦 · 观梅问数 · 天机推演中…</span>
          </div>
        )}
      </section>

      {result && (
        <section className="panel fade-in">
          <h2 className="panel-title">神谕已至 · {result.reading.luckLabel}</h2>
          <p className="panel-caption">所问：「{result.q}」（{category}）</p>
          <CloudDivider />
          <div className="gua-duo" style={{ marginTop: 18 }}>
            <div className="gua-card">
              <div className="gua-symbol">{hexUnicode(result.cast.original)}</div>
              <div className="gua-name">{result.cast.original.fullName}</div>
              <div className="gua-role">本 卦</div>
            </div>
            {result.cast.changed && (
              <>
                <span className="gua-arrow">➾</span>
                <div className="gua-card">
                  <div className="gua-symbol">{hexUnicode(result.cast.changed)}</div>
                  <div className="gua-name">{result.cast.changed.fullName}</div>
                  <div className="gua-role">变 卦</div>
                </div>
              </>
            )}
          </div>
          <div className="guaci-block">
            <div className="guaci-original">《{result.cast.original.name}》曰：{result.cast.original.guaci}</div>
          </div>
          <div className="reading-section">
            {result.reading.sections.map((s) => (
              <div key={s.title}>
                <h3 className="reading-h">{s.title}</h3>
                <p className="reading-p">{s.text}</p>
              </div>
            ))}
          </div>
        </section>
      )}
    </>
  )
}
