// 命理解读引擎：基于五行、十神、卦象的规则化文本生成
import type { BaziChart, LiuNian } from './bazi'
import { WUXING_TRAITS, tenGodGroup, ZHI_CHONG, ZHI_HE, type WuXing } from './wuxing'
import type { CastResult } from './hexagram'
import { LUCK_LABEL } from './hexagram'

// 十天干日主性情
const DAYGAN_NATURE: Record<string, string> = {
  甲: '甲木为参天大树，性直而仁厚，有担当、重信义，志向高远；唯有时过于固执，不肯轻易低头。',
  乙: '乙木如藤萝花草，柔韧灵活，善于借势而上，心思细腻、体贴周到；唯遇事偶有依赖，宜多立主见。',
  丙: '丙火如太阳普照，热情坦荡，光明磊落，感染力极强，天生带领气场；唯性急易燥，须防虎头蛇尾。',
  丁: '丁火似烛灯之光，外柔内热，思虑深远，洞察人心，於细微处见真章；唯多思易虑，宜宽心自养。',
  戊: '戊土如高山厚岭，稳重踏实，言出必行，是众人依靠的中流砥柱；唯略欠变通，防错失良机。',
  己: '己土似田园沃土，包容滋养，谦和低调，善于成就他人；唯心思绵密，易将烦忧藏于心底。',
  庚: '庚金如刀剑钢铁，刚毅果决，讲义气、重原则，执行力过人；唯锋芒太露，宜学圆融以护身。',
  辛: '辛金似珠玉首饰，聪慧精致，品味不凡，善于精雕细琢；唯自尊心强，闻过则易介怀。',
  壬: '壬水如江河奔流，才思泉涌，胸怀开阔，适应力与开拓力兼备；唯心性好动，宜防漂泊不定。',
  癸: '癸水似雨露甘霖，聪颖内敛，直觉敏锐，润物无声而滋养八方；唯多愁善感，宜养浩然之气。',
}

const GOD_CAREER: Record<string, string> = {
  比劫: '比肩劫财透出，自立心强，适合自主创业、合伙经营或竞争性行业，但须防朋友分财、合伙纠纷',
  食伤: '食伤吐秀，才华外露，利于技艺、文创、演说、研发等以才谋生之路，名气可带财',
  财: '财星得用，善于经营理财，商贾贸易、金融实业皆宜，务实肯干则财源广进',
  官杀: '官杀有力，具备管理与担当之才，适合仕途、管理、法务、军警等讲求秩序权威的领域',
  印: '印星护身，学术运佳，适合文教、医疗、研究、宗教哲学等积累型行业，声誉重于浮利',
}

const WX_CAREER: Record<WuXing, string> = {
  木: '文教出版、医药健康、园林农林、服装纺织',
  火: '能源电力、互联网科技、传媒广告、餐饮娱乐',
  土: '房产建筑、农业矿产、仓储物流、中介咨询',
  金: '金融证券、机械五金、汽车交通、司法军警',
  水: '贸易物流、水产旅游、传播咨询、酒水饮品',
}

const WX_COLOR_ADVICE: Record<WuXing, string> = {
  木: '青绿色系', 火: '红紫色系', 土: '黄褐色系', 金: '白色金属色系', 水: '黑蓝色系',
}

const WX_DIRECTION: Record<WuXing, string> = {
  木: '东方', 火: '南方', 土: '本地及中部', 金: '西方', 水: '北方',
}

export interface BaziReading {
  geju: string
  personality: string
  career: string
  wealth: string
  love: string
  health: string
  advice: string
}

