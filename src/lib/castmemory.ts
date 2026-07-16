// 一事不二占（持久化）：把已起的卦按「问题 + 当日」存本地，跨会话、跨设备保持同一卦
// 六爻（随机摇币）与梅花（时空起卦）共用——同一天同一问题，退出重进仍是此卦
import { buildResult, normalizeQuestion, type CastLine, type CastResult } from './hexagram'

interface StoredCast { lines: CastLine[]; cat: string; ts: number }
const KEY = 'xjg-casts'
const MAX = 120

function load(): Record<string, StoredCast> {
  try { return JSON.parse(localStorage.getItem(KEY) ?? '{}') as Record<string, StoredCast> } catch { return {} }
}
function persist(m: Record<string, StoredCast>) {
  try { localStorage.setItem(KEY, JSON.stringify(m)) } catch { /* 存满则忽略 */ }
}
function dayKey(q: string, d: Date): string {
  return `${normalizeQuestion(q)}|${d.getFullYear()}-${d.getMonth() + 1}-${d.getDate()}`
}

// 取今日此问已起之卦（无则 null）；空问题不记忆
export function recallCast(q: string, d = new Date()): { result: CastResult; cat: string } | null {
  if (!q.trim()) return null
  const s = load()[dayKey(q, d)]
  if (!s || !Array.isArray(s.lines) || s.lines.length !== 6) return null
  try { return { result: buildResult(s.lines), cat: s.cat } } catch { return null }
}

// 记下今日此问之卦（覆盖旧的）；超量则汰换最旧
export function rememberCast(q: string, lines: CastLine[], cat: string, d = new Date()) {
  if (!q.trim()) return
  const m = load()
  m[dayKey(q, d)] = { lines, cat, ts: Date.now() }
  const keys = Object.keys(m)
  if (keys.length > MAX) {
    keys.sort((a, b) => m[a].ts - m[b].ts).slice(0, keys.length - MAX).forEach((k) => delete m[k])
  }
  persist(m)
}
