// 原子组件：最小可复用渲染单元，全部参数化（JSON in → 视觉 out）
import { TOKENS, wuxingColor } from '../dassets/tokens'
import { GAN_WUXING, ZHI_WUXING, GAN_YINYANG } from '../lib/wuxing'

// 干支单字：{ char, wuxing?, yinyang?, size? } → 自动取色/取字重
// 例：<GanZhiChar char="甲" /> 自动推得 木/阳 → #4f7359 / 600
export function GanZhiChar({
  char, wuxing, yinyang, size = 1.7, brush = true,
}: {
  char: string
  wuxing?: string
  yinyang?: '阳' | '阴'
  size?: number       // rem
  brush?: boolean
}) {
  const wx = wuxing ?? GAN_WUXING[char] ?? ZHI_WUXING[char]
  const yy = yinyang ?? GAN_YINYANG[char] ?? '阳'
  const rule = TOKENS.yinyang[yy]
  return (
    <span style={{
      color: wuxingColor(wx),
      opacity: rule.opacity,
      fontWeight: rule.weight,
      fontSize: `${size}rem`,
      fontFamily: brush ? TOKENS.font.brush : TOKENS.font.kai,
      lineHeight: 1.15,
    }}>
      {char}
    </span>
  )
}

// 朱砂小印：<SealTag>日</SealTag>
export function SealTag({ children }: { children: React.ReactNode }) {
  return (
    <span style={{
      background: TOKENS.seal,
      color: TOKENS.paperText,
      fontSize: '0.62rem',
      borderRadius: 2,
      padding: '1px 4px',
      letterSpacing: '0.1em',
      fontFamily: TOKENS.font.kai,
    }}>
      {children}
    </span>
  )
}

// 吉凶评分点：score 1-5 → 颜色+标签
export function LuckDot({ score }: { score: number }) {
  const l = TOKENS.luckScale.find((s) => score >= s.min) ?? TOKENS.luckScale[4]
  return (
    <span style={{ display: 'inline-flex', alignItems: 'center', gap: 4, fontSize: '0.78rem', color: l.color }}>
      <span style={{ width: 8, height: 8, borderRadius: '50%', background: l.color, display: 'inline-block' }} />
      {l.label}
    </span>
  )
}