export function interpretBazi(chart: BaziChart): BaziReading {
  const { dayGan, dayGanWx, strength, favorable, unfavorable, wuxingCount, pillars, gender } = chart

  // 格局综述
  const monthGod = pillars[1].cangGan[0].god
  const geju = [
    `此造日元${dayGan}${dayGanWx}，生于${pillars[1].zhi}月，月令本气透${monthGod}，${strength.detail}。`,
    `综合得令、得地、得势三者，日主判为「${strength.level}」（强度${strength.score}分）。`,
    strength.level === '中和'
      ? '五行流转贵在中和，此为难得之象，一生运势平稳，关键在把握大运节奏。'
      : `扶抑之法，取${favorable.join('、')}为喜用之神，忌${unfavorable.join('、')}再来${strength.level.includes('强') ? '助身' : '克泄'}。`,
    `喜用所在，即人生趋吉之方向。`,
  ].join('')

  // 性格
  const maxWx = (Object.keys(wuxingCount) as WuXing[]).reduce((a, b) => (wuxingCount[a] >= wuxingCount[b] ? a : b))
  const minWx = (Object.keys(wuxingCount) as WuXing[]).reduce((a, b) => (wuxingCount[a] <= wuxingCount[b] ? a : b))
  const personality = [
    DAYGAN_NATURE[dayGan],
    `命局中${maxWx}气最盛，秉${WUXING_TRAITS[maxWx].nature}之性，主「${WUXING_TRAITS[maxWx].virtue}」德；`,
    wuxingCount[minWx] <= 0.5
      ? `而${minWx}气近乎不见，${WUXING_TRAITS[minWx].virtue}道稍欠，宜后天着意涵养。`
      : `${minWx}气偏弱，可借${WX_COLOR_ADVICE[minWx]}与${WX_DIRECTION[minWx]}之气补益。`,
  ].join('')

  // 事业：看透干十神
  const gods = pillars.filter((p) => p.label !== '日柱').map((p) => tenGodGroup(p.ganGod))
  const uniqueGroups = [...new Set(gods)]
  const careerParts = uniqueGroups.map((g) => GOD_CAREER[g])
  const favCareer = favorable.map((w) => WX_CAREER[w]).join('；')
  const career = [
    `天干透出${uniqueGroups.join('、')}，`,
    careerParts.join('。') + '。',
    `以喜用五行论，最利行业为：${favCareer}。`,
    `发展方位以${favorable.map((w) => WX_DIRECTION[w]).join('、')}为佳。`,
  ].join('')

  // 财运
  const hasWealth = pillars.some((p) => p.ganGod.includes('财')) || pillars.some((p) => p.cangGan.some((c) => c.god.includes('财')))
  const wealth = hasWealth
    ? (strength.level.includes('强')
      ? '财星入命而身强足以任财，属「身强担财」之格，敢博敢挣，正财偏财皆可图之；中年后财运尤旺，投资置业眼光独到。'
      : '财星入命而身偏弱，财多身弱则求财劳心，宜稳扎稳打、细水长流，忌重杠杆豪赌；先强己身（印比运）再图大财。')
    : '财星不显于天干，求财宜走专业技能路线，以才生财、以名带利；财藏于支者，往往是闷声聚财之相。'

  // 感情
  const spouseZhi = pillars[2].zhi
  const spouseGods = pillars[2].cangGan.map((c) => c.god)
  const chongSpouse = pillars.some((p) => p.label !== '日柱' && ZHI_CHONG[p.zhi] === spouseZhi)
  const heSpouse = pillars.some((p) => p.label !== '日柱' && ZHI_HE[p.zhi] === spouseZhi)
  const love = [
    `日支${spouseZhi}为夫妻宫，宫中藏${spouseGods.join('、')}。`,
    gender === '男'
      ? '男命以财星为妻缘之星，'
      : '女命以官星为夫缘之星，',
    heSpouse ? '夫妻宫得六合，姻缘和顺，伴侣多为贴心助力之人；' : '',
    chongSpouse ? '唯夫妻宫逢冲，感情路上须多沟通包容，晚婚或聚少离多反主安稳；' : '',
    !heSpouse && !chongSpouse ? '夫妻宫安稳无刑冲，婚姻基础牢固；' : '',
    `择偶以五行属${favorable[0]}${favorable[1] ? '、' + favorable[1] : ''}之人（生肖方位可参）最能旺己。`,
  ].join('')

  // 健康
  const weakOrgan = WUXING_TRAITS[minWx].organ
  const strongOrgan = WUXING_TRAITS[maxWx].organ
  const health = [
    `五行以${minWx}最弱，${minWx}主${weakOrgan}，日常宜多加保养；`,
    wuxingCount[maxWx] >= 3.5 ? `${maxWx}气过旺亦恐${strongOrgan}负担过重，凡事过犹不及。` : '',
    `作息上宜取${WUXING_TRAITS[minWx].season}季之气调补，`,
    `衣饰家居可多用${WX_COLOR_ADVICE[minWx]}以平衡气场。`,
  ].join('')

  // 开运建议
  const advice = [
    `喜用神为${favorable.join('、')}：`,
    `方位宜往${favorable.map((w) => WX_DIRECTION[w]).join('、')}发展；`,
    `颜色宜取${favorable.map((w) => WX_COLOR_ADVICE[w]).join('、')}；`,
    `行业宜近${favorable.map((w) => WX_CAREER[w].split('、')[0]).join('、')}等属性领域。`,
    chart.shenSha.some((s) => s.name === '天乙贵人') ? '命带天乙贵人，危难之际常有人扶，宜广结善缘以应贵气。' : '',
    chart.shenSha.some((s) => s.name === '驿马星') ? '命带驿马，动中求财，外出发展、多走动反而运旺。' : '',
    chart.shenSha.some((s) => s.name === '文昌贵人') ? '文昌入命，进修考试皆有加持，终身学习是最好的开运法。' : '',
  ].join('')

  return { geju, personality, career, wealth, love, health, advice }
}

