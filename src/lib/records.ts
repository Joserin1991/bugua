// 我的记录：localStorage 存档（含完整对话记录，可回看续问）
import { scheduleBackup } from './sync'
import type { GuaInfo } from './ai'

export interface ChatLine { r: 'm' | 'u'; t: string } // m=大师 u=命主

export interface RecordItem {
  id: string
  type: '八字排盘' | '六爻问事' | '答疑解惑'
  title: string
  summary: string
  date: string // YYYY-MM-DD HH:mm
  pid?: string // 命主档案ID（八字记录可据此续盘续问）
  chat?: ChatLine[] // 当次对话记录（回看/续问用）
  gua?: { info: GuaInfo; question: string; category: string } // 卦象上下文（续问时重建 AI 语境）
}

const KEY = 'xuanjige_records'
const MAX_CHAT = 80

export function loadRecords(): RecordItem[] {
  try {
    return JSON.parse(localStorage.getItem(KEY) ?? '[]')
  } catch {
    return []
  }
}

function persist(list: RecordItem[]) {
  try {
    localStorage.setItem(KEY, JSON.stringify(list))
  } catch { /* 存储不可用时静默 */ }
  scheduleBackup()
}

export function saveRecord(r: Omit<RecordItem, 'id' | 'date'>): string {
  const now = new Date()
  const item: RecordItem = {
    ...r,
    chat: r.chat?.slice(-MAX_CHAT),
    id: `${now.getTime()}`,
    date: `${now.getFullYear()}-${String(now.getMonth() + 1).padStart(2, '0')}-${String(now.getDate()).padStart(2, '0')} ${String(now.getHours()).padStart(2, '0')}:${String(now.getMinutes()).padStart(2, '0')}`,
  }
  persist([item, ...loadRecords()].slice(0, 50))
  return item.id
}

// 对话进行中随时补记（防抖交给 scheduleBackup）
export function updateRecordChat(id: string, chat: ChatLine[]) {
  const list = loadRecords()
  const item = list.find((x) => x.id === id)
  if (!item) return
  item.chat = chat.slice(-MAX_CHAT)
  persist(list)
}
