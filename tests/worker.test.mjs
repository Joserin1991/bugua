// Worker 逻辑测试：在 Node 里直接调 fetch handler（Request/Response 为 Web 标准，与 Workers 一致）
import assert from 'node:assert/strict'
import { createServer } from 'node:http'
import worker from '../worker/src/index.js'

// 模拟上游 OpenAI 兼容接口
const upstream = createServer((req, res) => {
  let b = ''
  req.on('data', (c) => { b += c })
  req.on('end', () => {
    const j = JSON.parse(b)
    res.writeHead(200, { 'content-type': 'application/json' })
    res.end(JSON.stringify({
      choices: [{ message: { content: `auth=${req.headers.authorization};model=${j.model};max=${j.max_tokens};msgs=${j.messages.length}` } }],
    }))
  })
})
await new Promise((r) => upstream.listen(4630, r))

// 模拟 KV
const kvStore = new Map()
const SYNC_KV = {
  get: async (k) => kvStore.get(k) ?? null,
  put: async (k, v) => { kvStore.set(k, v) },
}

const env = {
  UPSTREAM_BASE: 'http://localhost:4630/v1',
  UPSTREAM_KEY: 'sk-secret-upstream',
  UPSTREAM_MODEL: 'fixed-model',
  ACCESS_CODE: 'guest-pass',
  PUBLIC_ORIGINS: 'https://joserin1991.github.io',
  DAILY_LIMIT: '10',
  IP_DAILY_LIMIT: '2',
  SYNC_KV,
}

const call = (path, init) => worker.fetch(new Request(`https://w.example${path}`, init), env)

let passed = 0
async function test(name, fn) {
  try { await fn(); passed++; console.log(`  ✓ ${name}`) } catch (e) { console.error(`  ✗ ${name}`); throw e }
}

console.log('AI 代理')

await test('CORS 预检返回 204 且带跨域头', async () => {
  const res = await call('/v1/chat/completions', { method: 'OPTIONS' })
  assert.equal(res.status, 204)
  assert.equal(res.headers.get('access-control-allow-origin'), '*')
})

await test('陌生来源且无口令 → 401，不打上游', async () => {
  const res = await call('/v1/chat/completions', { method: 'POST', headers: { origin: 'https://evil.example' }, body: JSON.stringify({ messages: [] }) })
  assert.equal(res.status, 401)
})

await test('白名单来源零配置直通：换密钥、锁模型、封顶 tokens、截历史', async () => {
  const messages = Array.from({ length: 30 }, (_, i) => ({ role: 'user', content: `m${i}` }))
  const res = await call('/v1/chat/completions', {
    method: 'POST',
    headers: { origin: 'https://joserin1991.github.io', 'cf-connecting-ip': '1.1.1.1' },
    body: JSON.stringify({ model: 'whatever', messages, max_tokens: 99999 }),
  })
  assert.equal(res.status, 200)
  const text = (await res.json()).choices[0].message.content
  assert.ok(text.includes('auth=Bearer sk-secret-upstream'), '上游应收到真密钥')
  assert.ok(text.includes('model=fixed-model'), '模型应被 Worker 锁定')
  assert.ok(text.includes('max=4000'), 'max_tokens 应封顶 4000')
  assert.ok(text.includes('msgs=24'), '历史应截到 24 条')
})

await test('单 IP 每日限额（IP_DAILY_LIMIT=2）：第3次 429', async () => {
  const hit = () => call('/v1/chat/completions', {
    method: 'POST',
    headers: { origin: 'https://joserin1991.github.io', 'cf-connecting-ip': '2.2.2.2' },
    body: JSON.stringify({ messages: [{ role: 'user', content: 'q' }] }),
  })
  assert.equal((await hit()).status, 200)
  assert.equal((await hit()).status, 200)
  assert.equal((await hit()).status, 429, '第3次应触 IP 限额')
})