// 流年解读
const LIUNIAN_GOD_TEXT: Record<string, { theme: string; text: string }> = {
  比肩: { theme: '同气之年 · 人际竞合', text: '流年比肩助身，朋友同侪往来频密，合作与竞争并存。身弱者得帮扶而如虎添翼；身强者防分财争利，合伙账目宜分明。' },
  劫财: { theme: '劫财之年 · 谨守财库', text: '劫财透岁，人情开销大，易有借贷担保之扰。理财宜保守，防破财于亲友；反之竞争场合冲劲十足，攻坚夺标有利。' },
  食神: { theme: '食神之年 · 才华福泽', text: '食神主福禄，此年才思顺畅、口福人缘皆佳，利创作表达、进修生育。身心放松反而机会自来，是滋养积累的一年。' },
  伤官: { theme: '伤官之年 · 锋芒外露', text: '伤官吐秀，灵感爆发、表现欲强，利名声技艺；但言多必失，易与上级权威起摩擦，谨言慎行、以才服人为上。' },
  偏财: { theme: '偏财之年 · 机遇流转', text: '偏财临岁，意外之财与流动机会增多，商贸投资嗅觉灵敏；唯财来得快去得亦快，见好就收，勿贪必得。' },
  正财: { theme: '正财之年 · 勤耕有获', text: '正财主稳定收益，此年正职收入、置业积蓄皆有进益；男命亦主姻缘桃花。踏实经营，付出与回报成正比。' },
  七杀: { theme: '七杀之年 · 压力砺刃', text: '七杀攻身，工作压力与挑战陡增，竞争激烈；能扛者借势上位、掌权立威，不敌者宜以印化杀——多学习、靠长辈贵人化解。' },
  正官: { theme: '正官之年 · 名位之机', text: '正官临岁，主晋升、考试、名分之喜，行事宜正、名正则言顺；女命亦主婚缘。守规矩、走正道，官星自然护身。' },
  偏印: { theme: '偏印之年 · 沉潜蓄智', text: '偏印主玄学巧思，此年宜深研专业、修习冷门绝学；唯情绪易孤郁，防思虑过度，多晒太阳多走动。' },
  正印: { theme: '正印之年 · 贵人庇荫', text: '正印护身，长辈贵人运旺，利学业文书、置业安家；名誉信用上升之年，宜借势夯实根基，忌懒散依赖。' },
}

export function interpretLiuNian(ln: LiuNian, chart: BaziChart): { theme: string; text: string; extra: string } {
  const base = LIUNIAN_GOD_TEXT[ln.god]
  const extras: string[] = []
  const dayZhi = chart.pillars[2].zhi
  const yearZhi = chart.pillars[0].zhi
  if (ZHI_CHONG[ln.zhi] === dayZhi) extras.push(`流年${ln.zhi}冲日支夫妻宫，环境情感多变动，宜以静制动`)
  if (ZHI_CHONG[ln.zhi] === yearZhi) extras.push(`流年冲太岁本命（${yearZhi}），谓之「反吟」，防冲撞长上、远行意外，宜低调化解`)
  if (ln.zhi === yearZhi) extras.push(`流年值太岁，本命年气场动荡，古法宜穿红辟邪、行善积福`)
  if (ZHI_HE[ln.zhi] === dayZhi) extras.push(`流年与日支六合，人缘姻缘俱旺，宜把握合作与情感良机`)
  const wxOfYear = ln.god
  void wxOfYear
  if (chart.favorable.length && base) {
    // 流年天干五行是否为喜用
    const ganWx = { 甲: '木', 乙: '木', 丙: '火', 丁: '火', 戊: '土', 己: '土', 庚: '金', 辛: '金', 壬: '水', 癸: '水' }[ln.ganZhi[0]] as WuXing
    if (chart.favorable.includes(ganWx)) extras.push(`岁干${ln.ganZhi[0]}${ganWx}正是命中喜用，吉上加吉，宜主动进取`)
    else if (chart.unfavorable.includes(ganWx)) extras.push(`岁干${ganWx}为命中忌神，运势打折扣，凡事留三分余地`)
  }
  return { theme: `${ln.ganZhi}年 · ${base.theme}`, text: base.text, extra: extras.join('；') }
}

