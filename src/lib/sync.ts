// 云同步：把命主档案、问卦记录与 AI 配置备份到自建 Worker（worker/README.md）
// 服务地址内置，不在界面展示；用户只需记一个同步口令
export const SYNC_URL = 'https://xuanjige-api.xuanjige.workers.dev'

export interface SyncConfig { code: string; url?: string } // url 仅作隐藏覆盖位（测试/自部署）

const LS_KEY = 'xjg-sync-config'
const SYNC_KEYS = ['xjg-profiles', 'xuanjige_records', 'xjg-ai-config'] as const

export function loadSyncConfig(): SyncConfig | null {
  try {
    const raw = localStorage.getItem(LS_KEY)
    if (!raw) return null
    const c = JSON.parse(raw) as SyncConfig
    return c.code ? c : null
  } catch { return null }
}

export function saveSyncConfig(c: SyncConfig | null) {
  if (!c) localStorage.removeItem(LS_KEY)
  else localStorage.setItem(LS_KEY, JSON.stringify(c))
}

interface SyncPayload { v: 1; updatedAt: string; data: Record<string, string> }

async function call(cfg: SyncConfig, method: 'GET' | 'PUT', body?: string): Promise<Response> {
  const base = (cfg.url || SYNC_URL).replace(/\/+$/, '')
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
  if (!Object.keys(data).length) throw new Error('本机还没有可备份的档案、记录或配置')
  const payload: SyncPayload = { v: 1, updatedAt: new Date().toISOString(), data }
  const body = JSON.stringify(payload)
  const res = await call(cfg, 'PUT', body)
  if (!res.ok) throw new Error(await readError(res))
  const parts = [
    data['xjg-profiles'] ? '档案' : '',
    data['xuanjige_records'] ? '记录' : '',
    data['xjg-ai-config'] ? 'AI配置' : '',
  ].filter(Boolean).join('、')
  return `已备份到云端：${parts}（${(body.length / 1024).toFixed(1)}KB）`
}

// 首次使用自动生成恢复码（备份身份）；换设备输入同一码即可取回
export function ensureSyncCode(): string {
  const saved = loadSyncConfig()
  if (saved?.code) return saved.code
  const bytes = new Uint8Array(5)
  crypto.getRandomValues(bytes)
  const code = 'XJG-' + [...bytes].map((b) => b.toString(36).padStart(2, '0')).join('').slice(0, 8).toUpperCase()
  saveSyncConfig({ ...(saved ?? {}), code })
  return code
}

// 静默自动备份：数据变更后防抖 5 秒上传，失败不打扰（下次变更再试）
let backupTimer: ReturnType<typeof setTimeout> | null = null
export function scheduleBackup(delayMs = 5000) {
  if (typeof localStorage === 'undefined') return
  if (backupTimer) clearTimeout(backupTimer)
  backupTimer = setTimeout(() => {
    backupTimer = null
    const cfg = loadSyncConfig()
    if (cfg) syncUpload(cfg).catch(() => { /* 静默，等下次 */ })
  }, delayMs)
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
