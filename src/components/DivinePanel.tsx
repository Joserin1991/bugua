// 六爻卜卦面板：诚心默念 → 掷币六次 → 本卦变卦互卦 → 卦辞详解
import { useRef, useState } from 'react'
import { buildResult, hexUnicode, tossOnce, YAO_NAMES, type CastLine, type CastResult } from '../lib/hexagram'
import { interpretOracle, detectCategory } from '../lib/interpret'
import type { HexagramInfo } from '../data/hexagrams'
import { CloudDivider } from './Decor'

function HexFigure({ lines }: { lines: CastLine[] }) {
  return (
    <div className="hexagram-figure">
      {lines.map((l, i) => (
        <div className="yao-row" key={i}>
          <span className="yao-name">{YAO_NAMES[i]}</span>
          <div className={`yao ${l.yang ? 'yang' : 'yin'}`}>
            <span className="bar" />
            {!l.yang && <span className="bar" />}
          </div>
          <span className="yao-mark">{l.changing ? (l.yang ? '○ 动' : '✕ 动') : ''}</span>
        </div>
      ))}
    </div>
  )
}

function GuaCard({ hex, role }: { hex: HexagramInfo; role: string }) {
  return (
    <div className="gua-card">
      <div className="gua-symbol">{hexUnicode(hex)}</div>
      <div className="gua-name">{hex.fullName}</div>
      <div className="gua-role">{role}</div>
    </div>
  )
}

export function DivinePanel() {
  const [question, setQuestion] = useState('')
  const [lines, setLines] = useState<CastLine[]>([])
  const [tossing, setTossing] = useState(false)
  const [result, setResult] = useState<CastResult | null>(null)
  const [lastCoins, setLastCoins] = useState<boolean[]>([true, false, true])
  const linesRef = useRef<CastLine[]>([])

  const reset = () => {
    setLines([])
    setResult(null)
    linesRef.current = []
  }

  const toss = () => {
    if (tossing || linesRef.current.length >= 6) return
    setTossing(true)
    setTimeout(() => {
      const line = tossOnce()
      setLastCoins(line.coins)
      linesRef.current = [...linesRef.current, line]
      setLines(linesRef.current)
      setTossing(false)
      if (linesRef.current.length === 6) {
        setTimeout(() => setResult(buildResult(linesRef.current)), 500)
      }
    }, 1300)
  }

  const reading = result ? interpretOracle(result, question, detectCategory(question || '综合运势')) : null

  return (
    <>
      <section className="panel fade-in">
        <h2 className="panel-title">六爻神课</h2>
        <p className="panel-caption">诚心默念所问之事 · 掷铜钱六次 · 自下而上成卦</p>
        <div className="oracle-input">
          <textarea
            placeholder="静心凝神，写下你要问的事（可留空，专念于心亦可）……"
            value={question}
            onChange={(e) => setQuestion(e.target.value)}
          />
        </div>
        <div className="divine-stage">
          <div className="coins-row">
            {[0, 1, 2].map((i) => (
              <div key={i} className={`coin ${tossing ? 'tossing' : ''} ${!tossing && !lastCoins[i] ? 'tail' : ''}`} style={{ animationDelay: `${i * 0.12}s` }}>
                <span className="hole" />
                <span>{tossing ? '' : lastCoins[i] ? '乾隆通宝' : '背'}</span>
              </div>
            ))}
          </div>
          {lines.length > 0 && <HexFigure lines={lines} />}
          <div>
            {lines.length < 6 ? (
              <button className="btn-gold" onClick={toss} disabled={tossing}>
                {tossing ? '铜钱旋舞…' : `掷第 ${lines.length + 1} 爻`}
              </button>
            ) : (
              <button className="btn-ghost" onClick={reset}>再卜一卦</button>
            )}
            <span style={{ marginLeft: 14, color: 'var(--ink-faint)', fontSize: '0.8rem', letterSpacing: '0.1em' }}>
              {lines.length}/6 爻
            </span>
          </div>
        </div>
      </section>

      {result && reading && (
        <section className="panel fade-in">
          <h2 className="panel-title">卦成 · {reading.luckLabel}</h2>
          <CloudDivider />
          <div className="gua-duo" style={{ marginTop: 18 }}>
            <GuaCard hex={result.original} role="本 卦" />
            {result.changed && <span className="gua-arrow">➾</span>}
            {result.changed && <GuaCard hex={result.changed} role="变 卦" />}
            <GuaCard hex={result.mutual} role="互 卦" />
          </div>
          <div className="guaci-block">
            <div className="guaci-original">《{result.original.name}》曰：{result.original.guaci}</div>
            {result.changed && (
              <div className="guaci-original" style={{ opacity: 0.8 }}>《{result.changed.name}》曰：{result.changed.guaci}</div>
            )}
          </div>
          <div className="reading-section">
            {reading.sections.map((s) => (
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