// 问卦答疑
export type OracleCategory = '综合运势' | '事业官运' | '财运求财' | '感情姻缘' | '学业考试' | '健康平安' | '出行迁移'

export const ORACLE_CATEGORIES: OracleCategory[] = ['综合运势', '事业官运', '财运求财', '感情姻缘', '学业考试', '健康平安', '出行迁移']

export function detectCategory(question: string): OracleCategory {
  const rules: [OracleCategory, RegExp][] = [
    ['感情姻缘', /(感情|恋爱|喜欢|爱|婚|对象|男友|女友|分手|复合|桃花|脱单|相亲)/],
    ['事业官运', /(工作|事业|升职|跳槽|职|老板|创业|项目|面试|offer|晋升|辞)/i],
    ['财运求财', /(财|钱|投资|股|基金|收入|生意|买卖|债|欠|房价)/],
    ['学业考试', /(考|学业|学习|读书|升学|论文|证书|留学|成绩)/],
    ['健康平安', /(健康|病|身体|手术|平安|安全|医院)/],
    ['出行迁移', /(出行|旅行|搬家|出差|出国|移民|迁|远行|回家)/],
  ]
  for (const [cat, re] of rules) if (re.test(question)) return cat
  return '综合运势'
}

const CATEGORY_FIELD: Record<OracleCategory, 'overall' | 'career' | 'love'> = {
  综合运势: 'overall',
  事业官运: 'career',
  财运求财: 'career',
  感情姻缘: 'love',
  学业考试: 'career',
  健康平安: 'overall',
  出行迁移: 'overall',
}

export interface OracleReading {
  luckLabel: string
  sections: { title: string; text: string }[]
}

export function interpretOracle(cast: CastResult, question: string, category: OracleCategory): OracleReading {
  const { original, changed, mutual, changingIndexes } = cast
  const field = CATEGORY_FIELD[category]
  const sections: { title: string; text: string }[] = []

  sections.push({
    title: '卦象总断',
    text: `所问「${question.trim() || category}」，得${original.fullName}卦${changed ? `，变${changed.fullName}卦` : '，六爻安静'}。${original.name}者，${original.brief}。${original.overall}`,
  })

  sections.push({
    title: '就事论断',
    text: original[field],
  })

  if (changed) {
    sections.push({
      title: '变卦所示（事之走向）',
      text: `${YAO_POS_TEXT(changingIndexes)}发动，事态由「${original.brief}」转向「${changed.brief}」。${changed.name}卦告诫：${changed.advice}后势吉凶，以变卦为重。`,
    })
  } else {
    sections.push({
      title: '静卦所示',
      text: '六爻安静，无爻发动，说明局面短期内不会有大的变化，宜以本卦卦辞为凭，安心依计而行。',
    })
  }

  sections.push({
    title: '互卦观其中程',
    text: `互卦得${mutual.fullName}，主事情中间过程：${mutual.brief}。${mutual.overall.split('。')[0]}。中程若见此象，不必惊疑，是必经之路。`,
  })

  sections.push({
    title: '行动指引',
    text: `${original.advice}${changed && changed.luck < original.luck ? '此卦由吉趋谨，前松后紧，务必善始善终。' : ''}${changed && changed.luck > original.luck ? '此卦由难转顺，先难后易，坚持便是胜利。' : ''}`,
  })

  return {
    luckLabel: LUCK_LABEL[changed ? Math.round((original.luck + changed.luck) / 2) : original.luck],
    sections,
  }
}

function YAO_POS_TEXT(idx: number[]): string {
  const names = ['初爻', '二爻', '三爻', '四爻', '五爻', '上爻']
  return idx.map((i) => names[i]).join('、')
}