await test('全站每日限额：达到 DAILY_LIMIT 后 429', async () => {
  env.DAILY_LIMIT = '3' // 此前全站已计 3 次（1.1.1.1×1 + 2.2.2.2×2）
  const res = await call('/v1/chat/completions', {
    method: 'POST',
    headers: { origin: 'https://joserin1991.github.io', 'cf-connecting-ip': '3.3.3.3' },
    body: JSON.stringify({ messages: [{ role: 'user', content: 'q' }] }),
  })
  assert.equal(res.status, 429)
  env.DAILY_LIMIT = '10'
})

await test('特权口令不受限额与来源约束', async () => {
  const res = await call('/v1/chat/completions', {
    method: 'POST',
    headers: { authorization: 'Bearer guest-pass', origin: 'https://evil.example' },
    body: JSON.stringify({ messages: [{ role: 'user', content: 'q' }] }),
  })
  assert.equal(res.status, 200)
})

await test('localhost 开发来源放行', async () => {
  const res = await call('/v1/models', { headers: { origin: 'http://localhost:4519' } })
  assert.deepEqual((await res.json()).data, [{ id: 'fixed-model' }])
})

await test('主上游挂掉 → 自动切备用上游', async () => {
  // 备用上游（500x）：正常回话
  const backup = createServer((req, res) => {
    let bb = ''; req.on('data', (c) => { bb += c })
    req.on('end', () => {
      const j = JSON.parse(bb)
      res.writeHead(200, { 'content-type': 'application/json' })
      res.end(JSON.stringify({ choices: [{ message: { content: `backup;model=${j.model};key=${req.headers.authorization}` } }] }))
    })
  })
  await new Promise((r) => backup.listen(4631, r))
  const env2 = { ...env, UPSTREAM_BASE: 'http://127.0.0.1:1/v1', UPSTREAM2_BASE: 'http://localhost:4631/v1', UPSTREAM2_KEY: 'sk-backup', UPSTREAM2_MODEL: 'backup-model', DAILY_LIMIT: '999', IP_DAILY_LIMIT: '999' }
  const res = await worker.fetch(new Request('https://w.example/v1/chat/completions', {
    method: 'POST',
    headers: { origin: 'https://joserin1991.github.io', 'cf-connecting-ip': '9.9.9.9' },
    body: JSON.stringify({ messages: [{ role: 'user', content: 'q' }] }),
  }), env2)
  assert.equal(res.status, 200)
  const text = (await res.json()).choices[0].message.content
  assert.ok(text.includes('backup'), '应由备用上游应答')
  assert.ok(text.includes('key=Bearer sk-backup'), '备用应使用备用密钥')
  assert.ok(text.includes('model=backup-model'), '备用应使用备用模型')
  backup.close()
})

console.log('云同步')

await test('口令太短拒绝 400', async () => {
  const res = await call('/sync', { method: 'PUT', headers: { 'x-sync-code': 'abc' }, body: '{}' })
  assert.equal(res.status, 400)
})

await test('PUT 后 GET 取回同一份；不同口令互不可见', async () => {
  const payload = JSON.stringify({ v: 1, data: { 'xjg-profiles': '{"a":1}' } })
  const put = await call('/sync', { method: 'PUT', headers: { 'x-sync-code': 'my-secret-1' }, body: payload })
  assert.equal(put.status, 200)
  const get = await call('/sync', { method: 'GET', headers: { 'x-sync-code': 'my-secret-1' } })
  assert.equal(await get.text(), payload)
  const other = await call('/sync', { method: 'GET', headers: { 'x-sync-code': 'my-secret-2' } })
  assert.equal(other.status, 404)
})

await test('KV 键是口令哈希，不存明文口令', async () => {
  for (const k of [...kvStore.keys()].filter((x) => x.startsWith('sync:'))) {
    assert.ok(/^sync:[0-9a-f]{64}$/.test(k), `键应为 sync:<sha256>，实际 ${k}`)
    assert.ok(!k.includes('my-secret'), '不得出现明文口令')
  }
})

await test('非法 JSON 拒收 500', async () => {
  const res = await call('/sync', { method: 'PUT', headers: { 'x-sync-code': 'my-secret-1' }, body: 'not json' })
  assert.equal(res.status, 500)
})

console.log(`\n全部通过：${passed} 项`)
upstream.close()
