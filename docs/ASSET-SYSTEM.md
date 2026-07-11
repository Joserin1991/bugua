# 玄机阁 · 数字资产系统设计

> 核心理念：**素材不是图片，是生成能力。**
> 每个视觉单元 = `Schema(数据结构) + Example(示例) + Component(渲染器) + Tokens(风格)`，
> 输入一份 JSON，输出 SVG/DOM；PNG 只保留给纯氛围插画。

---

## 一、分层架构

```
L0 Tokens     设计令牌：五行色/阴阳规则/字体/朱砂/吉凶量表     src/dassets/tokens.ts
L1 Atoms      原子：干支单字/朱砂印/吉凶点                    src/components/atoms.tsx
L2 Charts     图表：雷达/十神环/运程折线/五行条               src/components/InfoGraphics.tsx
L3 Engines    引擎：命盘圆盘/八字细盘/紫微十二宫/六爻卦        src/engine/* + 对应组件
L4 Scenes     场景：对话卡片/摇卦台/进度墨圈                  src/components/*Chat.tsx, ChatUI.tsx
L5 Templates  模板：命理报告/PDF 导出（规划中）
```

**规则：上层只能通过 JSON 配置调用下层；任何颜色/字体不得绕过 L0。**

---

## 二、数据流

```
出生信息 ──computeBazi──▶ BaziChart(JSON) ──┬─ baziToWheel ──▶ WheelConfig ─▶ <WheelEngine/>
                                            ├─ wuxingRadarData ─▶ RadarData ─▶ <Radar/>
                                            ├─ abilityRadarData ─▶ RadarData ─▶ <Radar/>
                                            ├─ (直接) ─▶ <ProTable/> <TenGodOrbit/> <DayunLineChart/>
                                            └─ interpretBazi ─▶ 文案 JSON ─▶ 对话气泡
出生信息 ──computeZiwei(iztro)──▶ ZwChart(JSON) ─▶ <ZiweiChart/>
问题/摇卦 ──buildResult──▶ CastResult(JSON) ─▶ <GuaCard/>
```

**适配器（adapter）是唯一允许出现领域知识的地方**；渲染器只认自己的 Config Schema。

---

## 三、命盘圆盘引擎（六环，JSON→SVG）

环序自内而外（`src/engine/wheel.ts` → `<WheelEngine/>`）：

| 环 | 内容 | 数据来源 |
|---|---|---|
| 中心 | 太极（不随盘转）+ 中宫文字 | `centerLabel` |
| ① 十二宫 | 命宫起逆布（命宫/财帛/兄弟/田宅/子女/奴仆/夫妻/疾厄/迁移/官禄/福德/相貌） | `chart.mingGong` |
| ② 十二长生 | 日干临十二支之长生沐浴冠带… | `changSheng(dayGan, zhi)` |
| ③ 十二地支 | 五行着色 + 四柱朱印（年月日时） | `chart.pillars` |
| ④ 天干 | 各支藏干本气 | `ZHI_CANGGAN` |
| ⑤ 流年 | 以当前流年为锚铺满 12 支（每支一年） | `activeLn.year` |
| ⑥ 大运 | 各支所落大运干支+起岁，当值高亮 | `chart.daYun` |

交互：`rotateToZhi` 指定支转至正上（红针固定），CSS transition 产生「命盘转动」；
高亮扇区、外圈禅意墨圈缓转均由引擎内置。

Schema：`src/dassets/schemas/wheel.schema.json`（含 example）。

---

## 四、组件清单（现状）

### 已实现 ✓

