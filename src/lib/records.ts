// 我的记录：localStorage 存档
export interface RecordItem {
  id: string
  type: '八字排盘' | '六爻问事' | '答疑解惑'
  title: string
  summary: string
  date: string // YYYY-MM-DD HH:mm
}

const KEY = 'xuanjige_records'

export function loadRecords(): RecordItem[] {
  try {
    return JSON.parse(localStorage.getItem(KEY) ?? '[]')
  } catch {
    return []
  }
}

export function saveRecord(r: Omit<RecordItem, 'id' | 'date'>) {
  const now = new Date()
  const item: RecordItem = {
    ...r,
    id: `${now.getTime()}`,
    date: `${now.getFullYear()}-${String(now.getMonth() + 1).padStart(2, '0')}-${String(now.getDate()).padStart(2, '0')} ${String(now.getHours()).padStart(2, '0')}:${String(now.getMinutes()).padStart(2, '0')}`,
  }
  const list = [item, ...loadRecords()].slice(0, 50)
  try {
    localStorage.setItem(KEY, JSON.stringify(list))
  } catch { /* 存储不可用时静默 */ }
}
