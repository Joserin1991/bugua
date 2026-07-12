// 命主档案库：按生辰建档，记对话史与关键记忆，供大师"认人"
import type { ChatTurn } from './ai'

export interface PersonProfile {
  id: string
  title: string        // 乾造/坤造 + 生辰
  memories: string[]   // AI 提炼的长期记忆（职业/婚恋/重大打算…）
  history: ChatTurn[]  // 对话史（截尾保留）
  visits: number
  updatedAt: number
}

const LS_KEY = 'xjg-profiles'
const MAX_HISTORY = 40
const MAX_MEMORIES = 20

type Store = Record<string, PersonProfile>

function loadStore(): Store {
  try { return JSON.parse(localStorage.getItem(LS_KEY) ?? '{}') as Store } catch { return {} }
}

function saveStore(s: Store) {
  try { localStorage.setItem(LS_KEY, JSON.stringify(s)) } catch { /* 存满则放弃 */ }
}

export function profileId(gender: string, date: string, hour: number, city: string | null): string {
  return `${gender}|${date}|${hour}|${city ?? ''}`
}

// 取档（无则建档），visits 自增
export function touchProfile(id: string, title: string): PersonProfile {
  const s = loadStore()
  const p = s[id] ?? { id, title, memories: [], history: [], visits: 0, updatedAt: 0 }
  p.visits += 1
  p.title = title
  p.updatedAt = Date.now()
  s[id] = p
  saveStore(s)
  return p
}

export function appendHistory(id: string, turns: ChatTurn[]) {
  const s = loadStore()
  const p = s[id]
  if (!p) return
  p.history.push(...turns)
  if (p.history.length > MAX_HISTORY) p.history = p.history.slice(-MAX_HISTORY)
  p.updatedAt = Date.now()
  saveStore(s)
}

// 最近档案列表（按更新时间倒序）
export function listProfiles(limit = 5): PersonProfile[] {
  const s = loadStore()
  return Object.values(s).sort((a, b) => b.updatedAt - a.updatedAt).slice(0, limit)
}

export function addMemory(id: string, memo: string) {
  const m = memo.trim()
  if (!m) return
  const s = loadStore()
  const p = s[id]
  if (!p) return
  if (!p.memories.includes(m)) {
    p.memories.push(m)
    if (p.memories.length > MAX_MEMORIES) p.memories = p.memories.slice(-MAX_MEMORIES)
    p.updatedAt = Date.now()
    saveStore(s)
  }
}
