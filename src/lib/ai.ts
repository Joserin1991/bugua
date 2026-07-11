// 大师 AI 问答：把命盘全量证据交给大模型，回答专业+可懂+有情绪价值
// 密钥只存用户本机 localStorage，绝不写入代码库或上传
import type { BaziChart } from './bazi'
import type { ZwChart } from './ziwei'
import { buildTrace } from './trace'

export interface AiConfig {
  baseUrl: string // 如 https://api.openai.com/v1 或 https://api.anthropic.com
  apiKey: string
  model: string
}

const LS_KEY = 'xjg-ai-config'

export function loadAiConfig(): AiConfig | null {
  try {
    const raw = localStorage.getItem(LS_KEY)
    if (!raw) return null
    const c = JSON.parse(raw) as AiConfig
    return c.baseUrl && c.apiKey && c.model ? c : null
  } catch { return null }
}

export function saveAiConfig(c: AiConfig | null) {
  if (!c) localStorage.removeItem(LS_KEY)
  else localStorage.setItem(LS_KEY, JSON.stringify(c))
}

export interface ChatTurn { role: 'user' | 'assistant'; content: string }

// 盘面全量证据 → 系统提示词
export function buildMasterSystem(chart: BaziChart, ziwei: ZwChart | null): string {
  const pillars = chart.pillars.map((p) =>
    `${p.label}${p.gan}${p.zhi}（干${p.ganGod}，支藏${p.cangGan.map((c) => c.gan + c.god).join('/')}，纳音${p.naYin}）`,
  ).join('；')
  const dayun = chart.daYun.slice(0, 8).map((d) => `${d.startAge}岁起${d.ganZhi}(${d.god})`).join('、')
  const shensha = chart.shenSha.map((s) => `${s.where}${s.name}`).join('、') || '无'
  const trace = buildTrace(chart).map((t) => `【${t.title}】${t.result}`).join('\n')
  const zw = ziwei
    ? `紫微：${ziwei.fiveElementsClass}，命主${ziwei.soul}，身主${ziwei.body}，命宫在${ziwei.soulZhi}（主星${ziwei.palaces.find((p) => p.name.includes('命'))?.majorStars.map((s) => s.name + (s.mutagen ? '化' + s.mutagen : '')).join('、') || '无主星'}）`
    : '紫微盘未起'
  return [
    '你是「玄机阁」的命理大师，自称"老朽"，语气沉稳温和、有江湖气但不油滑。',
    '回答规则：',
    '1. 先用专业术语下断（十神/宫位/旺衰），紧跟一句大白话解释，让外行也能听懂；',
    '2. 每个结论都要引用命主盘上的具体证据（哪柱哪干透什么星、多少分），不许泛泛而谈；',
    '3. 给情绪价值：凶中指路、吉中提醒，结尾常带一句宽心或叮嘱的话；',
    '4. 盘上没有的信息不许编造；命主问盘外之事（如具体人名、彩票号码）要坦然说"此事天机不在盘中"；',
    '5. 单次回答控制在 120~220 字，命主追问再展开；不要用列表和标题，像说话一样成段。',
    '',
    '=== 命主盘面（你的一切判断只能基于此） ===',
    `${chart.gender}命，${chart.solarText}，农历${chart.lunarText}，属${chart.animal}`,
    chart.solarCorrection ? `真太阳时：${chart.solarCorrection.city} ${chart.solarCorrection.trueText}（校正${chart.solarCorrection.offsetMin}分）` : '未做真太阳时校正',
    `四柱：${pillars}`,
    `日主${chart.dayGan}${chart.dayGanWx}，旺衰${chart.strength.level}（${chart.strength.score}分），喜用${chart.favorable.join('、')}，忌${chart.unfavorable.join('、')}`,
    `五行计数：${JSON.stringify(chart.wuxingCount)}`,
    `大运：${chart.qiYunText}；${dayun}`,
    `神煞：${shensha}`,
    zw,
    '',
    '=== 排盘推理链（命主问"怎么算的"时据此口述，不列表格） ===',
    trace,
  ].join('\n')
}

// 调用大模型（OpenAI 兼容 / Anthropic 双格式），非流式，由前端打字机呈现
export async function askMaster(
  cfg: AiConfig, system: string, history: ChatTurn[], question: string, timeoutMs = 45000,
): Promise<string> {
  const base = cfg.baseUrl.replace(/\/+$/, '')
  const ctrl = new AbortController()
  const timer = setTimeout(() => ctrl.abort(), timeoutMs)
  try {
    if (/anthropic/i.test(base)) {
      const res = await fetch(`${base}/v1/messages`, {
        method: 'POST',
        signal: ctrl.signal,
        headers: {
          'content-type': 'application/json',
          'x-api-key': cfg.apiKey,
          'anthropic-version': '2023-06-01',
          'anthropic-dangerous-direct-browser-access': 'true',
        },
        body: JSON.stringify({
          model: cfg.model,
          max_tokens: 800,
          system,
          messages: [...history, { role: 'user', content: question }],
        }),
      })
      if (!res.ok) throw new Error(`HTTP ${res.status}`)
      const data = await res.json()
      const text = (data.content ?? []).map((b: { text?: string }) => b.text ?? '').join('')
      if (!text) throw new Error('空回复')
      return text
    }
    const res = await fetch(`${base}/chat/completions`, {
      method: 'POST',
      signal: ctrl.signal,
      headers: { 'content-type': 'application/json', authorization: `Bearer ${cfg.apiKey}` },
      body: JSON.stringify({
        model: cfg.model,
        messages: [{ role: 'system', content: system }, ...history, { role: 'user', content: question }],
        max_tokens: 800,
        temperature: 0.8,
      }),
    })
    if (!res.ok) throw new Error(`HTTP ${res.status}`)
    const data = await res.json()
    const text = data.choices?.[0]?.message?.content
    if (!text) throw new Error('空回复')
    return text as string
  } finally {
    clearTimeout(timer)
  }
}

// 连接自测：把浏览器层面的失败翻译成人话
export async function testAi(cfg: AiConfig): Promise<{ ok: boolean; msg: string }> {
  try {
    const t = await askMaster(cfg, '你是测试助手，收到消息回复"通"一个字。', [], '测试', 15000)
    return { ok: true, msg: `连接成功：${t.slice(0, 20)}` }
  } catch (e) {
    const raw = e instanceof Error ? e.message : String(e)
    if (e instanceof TypeError || /load failed|failed to fetch/i.test(raw)) {
      return {
        ok: false,
        msg: '连接失败：请求被浏览器拦下（Load failed）。多为该接口未开放网页跨域（CORS）——中转站只允许服务器/App 调用时，网页无法直连；也可能是地址打错或网络不通。可换支持网页调用的接口，或找服务商确认是否开 CORS。',
      }
    }
    if (/HTTP 401|HTTP 403/.test(raw)) return { ok: false, msg: `连接失败：${raw}（密钥无效或无权限）` }
    if (/HTTP 404/.test(raw)) return { ok: false, msg: `连接失败：${raw}（接口路径不对——确认地址是否需要 /v1 结尾，或该站是否提供 chat/completions）` }
    return { ok: false, msg: `连接失败：${raw}` }
  }
}
