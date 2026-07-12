// 云同步：把命主档案与问卦记录备份到自建 Worker（worker/README.md）
// 只同步档案与记录；AI 配置与密钥绝不上云
export interface SyncConfig { url: string; code: string }

const LS_KEY = 'xjg-sync-config'
const SYNC_KEYS = ['xjg-profiles', 'xuanjige_records'] as const

export function loadSyncConfig(): SyncConfig | null {
  try {
    const raw = localStorage.getItem(LS_KEY)
    if (!raw) return null
    const c = JSON.parse(raw) as SyncConfig
    return c.url && c.code ? c : null
  } catch { return null }
}

export function saveSyncConfig(c: SyncConfig | null) {
  if (!c) localStorage.removeItem(LS_KEY)
  else localStorage.setItem(LS_KEY, JSON.stringify(c))
}

interface SyncPayload { v: 1; updatedAt: string; data: Record<string, string> }

async function call(cfg: SyncConfig, method: 'GET' | 'PUT', body?: string): Promise<Response> {
  const base = cfg.url.replace(/\/+$/, '')
  const ctrl = new AbortController()
  const timer = setTimeout(() => ctrl.abort(), 20000)
  try {
    return await fetch(`${base}/sync`, {
      method,
      signal: ctrl.signal,
      headers: { 'content-type': 'application/json', 'x-sync-code': cfg.code },
      body,
    })
  } finally {
    clearTimeout(timer)
  }
}

async function readError(res: Response): Promise<string> {
  try { return (await res.json()).error ?? `HTTP ${res.status}` } catch { return `HTTP ${res.status}` }
}

export async function syncUpload(cfg: SyncConfig): Promise<string> {
  const data: Record<string, string> = {}
  for (const k of SYNC_KEYS) {
    const v = localStorage.getItem(k)
    if (v) data[k] = v
  }
  if (!Object.keys(data).length) throw new Error('本机还没有可备份的档案或记录')
  const payload: SyncPayload = { v: 1, updatedAt: new Date().toISOString(), data }
  const body = JSON.stringify(payload)
  const res = await call(cfg, 'PUT', body)
  if (!res.ok) throw new Error(await readError(res))
  return `已备份到云端（${(body.length / 1024).toFixed(1)}KB）`
}

export async function syncRestore(cfg: SyncConfig): Promise<string> {
  const res = await call(cfg, 'GET')
  if (!res.ok) throw new Error(await readError(res))
  const payload = await res.json() as SyncPayload
  if (payload.v !== 1 || !payload.data) throw new Error('云端数据格式不认识')
  let n = 0
  for (const k of SYNC_KEYS) {
    if (payload.data[k]) { localStorage.setItem(k, payload.data[k]); n++ }
  }
  if (!n) throw new Error('云端备份是空的')
  const when = payload.updatedAt ? new Date(payload.updatedAt).toLocaleString('zh-CN') : '未知时间'
  return `已恢复 ${when} 的备份——刷新页面后生效`
}
