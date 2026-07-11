// 三盘合参：八字（十神喜忌）× 紫微（宫位星曜四化）× 卦象（生辰时间卦）
// 对同一维度各自下断，互相印证并标注一致度——孤证不立，三盘同断方为可信
import type { BaziChart } from './bazi'
import type { ZwChart, ZwPalace } from './ziwei'
import { castByQuestion } from './hexagram'
import { KE, controllerOf, taohua, WUXING_TRAITS, type WuXing } from './wuxing'

export type Stance = '吉' | '平' | '慎'
export type DimKey = '事业' | '财帛' | '姻缘' | '康健'

export interface SystemVerdict {
  system: '八字' | '紫微' | '卦象'
  stance: Stance
  basis: string // 一句话依据
}

export interface SanpanDim {
  key: DimKey
  verdicts: SystemVerdict[]
  agree: '高' | '中' | '低'
  final: Stance
  conclusion: string
}

export interface SanpanResult {
  dims: SanpanDim[]
  overall: string // 格局层面的互证总评
  note: string
}

// ---------- 八字断 ----------
function baziStarVerdict(chart: BaziChart, el: WuXing, starName: string): { stance: Stance; basis: string } {
  const count = chart.wuxingCount[el]
  if (chart.favorable.includes(el)) {
    if (count < 1) return { stance: '平', basis: `${starName}属${el}为喜用，惜原局${el}气偏弱，星喜而力薄` }
    return { stance: '吉', basis: `${starName}属${el}，正是命中喜用，此星得力` }
  }
  if (chart.unfavorable.includes(el)) {
    return { stance: '慎', basis: `${starName}属${el}，落在忌神之位，此路多耗心力` }
  }
  return { stance: '平', basis: `${starName}属${el}，于命局不喜不忌，平常论之` }
}

function baziVerdict(chart: BaziChart, dim: DimKey): SystemVerdict {
  const me = chart.dayGanWx
  let v: { stance: Stance; basis: string }
  switch (dim) {
    case '事业':
      v = baziStarVerdict(chart, controllerOf(me), '官杀（事业星）')
      break
    case '财帛':
      v = baziStarVerdict(chart, KE[me], '财星')
      break
    case '姻缘': {
      const star = chart.gender === '男' ? KE[me] : controllerOf(me)
      v = baziStarVerdict(chart, star, chart.gender === '男' ? '妻星（财）' : '夫星（官）')
      const th = taohua(chart.pillars[2].zhi)
      if (chart.pillars.some((p) => p.zhi === th)) v = { ...v, basis: v.basis + '；柱见桃花，人缘缘分不缺' }
      break
    }
    case '康健': {
      const entries = Object.entries(chart.wuxingCount) as [WuXing, number][]
      const [weakest, wn] = entries.reduce((a, b) => (b[1] < a[1] ? b : a))
      const spread = Math.max(...entries.map(([, n]) => n)) - wn
      if (wn <= 0.5) v = { stance: '慎', basis: `${weakest}气近乎无根，${WUXING_TRAITS[weakest].organ}一路宜早养护` }
      else if (spread <= 2) v = { stance: '吉', basis: '五行分布均停，气机流通，底子不差' }
      else v = { stance: '平', basis: `五行偏枯于${weakest}，${WUXING_TRAITS[weakest].organ}略弱，作息可补` }
      break
    }
  }
  return { system: '八字', ...v }
}

// ---------- 紫微断 ----------
const DIM_PALACE: Record<DimKey, string> = { 事业: '官禄', 财帛: '财帛', 姻缘: '夫妻', 康健: '疾厄' }
const ZW_JI = ['天魁', '天钺', '左辅', '右弼', '文昌', '文曲', '禄存', '天马']
const ZW_SHA = ['擎羊', '陀罗', '火星', '铃星', '地空', '地劫']

function ziweiVerdict(zw: ZwChart, dim: DimKey): SystemVerdict {
  const pal = zw.palaces.find((p) => p.name.includes(DIM_PALACE[dim])) as ZwPalace | undefined
  if (!pal) return { system: '紫微', stance: '平', basis: '宫位未明，暂以平常论' }
  let score = 0
  const notes: string[] = []
  const stars = [...pal.majorStars, ...pal.minorStars]
  for (const s of stars) {
    if (s.mutagen === '禄' || s.mutagen === '权') { score += 2; notes.push(`${s.name}化${s.mutagen}`) }
    else if (s.mutagen === '科') { score += 1; notes.push(`${s.name}化科`) }
    else if (s.mutagen === '忌') { score -= 3; notes.push(`${s.name}化忌`) }
    if (s.brightness === '庙' || s.brightness === '旺') score += 1
    else if (s.brightness === '陷') score -= 1
    if (ZW_JI.includes(s.name)) { score += 1; notes.push(`吉曜${s.name}`) }
    if (ZW_SHA.includes(s.name)) { score -= 1; notes.push(`煞曜${s.name}`) }
  }
  const mains = pal.majorStars.map((s) => s.name + (s.brightness ? `(${s.brightness})` : '')).join('、')
  const head = mains ? `${DIM_PALACE[dim]}宫坐${mains}` : `${DIM_PALACE[dim]}宫无主星，借对宫论`
  const tail = notes.length ? `，${notes.slice(0, 3).join('、')}` : ''
  const stance: Stance = score >= 2 ? '吉' : score <= -2 ? '慎' : '平'
  return { system: '紫微', stance, basis: head + tail }
}

