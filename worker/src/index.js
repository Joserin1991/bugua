// 玄机阁轻后端（Cloudflare Workers 免费档）
// 1) AI 代理：/v1/chat/completions —— 上游密钥只存 Worker Secret（UPSTREAM_KEY），
//    前端只需填 Worker 地址 + 访问口令（ACCESS_CODE），密钥永不进浏览器
// 2) 云同步：/sync —— 以「同步口令」的 SHA-256 作 KV 键，存命主档案与记录，
//    口令不落盘、不可枚举；不存 AI 配置与任何密钥

export default {
  async fetch(req, env) {
    const h = cors(env)
    if (req.method === 'OPTIONS') return new Response(null, { status: 204, headers: h })
    const url = new URL(req.url)
    try {
      if (url.pathname === '/v1/chat/completions' && req.method === 'POST') return await aiProxy(req, env, h)
      if (url.pathname === '/v1/models' && req.method === 'GET') return models(req, env, h)
      if (url.pathname === '/sync') return await sync(req, env, h)
      if (url.pathname === '/') return json({ ok: true, service: '玄机阁轻后端', endpoints: ['/v1/chat/completions', '/v1/models', '/sync'] }, h)
      return json({ error: 'not found' }, h, 404)
    } catch (e) {
      return json({ error: String(e && e.message ? e.message : e) }, h, 500)
    }
  },
}

function cors(env) {
  return {
    'access-control-allow-origin': env.ALLOW_ORIGIN || '*',
    'access-control-allow-headers': 'authorization, content-type, x-sync-code',
    'access-control-allow-methods': 'GET, PUT, POST, OPTIONS',
    'access-control-max-age': '86400',
  }
}

const json = (obj, headers, status = 200) =>
  new Response(JSON.stringify(obj), { status, headers: { 'content-type': 'application/json', ...headers } })

// 特权口令：带对 ACCESS_CODE 的请求不限额（自用）
function privileged(req, env) {
  return !!env.ACCESS_CODE && (req.headers.get('authorization') || '') === `Bearer ${env.ACCESS_CODE}`
}

// 网页零配置访问：来源须在白名单内，且受每日限额（全站 + 单IP）约束
function originAllowed(req, env) {
  const origin = req.headers.get('origin') || ''
  if (/^http:\/\/localhost(:\d+)?$/.test(origin)) return true // 本地开发
  const allowed = (env.PUBLIC_ORIGINS || '').split(',').map((s) => s.trim()).filter(Boolean)
  return allowed.includes(origin)
}

async function rateLimit(req, env) {
  if (!env.SYNC_KV) return null // 未绑定 KV 时不限（不建议）
  const day = new Date().toISOString().slice(0, 10)
  const ip = req.headers.get('cf-connecting-ip') || 'unknown'
  const gKey = `rl:${day}`
  const iKey = `rl:${day}:${ip}`
  const [g, i] = await Promise.all([env.SYNC_KV.get(gKey), env.SYNC_KV.get(iKey)])
  const gN = parseInt(g || '0', 10)
  const iN = parseInt(i || '0', 10)
  if (gN >= parseInt(env.DAILY_LIMIT || '300', 10)) return '今日全站问询额度已用尽，明日再来'
  if (iN >= parseInt(env.IP_DAILY_LIMIT || '60', 10)) return '你今日已问了许多，且回去消化消化，明日再来'
  await Promise.all([
    env.SYNC_KV.put(gKey, String(gN + 1), { expirationTtl: 172800 }),
    env.SYNC_KV.put(iKey, String(iN + 1), { expirationTtl: 172800 }),
  ])
  return null
}

