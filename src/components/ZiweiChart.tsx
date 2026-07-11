// 紫微斗数十二宫命盘（水墨风）
import type { ZwChart, ZwPalace, ZwStar } from '../lib/ziwei'
import { Term } from './Master'

// 地支 → 4×4 网格区域名
const ZHI_AREA: Record<string, string> = {
  巳: 'si', 午: 'wu', 未: 'wei', 申: 'shen',
  辰: 'chen', 酉: 'you',
  卯: 'mao', 戌: 'xu',
  寅: 'yin', 丑: 'chou', 子: 'zi', 亥: 'hai',
}

const MUTAGEN_CLASS: Record<string, string> = {
  禄: 'mut-lu', 权: 'mut-quan', 科: 'mut-ke', 忌: 'mut-ji',
}

function Star({ s, major }: { s: ZwStar; major?: boolean }) {
  return (
    <span className={`zw-star ${major ? 'zw-major' : 'zw-minor'}`}>
      <Term k={s.name} star>{s.name}</Term>
      {s.brightness && <i className="zw-bright">{s.brightness}</i>}
      {s.mutagen && <b className={`zw-mut ${MUTAGEN_CLASS[s.mutagen]}`}>{s.mutagen}</b>}
    </span>
  )
}

function Palace({ p, active, onClick }: { p: ZwPalace; active: boolean; onClick: () => void }) {
  return (
    <div
      className={`zw-palace ${active ? 'active' : ''}`}
      style={{ gridArea: ZHI_AREA[p.zhi] }}
      onClick={onClick}
    >
      <div className="zw-stars">
        <div className="zw-stars-major">
          {p.majorStars.length
            ? p.majorStars.map((s) => <Star key={s.name} s={s} major />)
            : <span className="zw-empty">借对宫</span>}
        </div>
        <div className="zw-stars-minor">
          {p.minorStars.map((s) => <Star key={s.name} s={s} />)}
        </div>
        <div className="zw-stars-adj">
          {p.adjectiveStars.slice(0, 6).map((n) => <span key={n}>{n}</span>)}
        </div>
      </div>
      <div className="zw-foot">
        <span className="zw-cs">{p.changsheng}<br /><i>{p.boshi}</i></span>
        <span className="zw-name">
          {p.name}
          {p.isBodyPalace && <em className="zw-body">身</em>}
          <i className="zw-range">{p.decadal[0]}–{p.decadal[1]}</i>
        </span>
        <span className="zw-gz">{p.gan}<br />{p.zhi}</span>
      </div>
    </div>
  )
}

export function ZiweiChart({
  chart, gender, activeZhi, onSelect,
}: {
  chart: ZwChart
  gender: '男' | '女'
  activeZhi?: string
  onSelect?: (p: ZwPalace) => void
}) {
  return (
    <div className="zw-scroll">
      <div className="zw-grid">
        {chart.palaces.map((p) => (
          <Palace
            key={p.zhi}
            p={p}
            active={p.zhi === activeZhi}
            onClick={() => onSelect?.(p)}
          />
        ))}
        <div className="zw-center">
          <div className="zw-center-title">{gender === '男' ? '乾造' : '坤造'} 紫微星盘</div>
          <div className="zw-center-row">公历 {chart.solarDate}</div>
          <div className="zw-center-row">农历 {chart.lunarDate}</div>
          <div className="zw-center-row zw-bazi">{chart.chineseDate}</div>
          <div className="zw-center-tags">
            <span><Term k="五行局">{chart.fiveElementsClass}</Term></span>
            <span><Term k="命主">命主 {chart.soul}</Term></span>
            <span><Term k="身主">身主 {chart.body}</Term></span>
            <span>属{chart.zodiac} · {chart.sign}</span>
          </div>
          <div className="zw-legend">
            <b className="zw-mut mut-lu">禄</b><b className="zw-mut mut-quan">权</b>
            <b className="zw-mut mut-ke">科</b><b className="zw-mut mut-ji">忌</b>
            <span>为<Term k="四化">四化</Term> · 点星名可查其义</span>
          </div>
        </div>
      </div>
    </div>
  )
}
