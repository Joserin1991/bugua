// 大师 AI 问答：把命盘全量证据交给大模型，回答专业+可懂+有情绪价值
// 零配置：默认直连自建 Worker 代理（上游密钥在 Worker Secret，前端无密钥可泄）
import { liuNianRange, type BaziChart } from './bazi'
import type { ZwChart } from './ziwei'
import { buildTrace } from './trace'
import { SYNC_URL, scheduleBackup } from './sync'

export interface AiConfig {
  baseUrl: string // 如 https://api.openai.com/v1 或 https://api.anthropic.com
  apiKey: string
  model: string
}

const LS_KEY = 'xjg-ai-config'

// 内置默认：走 Worker 代理，模型由 Worker 锁定；apiKey 仅作占位（来源白名单放行）
export const DEFAULT_AI: AiConfig = { baseUrl: `${SYNC_URL}/v1`, apiKey: 'xjg-web', model: 'claude-sonnet-5' }

export function loadAiConfig(): AiConfig {
  try {
    const raw = localStorage.getItem(LS_KEY)
    if (!raw) return DEFAULT_AI
    const c = JSON.parse(raw) as AiConfig
    return c.baseUrl && c.apiKey && c.model ? c : DEFAULT_AI
  } catch { return DEFAULT_AI }
}

export function saveAiConfig(c: AiConfig | null) {
  if (!c) localStorage.removeItem(LS_KEY)
  else localStorage.setItem(LS_KEY, JSON.stringify(c))
  scheduleBackup()
}

export interface ChatTurn { role: 'user' | 'assistant'; content: string }

// 盘面全量证据 → 系统提示词
export function buildMasterSystem(chart: BaziChart, ziwei: ZwChart | null, memories: string[] = [], returning = false): string {
  const pillars = chart.pillars.map((p) =>
    `${p.label}${p.gan}${p.zhi}（干${p.ganGod}，支藏${p.cangGan.map((c) => c.gan + c.god).join('/')}，纳音${p.naYin}）`,
  ).join('；')
  const dayun = chart.daYun.slice(0, 8).map((d) => `${d.startAge}岁起${d.ganZhi}(${d.god})`).join('、')
  const nowYear = new Date().getFullYear()
  const liunian = liuNianRange(nowYear - 1, 6, chart.dayGan).map((l) => `${l.year}${l.ganZhi}(${l.god}${l.year === nowYear ? '·今年' : ''})`).join('、')
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
    '6. 每次回答的最后必须另起一行写「建议：问A｜问B｜问C」——站在命主角度最可能追问的三个短问题（各不超过12字，要贴着当前对话走，不许重复已答内容，不许总是那几个）。',
    '7. 若某张盘面卡有助于当前话题，可在建议行之前单独一行写「卡片：五行分析」，可选值仅限：三盘合参、五行分析、十神关系、大运走势、流年运势、事业运势、财运走势、感情运势、健康提点、神煞照命、专业细盘、紫微星盘、命理总断。不需要就不写，同一张卡不要反复调。',
    '8. 界面将展示盘面卡时（系统指令会告知），另起一行写「卡注：一句话」——不超过26字的朱批，点破这张卡对命主最要紧的一处，会印在卡片下方。',
    '9. 当命主透露值得长期记住的个人情况（职业、婚恋状态、重大变故或打算），另起一行写「记档：一句话概括」，会存入他的档案；日常寒暄不记。',
    '10. 下断语时可引用古籍名句佐证并注明出处（如《滴天髓》《三命通会》《渊海子平》《子平真诠》《穷通宝鉴》），格式「古云\u300c……\u300d（《书名》）」；只引确有其文的句子，记不准原文就不引，绝不杜撰。',
    '',
    '=== 命主盘面（你的一切判断只能基于此） ===',
    `${chart.gender}命，${chart.solarText}，农历${chart.lunarText}，属${chart.animal}`,
    chart.solarCorrection ? `真太阳时：${chart.solarCorrection.city} ${chart.solarCorrection.trueText}（校正${chart.solarCorrection.offsetMin}分）` : '未做真太阳时校正',
    `四柱：${pillars}`,
    `日主${chart.dayGan}${chart.dayGanWx}，旺衰${chart.strength.level}（${chart.strength.score}分），喜用${chart.favorable.join('、')}，忌${chart.unfavorable.join('、')}`,
    `五行计数：${JSON.stringify(chart.wuxingCount)}`,
    `大运：${chart.qiYunText}；${dayun}`,
    `流年：${liunian}`,
    `神煞：${shensha}`,
    zw,
    '',
    ...(memories.length || returning
      ? [
        '=== 命主档案（老朽此前的记录，相关时自然引用，勿逐条背诵） ===',
        returning ? '这位命主是回头客，开场宜自然接上旧话。' : '',
        ...memories.map((m) => `· ${m}`),
        '',
      ]
      : []),
    '=== 排盘推理链（命主问"怎么算的"时据此口述，不列表格） ===',
    trace,
  ].join('\n')
}