| 组件 | 输入 | 输出 | 文件 |
|---|---|---|---|
| `TOKENS` 设计令牌 | — | 色/字/规则常量 | dassets/tokens.ts |
| `GanZhiChar` | `{char,wuxing?,yinyang?,size?}` | 着色单字 | components/atoms.tsx |
| `SealTag` / `LuckDot` | 文字 / score | 朱砂印 / 吉凶点 | components/atoms.tsx |
| `WheelEngine` 六环命盘 | `WheelConfig` | SVG | components/WheelEngine.tsx |
| `baziToWheel` 适配器 | `BaziChart+LiuNian` | `WheelConfig` | engine/wheel.ts |
| `Radar` N维雷达 | `{data:[{label,value}],max}` | SVG | components/InfoGraphics.tsx |
| `TenGodOrbit` 十神环 | `BaziChart`+当值十神 | SVG | components/InfoGraphics.tsx |
| `DayunLineChart` 运程折线 | `BaziChart`+activeIdx | SVG（可点击） | components/InfoGraphics.tsx |
| `WuxingPctBars` 五行条 | `BaziChart` | DOM | components/InfoGraphics.tsx |
| `PillarCards` 四柱卡 | `BaziChart` | DOM | components/InfoGraphics.tsx |
| `ProTable` 专业细盘 | `BaziChart`+大运+流年 | DOM 表（9行×6列） | components/ChartSections.tsx |
| `ZiweiChart` 紫微十二宫 | `ZwChart` | DOM Grid | components/ZiweiChart.tsx |
| `GuaCard` 卦象卡 | `CastResult`+问题+类别 | 本卦/变卦/互卦 Tab + 徽章 | components/DivineChat.tsx |
| `TossCard` 摇卦台 | onDone 回调 | 步进+爻列表+铜钱动画 | components/DivineChat.tsx |
| `ProgressEnso` 进度墨圈 | `{label,pct}` | 动画 | components/ChatUI.tsx |
| `EnsoRing/EnsoAvatar/InkArt` | 尺寸/素材名 | SVG（素材自动替换） | components/ChatUI.tsx |
| `MasterMsg/UserMsg/Chips/CardMsg/InputBar` | 文本/回调 | 对话流 | components/ChatUI.tsx |
| 术语典 `Term`+`GlossaryProvider` | 术语 key | 弹窗详解（60+ 词条） | components/Master.tsx |

### 待建 ○（Roadmap）

| 组件 | 说明 | 优先级 |
|---|---|---|
| `ZiweiFlyLines` 四化飞星箭头 | 宫位间 SVG 连线/箭头，`{from,to,type:禄权科忌}` | ★★★ |
| `PalaceDetail` 宫位展开 | 点宫格→抽屉式详解（星曜逐一解读） | ★★★ |
| 流月/流日/流时 环 | WheelEngine 追加环 or 底部时间条 | ★★ |
| `XiaoYun` 小运 | ProTable 追加列 | ★ |
| `ReportTemplate` PDF 报告 | 报告模板（封面/命盘/分章解读/落款印章），react-pdf 或打印 CSS | ★★★ |
| `LottieRitual` 掐指/烟雾动画 | Lottie 替换 CSS 进度动画 | ★★ |
| 粒子/光效 Shader | 卦成瞬间的墨点飞溅（canvas） | ★ |

---

## 五、资产注册表规范

每个数字资产按下述结构注册（新资产照此补齐）：

```
src/dassets/
├── tokens.ts                # L0 全局令牌
└── schemas/
    ├── <asset>.schema.json  # 输入数据结构（JSON Schema）
    └── <asset>.example.json # 可直接渲染的示例数据
src/engine/<asset>.ts        # 适配器（领域对象 → Config）
src/components/<Asset>.tsx   # 渲染器（Config → SVG/DOM）
docs/ASSET-SYSTEM.md         # 本清单（登记处）
```

已注册 schema：`wheel` `ganzhi` `radar` `timeline` `ziwei` `bazi` `gua`。

**AI 工作流**：AI 只需产出符合 schema 的 JSON（或调用 compute* 函数），
即可获得命盘 UI、紫微盘、运程图、雷达图、卦象卡与分析文案；未来接 PDF 模板即可一键出报告。

---

## 六、静态润色素材（唯一允许 PNG 的部分）

静态素材只做**氛围**，不承载数据。全部自动检测加载、SVG 兜底，放入即生效。
完整生成 prompt（含尺寸/格式/命名）见 `ASSETS.md` 与《素材 Prompt 手册》。

| # | 素材 | 命名/路径 | 尺寸 | 格式 | 状态 |
|---|---|---|---|---|---|
| 1 | 首页主视觉 | `public/fx/hero-ink.png` | 900×1100 | PNG 透明 | ✅ |
| 2 | 大师头像 | `public/fx/master-avatar.png` | 512×512 | PNG 透明 | ⬜ |
| 3 | 感情插画 | `public/fx/art-love.png` | 800×520 | PNG 透明 | ✅ |
| 4 | 流年圆景 | `public/fx/art-liunian.png` | 600×600 | PNG 透明 | ⬜ |
| 5 | 铜钱正/反 | `public/fx/coin-front.png` `coin-back.png` | 512×512×2 | PNG 透明 | ⬜ |
| 6 | 事业山径插画 | `public/fx/art-career.png` | 800×520 | PNG 透明 | ⬜（组件位待接） |
| 7 | 追问桥景插画 | `public/fx/art-bridge.png` | 800×520 | PNG 透明 | ⬜（组件位待接） |
| 8 | 摇卦 Lottie | `public/fx/coin-toss.lottie` | 512×512 | Lottie | ⬜（规划） |
