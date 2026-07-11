// 六爻起卦与卦象推演
import { HEXAGRAMS, TRIGRAM_LINES, type HexagramInfo } from '../data/hexagrams'

export type YaoValue = 6 | 7 | 8 | 9 // 老阴 少阳 少阴 老阳

export interface CastLine {
  value: YaoValue
  yang: boolean     // 本卦中是否为阳
  changing: boolean // 是否动爻
  coins: boolean[]  // 三枚铜钱正反（true=字/正面）
}

export interface CastResult {
  lines: CastLine[]        // 自下而上六爻
  original: HexagramInfo   // 本卦
  changed: HexagramInfo | null // 变卦（无动爻则 null）
  mutual: HexagramInfo     // 互卦
  changingIndexes: number[]
}

const YAO_NAMES = ['初爻', '二爻', '三爻', '四爻', '五爻', '上爻']
export { YAO_NAMES }

// 由六爻（自下而上，1阳0阴）查卦
const LINES_TO_HEX = new Map<string, HexagramInfo>()
for (const h of HEXAGRAMS) {
  const lower = TRIGRAM_LINES[h.lower]
  const upper = TRIGRAM_LINES[h.upper]
  LINES_TO_HEX.set([...lower, ...upper].join(''), h)
}

export function hexFromLines(bits: number[]): HexagramInfo {
  const h = LINES_TO_HEX.get(bits.join(''))
  if (!h) throw new Error('无效卦象: ' + bits.join(''))
  return h
}

// 三枚铜钱一掷：字（正）为 3，背为 2，三枚相加 6/7/8/9
export function tossOnce(rand: () => number = Math.random): CastLine {
  const coins = [rand() < 0.5, rand() < 0.5, rand() < 0.5]
  const sum = coins.reduce((s: number, c) => s + (c ? 3 : 2), 0) as YaoValue
  return {
    value: sum,
    yang: sum === 7 || sum === 9,
    changing: sum === 6 || sum === 9,
    coins,
  }
}

export function buildResult(lines: CastLine[]): CastResult {
  const origBits = lines.map((l) => (l.yang ? 1 : 0))
  const changedBits = lines.map((l) => {
    if (!l.changing) return l.yang ? 1 : 0
    return l.yang ? 0 : 1
  })
  const changingIndexes = lines.map((l, i) => (l.changing ? i : -1)).filter((i) => i >= 0)
  // 互卦：取 2,3,4 爻为下卦，3,4,5 爻为上卦
  const mutualBits = [origBits[1], origBits[2], origBits[3], origBits[2], origBits[3], origBits[4]]
  return {
    lines,
    original: hexFromLines(origBits),
    changed: changingIndexes.length ? hexFromLines(changedBits) : null,
    mutual: hexFromLines(mutualBits),
    changingIndexes,
  }
}

// 梅花易数：以问题文字与时间起卦（确定性），用于「答疑解惑」
export function castByQuestion(question: string, date: Date): CastResult {
  let seed = 0
  for (const ch of question) seed = (seed * 131 + ch.codePointAt(0)!) >>> 0
  seed = (seed + date.getFullYear() * 12 + (date.getMonth() + 1) * 31 + date.getDate() * 24 + date.getHours() * 60 + date.getMinutes()) >>> 0

  // 简易可复现伪随机
  let s = seed || 88
  const rand = () => {
    s ^= s << 13; s >>>= 0
    s ^= s >> 17
    s ^= s << 5; s >>>= 0
    return s / 4294967296
  }
  const lines = Array.from({ length: 6 }, () => tossOnce(rand))
  // 梅花体例：至少保证一个动爻，取问题字数模六
  if (!lines.some((l) => l.changing)) {
    const idx = [...question].length % 6
    const l = lines[idx]
    lines[idx] = { ...l, value: (l.yang ? 9 : 6) as YaoValue, changing: true }
  }
  return buildResult(lines)
}

export function hexUnicode(h: HexagramInfo): string {
  return String.fromCodePoint(0x4dbf + h.id)
}

export const LUCK_LABEL: Record<number, string> = {
  5: '上上 · 大吉', 4: '上吉', 3: '中平', 2: '小凶 · 宜慎', 1: '下 · 凶中藏机',
}
