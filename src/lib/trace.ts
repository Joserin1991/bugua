// 推演过程引擎：把排盘的每一步推理摊开——规则 · 盘中证据 · 结论
import type { BaziChart } from './bazi'
import { GAN_WUXING, GAN_YINYANG, SHENG, KE, type WuXing } from './wuxing'

export interface TraceStep {
  title: string
  rule: string        // 依据的规则（古法口诀/算法）
  evidence: string[]  // 本盘的具体证据
  result: string      // 得出的结论
}

// 五鼠遁：日干 → 子时起干
const WUSHU: Record<string, string> = {
  甲: '甲', 己: '甲', 乙: '丙', 庚: '丙', 丙: '戊', 辛: '戊', 丁: '庚', 壬: '庚', 戊: '壬', 癸: '壬',
}

function tenGodReason(dayGan: string, other: string): string {
  const me = GAN_WUXING[dayGan]; const it = GAN_WUXING[other]
  const same = GAN_YINYANG[dayGan] === GAN_YINYANG[other] ? '同性' : '异性'
  let rel: string; let god: string
  if (it === me) { rel = `${it}与${me}同气（同我）`; god = same === '同性' ? '比肩' : '劫财' }
  else if (SHENG[me] === it) { rel = `${me}生${it}（我生）`; god = same === '同性' ? '食神' : '伤官' }
  else if (KE[me] === it) { rel = `${me}克${it}（我克）`; god = same === '同性' ? '偏财' : '正财' }
  else if (KE[it] === me) { rel = `${it}克${me}（克我）`; god = same === '同性' ? '七杀' : '正官' }
  else { rel = `${it}生${me}（生我）`; god = same === '同性' ? '偏印' : '正印' }
  return `${other}（${GAN_YINYANG[other]}${it}）对日主${dayGan}（${GAN_YINYANG[dayGan]}${me}）：${rel}，阴阳${same} → ${god}`
}

export function buildTrace(chart: BaziChart): TraceStep[] {
  const steps: TraceStep[] = []
  const [yp, mp, dp, tp] = chart.pillars

  // ① 真太阳时
  if (chart.solarCorrection) {
    const c = chart.solarCorrection
    steps.push({
      title: '真太阳时校正',
      rule: '排盘须用出生地太阳时：真太阳时 ≈ 钟表时间 + (当地经度 − 120°) × 4 分钟',
      evidence: [
        `出生地 ${c.city}，东经 ${c.lng}°`,
        `经度差 ${(c.lng - 120).toFixed(2)}° × 4 ≈ ${c.offsetMin > 0 ? '+' : ''}${c.offsetMin} 分钟`,
        `钟表时间 ${c.clockText} → 真太阳时 ${c.trueText}`,
      ],
      result: `以 ${c.trueText} 定时辰，${Math.abs(c.offsetMin) >= 30 ? '校正幅度较大，时柱以此为准' : '校正后时辰未变或微调'}`,
    })
  } else {
    steps.push({
      title: '真太阳时校正',
      rule: '排盘须用出生地太阳时（未选择出生地，按钟表时间排盘）',
      evidence: ['未提供出生地经度'],
      result: '按北京时间直接定时辰（若生于中西部，建议补出生地重排）',
    })
  }

  // ② 四柱定立
  const wushuStart = WUSHU[chart.dayGan]
  steps.push({
    title: '四柱定立',
    rule: '年柱以立春为界；月柱以节气换月；日柱按干支纪日连续推算；时柱用五鼠遁（甲己还加甲、乙庚丙作初…）',
    evidence: [
      `生于节气「${chart.jieQi}」之后 → 月柱定为 ${mp.gan}${mp.zhi}`,
      `年柱 ${yp.gan}${yp.zhi}（立春为界，非正月初一）`,
      `日柱 ${dp.gan}${dp.zhi}（六十甲子纪日）`,
      `五鼠遁：日干${chart.dayGan} → 子时起${wushuStart}，顺数至${tp.zhi}时 → 时干${tp.gan}`,
    ],
    result: `四柱：${chart.pillars.map((p) => p.gan + p.zhi).join('　')}`,
  })

  // ③ 十神对应
  steps.push({
    title: '十神对应',
    rule: '以日干为「我」：同我者比劫、我生者食伤、我克者财、克我者官杀、生我者印；再按阴阳同异分正偏',
    evidence: [
      tenGodReason(chart.dayGan, yp.gan),
      tenGodReason(chart.dayGan, mp.gan),
      tenGodReason(chart.dayGan, tp.gan),
    ],
    result: `年干${yp.ganGod} · 月干${mp.ganGod} · 时干${tp.ganGod}（地支藏干同法，见细盘）`,
  })

  // ④ 五行旺衰打分
  steps.push({
    title: '日主旺衰判定',
    rule: '得令（月令，上限40）+ 得地（地支根气，上限35）+ 得势（天干帮扶）合计打分：≥65 身强 / 50-64 偏强 / 38-49 中和 / 25-37 偏弱 / <25 身弱',
    evidence: chart.strengthSteps.map((s) => `【${s.name} +${s.score}】规则：${s.rule}｜本盘：${s.evidence}`),
    result: `合计 ${chart.strength.score} 分 → 判「${chart.strength.level}」`,
  })

  // ⑤ 取喜用神
  const isStrong = chart.strength.level.includes('强')
  const isNeutral = chart.strength.level === '中和'
  steps.push({
    title: '扶抑取喜用',
    rule: '扶抑法：身强者宜克泄耗（取官杀/食伤/财），身弱者宜生扶（取印/比劫），中和者补最弱之行以求流通',
    evidence: [
      `日主判「${chart.strength.level}」`,
      isNeutral
        ? `五行盈虚：${(Object.entries(chart.wuxingCount) as [WuXing, number][]).map(([w, n]) => `${w}${n}`).join('、')}，取最弱两行`
        : isStrong
          ? `身强不可再扶，取克我、泄我、耗我之行`
          : `身弱须生扶，取生我（印）与同我（比劫）之行`,
    ],
    result: `喜用 ${chart.favorable.join('、')}；忌 ${chart.unfavorable.join('、')}`,
  })

  // ⑥ 大运排法
  const yearYY = GAN_YINYANG[yp.gan]
  const forward = (yearYY === '阳' && chart.gender === '男') || (yearYY === '阴' && chart.gender === '女')
  steps.push({
    title: '大运排法',
    rule: '阳年男命/阴年女命顺排，阴年男命/阳年女命逆排；自月柱干支顺（逆）推，每十年一运；起运数按出生距节气三日折一岁',
    evidence: [
      `年干${yp.gan}属${yearYY}，${chart.gender}命 → ${forward ? '顺' : '逆'}排`,
      `自月柱 ${mp.gan}${mp.zhi} ${forward ? '顺' : '逆'}推：第一步大运 ${chart.daYun[0]?.ganZhi ?? ''}`,
      chart.qiYunText,
    ],
    result: `八步大运：${chart.daYun.slice(0, 4).map((d) => d.ganZhi).join('、')}……（每运十年）`,
  })

  return steps
}
