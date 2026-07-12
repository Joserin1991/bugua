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

// 访问口令校验：设了 ACCESS_CODE 才拦，防止陌生人拿 Worker 地址烧额度
function checkAccess(req, env) {
  if (!env.ACCESS_CODE) return true
  return (req.headers.get('authorization') || '') === `Bearer ${env.ACCESS_CODE}`
}

async function aiProxy(req, env, h) {
  if (!checkAccess(req, env)) return json({ error: { message: '访问口令不对（在「我的」页 API Key 一栏填 Worker 的访问口令）' } }, h, 401)
  if (!env.UPSTREAM_KEY || !env.UPSTREAM_BASE) return json({ error: { message: 'Worker 未配置上游（UPSTREAM_BASE / UPSTREAM_KEY）' } }, h, 500)
  const body = await req.json()
  const payload = {
    model: env.UPSTREAM_MODEL || body.model,
    messages: Array.isArray(body.messages) ? body.messages.slice(-24) : [],
    max_tokens: Math.min(Number(body.max_tokens) || 800, 1200),
    temperature: body.temperature ?? 0.8,
  }
  const res = await fetch(`${env.UPSTREAM_BASE.replace(/\/+$/, '')}/chat/completions`, {
    method: 'POST',
    headers: { 'content-type': 'application/json', authorization: `Bearer ${env.UPSTREAM_KEY}` },
    body: JSON.stringify(payload),
  })
  const text = await res.text()
  return new Response(text, { status: res.status, headers: { 'content-type': 'application/json', ...h } })
}

function models(req, env, h) {
  if (!checkAccess(req, env)) return json({ error: { message: '访问口令不对' } }, h, 401)
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