// ---------- 卦象断 ----------
function guaVerdict(chart: BaziChart, dim: DimKey, birth: Date): SystemVerdict {
  const cast = castByQuestion(`${chart.solarText}·${dim}`, birth)
  const luck = cast.changed ? Math.round((cast.original.luck + cast.changed.luck) / 2) : cast.original.luck
  const stance: Stance = luck >= 4 ? '吉' : luck === 3 ? '平' : '慎'
  const name = `「${cast.original.fullName}」${cast.changed ? `之「${cast.changed.name}」` : ''}`
  return { system: '卦象', stance, basis: `此维得${name}——${cast.original.brief}` }
}

// ---------- 合参 ----------
function agreement(verdicts: SystemVerdict[]): '高' | '中' | '低' {
  const uniq = new Set(verdicts.map((v) => v.stance)).size
  if (uniq === 1) return '高'
  if (verdicts.length >= 3 && uniq === 2) return '中'
  return '低'
}

function finalStance(verdicts: SystemVerdict[]): Stance {
  const count: Record<Stance, number> = { 吉: 0, 平: 0, 慎: 0 }
  for (const v of verdicts) count[v.stance] += 1
  const max = Math.max(count.吉, count.平, count.慎)
  const tops = (['吉', '平', '慎'] as Stance[]).filter((s) => count[s] === max)
  if (tops.length === 1) return tops[0]
  // 平票以八字为主盘定断
  return verdicts.find((v) => v.system === '八字')!.stance
}

function conclude(key: DimKey, verdicts: SystemVerdict[], agree: '高' | '中' | '低', final: Stance): string {
  if (agree === '高') {
    if (final === '吉') return `三盘同声相应，${key}一路可放胆经营，此断十拿九稳。`
    if (final === '慎') return `三盘皆示谨慎——${key}上务须稳字当头，不宜行险，早做绸缪。`
    return `三盘皆言平顺，${key}按部就班即可，不必强求突破，也无须忧心。`
  }
  if (agree === '中') {
    const odd = verdicts.find((v) => v.stance !== final)
    return `${verdicts.filter((v) => v.stance === final).map((v) => v.system).join('、')}两盘相合，大势依此而断；唯${odd?.system}所示「${odd?.stance}」处留一分心，兼听则明。`
  }
  return `三盘各执一词，${key}一事变数较多——以八字本命为纲、余盘为参，行事留有余地，勿孤注一掷。`
}

export function sanpan(chart: BaziChart, zw: ZwChart | null, birth: Date): SanpanResult {
  const dims: SanpanDim[] = (['事业', '财帛', '姻缘', '康健'] as DimKey[]).map((key) => {
    const verdicts = [baziVerdict(chart, key)]
    if (zw) verdicts.push(ziweiVerdict(zw, key))
    verdicts.push(guaVerdict(chart, key, birth))
    const agree = agreement(verdicts)
    const final = finalStance(verdicts)
    return { key, verdicts, agree, final, conclusion: conclude(key, verdicts, agree, final) }
  })

  // 格局互证：紫微五行局 vs 八字喜用
  let overall: string
  if (zw) {
    const juEl = zw.fiveElementsClass[0] as WuXing
    if (chart.favorable.includes(juEl)) {
      overall = `格局互证：紫微五行局为${zw.fiveElementsClass}，恰是八字喜用之${juEl}——两盘对你命局用神的看法一致，本次推演可信度高。`
    } else if (chart.unfavorable.includes(juEl)) {
      overall = `格局互证：紫微五行局为${zw.fiveElementsClass}，而${juEl}在八字中为忌——两盘取向有出入，说明命局寒热错杂，凡事宜留三分余地。`
    } else {
      overall = `格局互证：紫微五行局为${zw.fiveElementsClass}，与八字喜用（${chart.favorable.join('、')}）不相冲克，两盘可并行参看。`
    }
  } else {
    overall = '本次紫微盘未起，合参以八字与卦象两盘为凭；补齐紫微后印证更足。'
  }

  return {
    dims,
    overall,
    note: '卦象按梅花体例以生辰起时间卦，非临时摇卦，同一命主起卦恒定。',
  }
}