// 调用大模型（OpenAI 兼容 / Anthropic 双格式），非流式，由前端打字机呈现
export async function askMaster(
  cfg: AiConfig, system: string, history: ChatTurn[], question: string, timeoutMs = 90000,
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

// 卦象问答系统提示词（六爻/梅花共用）
export interface GuaInfo {
  originalName: string; originalCi: string; originalBrief: string; originalOverall: string
  changedName?: string; changedOverall?: string
  mutualName: string; mutualBrief: string
  movingYao: string
  method: '六爻摇卦' | '梅花易数'
}

export function buildGuaSystem(g: GuaInfo, question: string, category: string): string {
  return [
    '你是「玄机阁」的解卦大师，自称"老朽"，语气沉稳温和、有江湖气但不油滑。',
    '回答规则：',
    '1. 先据卦下断（本卦定基调、动爻看变化、变卦看走向、互卦看中程），紧跟白话解释；',
    '2. 结论必须引卦为据（哪一爻动、卦辞哪一句），不许脱离卦象空谈；',
    '3. 给情绪价值：凶中指路、吉中提醒，结尾一句宽心或叮嘱；',
    '4. 卦上没有的信息不许编造；单次回答 120~200 字，像说话一样成段；',
    '5. 可引古籍（《周易》原文、《增删卜易》《梅花易数》）须注明出处，不确定不引；',
    '6. 每次回答最后另起一行写「建议：问A｜问B｜问C」——命主最可能的三个追问（各≤12字，贴着卦和他的问题走）。',
    '',
    '=== 本次卦象（一切判断只能基于此） ===',
    `起卦方式：${g.method}`,
    `所问：「${question}」（${category}）`,
    `本卦：${g.originalName}——卦辞「${g.originalCi}」；${g.originalBrief}。${g.originalOverall}`,
    g.changedName ? `动爻：${g.movingYao}；变卦：${g.changedName}——${g.changedOverall ?? ''}` : '六爻安静，无变卦，以本卦断之',
    `互卦：${g.mutualName}（观中程）——${g.mutualBrief}`,
  ].join('\n')
}

// 轻量协议解析：正文 + 「建议」行（卦象场景用）
export function parseSuggestReply(raw: string): { body: string; suggests: string[] } {
  let body = raw.trim()
  const suggests: string[] = []
  const m = body.match(/^建议[：:]\s*(.+)$/m)
  if (m) {
    suggests.push(...m[1].split(/[|｜、；;]/).map((x) => x.trim()).filter(Boolean).slice(0, 4))
    body = body.replace(m[0], '').trim()
  }
  return { body, suggests }
}

// 失败原因翻译成人话
export function explainAiError(e: unknown): string {
  const raw = e instanceof Error ? e.message : String(e)
  if (e instanceof TypeError || /load failed|failed to fetch/i.test(raw)) return '请求被浏览器拦下——接口未开放网页跨域(CORS)或网络不通'
  if (/abort/i.test(raw)) return '等待超时（90秒无响应）'
  if (/HTTP 401|HTTP 403/.test(raw)) return `${raw}（密钥无效或无权限）`
  if (/HTTP 404/.test(raw)) return `${raw}（接口路径或模型名不对）`
  if (/HTTP 429/.test(raw)) return `${raw}（请求过频或额度用尽）`
  return raw
}

// 失败自动重试一次（多等一会儿也要 AI）
export async function askMasterRetry(
  cfg: AiConfig, system: string, history: ChatTurn[], question: string,
): Promise<string> {
  try {
    return await askMaster(cfg, system, history, question)
  } catch {
    await new Promise((r) => setTimeout(r, 1500))
    return await askMaster(cfg, system, history, question)
  }
}

// 拉取中转站可用模型列表（OpenAI 兼容 GET /models）
export async function listModels(baseUrl: string, apiKey: string): Promise<string[]> {
  const base = baseUrl.replace(/\/+$/, '')
  const res = await fetch(`${base}/models`, { headers: { authorization: `Bearer ${apiKey}` } })
  if (!res.ok) throw new Error(`HTTP ${res.status}`)
  const d = await res.json()
  const ids = (d.data ?? d.models ?? []).map((m: { id?: string; name?: string }) => m.id ?? m.name ?? '').filter(Boolean)
  if (!ids.length) throw new Error('返回为空')
  return ids as string[]
}

// 连接自测：把浏览器层面的失败翻译成人话
export async function testAi(cfg: AiConfig): Promise<{ ok: boolean; msg: string }> {
  try {
    const t = await askMaster(cfg, '你是测试助手，收到消息回复"通"一个字。', [], '测试', 15000)
    return { ok: true, msg: `连接成功：${t.slice(0, 20)}` }
  } catch (e) {
    return { ok: false, msg: `连接失败：${explainAiError(e)}` }
  }
}
