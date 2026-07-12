// 古籍断语引文库：给规则断语与 AI 回答提供有出处的原文
export interface ClassicQuote { text: string; source: string }

// 按命局关键特征取引文
export const CLASSICS: Record<string, ClassicQuote> = {
  身强: { text: '强者抑之，其精自足。', source: '《滴天髓》' },
  偏强: { text: '旺则宜泄宜伤，凡事泄其有余。', source: '《穷通宝鉴》' },
  中和: { text: '中和为贵，偏枯为忌。', source: '《滴天髓》' },
  偏弱: { text: '衰则喜帮喜助，扶其不足。', source: '《渊海子平》' },
  身弱: { text: '弱者扶之，其气自周。', source: '《滴天髓》' },
  正官: { text: '官星者，禄位之枢机，名分之所系。', source: '《三命通会》' },
  七杀: { text: '杀不可制伏太过，有制谓之偏官，无制谓之七杀。', source: '《渊海子平》' },
  正印: { text: '印绶主聪明，多智慧，性慈惠。', source: '《三命通会》' },
  偏印: { text: '枭神当道，技艺偏才自成一家。', source: '《神峰通考》' },
  食神: { text: '食神有气胜财官，先要他强旺本干。', source: '《渊海子平》' },
  伤官: { text: '伤官伤尽最为奇，若有伤官祸便随。', source: '《三命通会》' },
  正财: { text: '财为养命之源，身强则能任其财。', source: '《渊海子平》' },
  偏财: { text: '偏财乃众人之财，惟忌比劫分夺。', source: '《三命通会》' },
  比肩: { text: '比肩同气连枝，助身亦分财。', source: '《神峰通考》' },
  劫财: { text: '劫财败财，最喜食伤化解。', source: '《子平真诠》' },
  羊刃: { text: '羊刃者，禀刚烈暴戾之性，有制则为大权。', source: '《三命通会》' },
  桃花: { text: '咸池非吉煞，日时最忌逢。', source: '《三命通会》' },
  驿马: { text: '马奔财乡，发如猛虎。', source: '《渊海子平》' },
  天乙贵人: { text: '天乙者，乃天上之神，所至之处一切凶煞隐然而避。', source: '《三命通会》' },
  子午冲: { text: '支冲则动，动则变生。', source: '《子平真诠》' },
  食神生财: { text: '食神生财，富贵自天排。', source: '《渊海子平》' },
  官印相生: { text: '官印相生，贵格也。', source: '《子平真诠》' },
  财多身弱: { text: '财多身弱，富屋贫人。', source: '《渊海子平》' },
}

export function quoteFor(key: string): ClassicQuote | null {
  return CLASSICS[key] ?? null
}
