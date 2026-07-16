// 排盘引擎回归测试：基线值已与万年历/古法（五虎遁、阴阳顺逆、立春分界）人工核对
// 运行：npm test（tsx 直跑，无需测试框架）
import assert from 'node:assert/strict'
import { computeBazi } from '../src/lib/bazi'
import { liuYueOf, liuRiOf } from '../src/lib/liuyue'
import { buildResult, castByQuestion, tossOnce, type CastLine } from '../src/lib/hexagram'

let passed = 0
function test(name: string, fn: () => void) {
  try {
    fn()
    passed++
    console.log(`  ✓ ${name}`)
  } catch (e) {
    console.error(`  ✗ ${name}`)
    throw e
  }
}

console.log('四柱与大运')

test('1995-08-08 10:00 男：四柱、日主、大运逆排', () => {
  const c = computeBazi(1995, 8, 8, 10, 0, '男')
  assert.equal(c.pillars.map((p) => p.gan + p.zhi).join(' '), '乙亥 甲申 辛未 癸巳')
  assert.equal(c.dayGan, '辛')
  assert.ok(c.qiYunText.includes('阴年男命逆排'))
  assert.deepEqual(c.daYun.slice(0, 3).map((d) => d.ganZhi), ['癸未', '壬午', '辛巳'])
})

test('1991-01-15 04:30 女：立春前算上一年、阳年女命逆排', () => {
  const c = computeBazi(1991, 1, 15, 4, 30, '女')
  assert.equal(c.pillars.map((p) => p.gan + p.zhi).join(' '), '庚午 己丑 乙酉 戊寅')
  assert.equal(c.animal, '马')
  assert.ok(c.qiYunText.includes('阳年女命逆排'))
  assert.deepEqual(c.daYun.slice(0, 2).map((d) => d.ganZhi), ['戊子', '丁亥'])
})

test('立春分界：2024-02-03 属癸卯，2024-02-05 属甲辰', () => {
  assert.equal(computeBazi(2024, 2, 3, 12, 0, '男').pillars[0].gan + computeBazi(2024, 2, 3, 12, 0, '男').pillars[0].zhi, '癸卯')
  assert.equal(computeBazi(2024, 2, 5, 12, 0, '男').pillars[0].gan + computeBazi(2024, 2, 5, 12, 0, '男').pillars[0].zhi, '甲辰')
})

console.log('真太阳时')

test('乌鲁木齐（东经87.62）校正 -130 分，巳时归辰时', () => {
  const c = computeBazi(2000, 6, 1, 10, 30, '女', { name: '乌鲁木齐', lng: 87.62 })
  assert.equal(c.solarCorrection?.offsetMin, -130)
  assert.equal(c.solarCorrection?.trueText, '08:20')
  assert.equal(c.pillars[3].zhi, '辰')
})

console.log('神煞')

test('1990-06-01 12:00 男：天乙/天德/月德/禄神/将星等落柱', () => {
  const c = computeBazi(1990, 6, 1, 12, 0, '男')
  const s = c.shenSha.map((x) => x.where + x.name)
  for (const want of ['日柱天乙贵人', '月柱天德贵人', '年柱月德贵人', '年柱禄神', '日柱文昌贵人', '日柱红鸾']) {
    assert.ok(s.includes(want), `缺 ${want}，实际：${s.join('、')}`)
  }
})

console.log('流月流日')

test('2024 甲辰年五虎遁：正月丙寅、腊月丁丑', () => {
  const ly = liuYueOf(2024, '甲', '甲')
  assert.equal(ly.length, 12)
  assert.equal(ly[0].ganZhi, '丙寅')
  assert.equal(ly[11].ganZhi, '丁丑')
})

test('流日：每月逐日干支连续（六十甲子相邻）', () => {
  const ly = liuYueOf(2024, '甲', '甲')
  const days = liuRiOf(ly[3], '甲')
  assert.ok(days.length >= 28)
  const GAN = '甲乙丙丁戊己庚辛壬癸'
  for (let i = 1; i < days.length; i++) {
    const a = GAN.indexOf(days[i - 1].ganZhi[0])
    const b = GAN.indexOf(days[i].ganZhi[0])
    assert.equal((a + 1) % 10, b, `${days[i - 1].ganZhi} → ${days[i].ganZhi} 不连续`)
  }
})

console.log('卦象引擎')

const quiet = (): CastLine => ({ value: 7, yang: true, changing: false, coins: [true, true, false] })

test('六爻：全少阳得乾为天，六爻安静无变卦', () => {
  const r = buildResult(Array.from({ length: 6 }, quiet))
  assert.ok(r.original.fullName.includes('乾'))
  assert.equal(r.changed, null)
  assert.equal(r.changingIndexes.length, 0)
})

test('六爻：初爻老阳动则有变卦（乾之姤），动爻记为初爻', () => {
  const first: CastLine = { value: 9, yang: true, changing: true, coins: [true, true, true] }
  const r = buildResult([first, ...Array.from({ length: 5 }, quiet)])
  assert.ok(r.changed, '应有变卦')
  assert.ok(r.changed!.fullName.includes('姤'), `变卦应为姤，实际 ${r.changed!.fullName}`)
  assert.deepEqual(r.changingIndexes, [0])
})

test('梅花易数：同问同时刻起卦结果确定（可复现）', () => {
  const t = new Date(2024, 5, 1, 10, 30, 0)
  const a = castByQuestion('今年适合跳槽吗', t)
  const b = castByQuestion('今年适合跳槽吗', t)
  assert.equal(a.original.fullName, b.original.fullName)
  assert.equal(a.changed?.fullName, b.changed?.fullName)
})

test('一事不二占：同一天同问、不同时刻/措辞小异 → 同一卦', () => {
  const morning = new Date(2024, 5, 1, 9, 5, 0)
  const evening = new Date(2024, 5, 1, 22, 40, 0) // 同日不同时刻
  const a = castByQuestion('今年适合跳槽吗', morning)
  const b = castByQuestion('今年适合跳槽吗？', evening) // 加了问号
  const c = castByQuestion('今年适合跳槽吗 ', evening) // 加了空格
  assert.equal(a.original.fullName, b.original.fullName, '同日同问不同时刻应同卦')
  assert.equal(a.original.fullName, c.original.fullName, '措辞标点小异应同卦')
  assert.equal(a.changed?.fullName, b.changed?.fullName)
})

test('梅花易数：跨日同问 → 卦可不同（时移事异）', () => {
  const d1 = new Date(2024, 5, 1, 10, 0, 0)
  const d2 = new Date(2024, 8, 15, 10, 0, 0)
  const a = castByQuestion('这段感情能长久吗', d1)
  const b = castByQuestion('这段感情能长久吗', d2)
  // 只要求引擎按日区分（可能相同也可能不同，此处两日恰不同）
  assert.ok(a.original.fullName !== b.original.fullName || a.changed?.fullName !== b.changed?.fullName)
})

test('摇卦 tossOnce 只产生 6/7/8/9，阴阳动静一致', () => {
  for (let i = 0; i < 200; i++) {
    const l = tossOnce()
    assert.ok([6, 7, 8, 9].includes(l.value))
    assert.equal(l.yang, l.value === 7 || l.value === 9)
    assert.equal(l.changing, l.value === 6 || l.value === 9)
  }
})

console.log(`\n全部通过：${passed} 项`)