// 单个上游调用，自带超时（超时/网络错误抛出，交由上层切备用）
async function callUpstream(u, payload, timeoutMs) {
  const ctrl = new AbortController()
  const timer = setTimeout(() => ctrl.abort(), timeoutMs)
  try {
    const res = await fetch(`${u.base.replace(/\/+$/, '')}/chat/completions`, {
      method: 'POST',
      signal: ctrl.signal,
      headers: { 'content-type': 'application/json', authorization: `Bearer ${u.key}` },
      body: JSON.stringify({ ...payload, model: u.model || payload.model }),
    })
    const text = await res.text()
    return { ok: res.ok, status: res.status, text }
  } finally {
    clearTimeout(timer)
  }
}

async function aiProxy(req, env, h) {
  if (!privileged(req, env)) {
    if (!originAllowed(req, env)) return json({ error: { message: '仅允许玄机阁网页调用' } }, h, 401)
    const limited = await rateLimit(req, env)
    if (limited) return json({ error: { message: limited } }, h, 429)
  }
  if (!env.UPSTREAM_KEY || !env.UPSTREAM_BASE) return json({ error: { message: 'Worker 未配置上游（UPSTREAM_BASE / UPSTREAM_KEY）' } }, h, 500)
  const body = await req.json()
  const payload = {
    model: env.UPSTREAM_MODEL || body.model,
    messages: Array.isArray(body.messages) ? body.messages.slice(-24) : [],
    max_tokens: Math.min(Number(body.max_tokens) || 1500, 4000),
    temperature: body.temperature ?? 0.8,
  }
  const primary = { base: env.UPSTREAM_BASE, key: env.UPSTREAM_KEY, model: env.UPSTREAM_MODEL }
  const backup = env.UPSTREAM2_BASE && env.UPSTREAM2_KEY
    ? { base: env.UPSTREAM2_BASE, key: env.UPSTREAM2_KEY, model: env.UPSTREAM2_MODEL || env.UPSTREAM_MODEL }
    : null
  // 主上游先行，失败/超时则切备用；任一成功即返
  let result = null
  try { result = await callUpstream(primary, payload, 25000) } catch { result = null }
  if ((!result || !result.ok) && backup) {
    try {
      const alt = await callUpstream(backup, payload, 30000)
      if (alt.ok || !result) result = alt
    } catch { /* 备用也挂 → 保留主上游错误（若有） */ }
  }
  if (!result) return json({ error: { message: '上游暂时不可用，请稍后再试' } }, h, 502)
  return new Response(result.text, { status: result.status, headers: { 'content-type': 'application/json', ...h } })
}

function models(req, env, h) {
  if (!privileged(req, env) && !originAllowed(req, env)) return json({ error: { message: '仅允许玄机阁网页调用' } }, h, 401)
  return json({ data: env.UPSTREAM_MODEL ? [{ id: env.UPSTREAM_MODEL }] : [] }, h)
}

async function sha256(text) {
  const buf = await crypto.subtle.digest('SHA-256', new TextEncoder().encode(text))
  return [...new Uint8Array(buf)].map((b) => b.toString(16).padStart(2, '0')).join('')
}

async function sync(req, env, h) {
  if (!env.SYNC_KV) return json({ error: 'Worker 未绑定 KV（SYNC_KV）' }, h, 500)
  const code = (req.headers.get('x-sync-code') || '').trim()
  if (code.length < 6) return json({ error: '同步口令至少 6 位' }, h, 400)
  const key = `sync:${await sha256(code)}`
  if (req.method === 'GET') {
    const val = await env.SYNC_KV.get(key)
    if (!val) return json({ error: '云端没有这个口令的备份' }, h, 404)
    return new Response(val, { headers: { 'content-type': 'application/json', ...h } })
  }
  if (req.method === 'PUT') {
    const text = await req.text()
    if (text.length > 512 * 1024) return json({ error: '备份超过 512KB' }, h, 413)
    JSON.parse(text) // 非法 JSON 直接拒收
    await env.SYNC_KV.put(key, text)
    return json({ ok: true, bytes: text.length }, h)
  }
  return json({ error: 'method not allowed' }, h, 405)
}
