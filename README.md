# 玄机阁 · 卜卦问道

一个具有专业排盘能力与道教神秘美学的算命 Web 应用。

## 功能

### 八字排盘
- 输入公历生日、时辰、性别，精确排出**四柱干支**（基于 [lunar-javascript](https://github.com/6tail/lunar-javascript) 历法引擎，含节气换月体例）
- 十神、地支藏干、纳音、命宫、胎元
- 五行气数加权统计与日主强弱判定（得令/得地/得势三法综合打分）
- 喜用神/忌神推断（扶抑法）
- 神煞：天乙贵人、文昌、咸池桃花、驿马、羊刃、地支冲合
- **大运流年**：起运岁数、八步大运、逐年流年十神解读（含冲太岁、值太岁提示）
- 命理详解：格局总论、禀性气质、事业方向、财帛之道、姻缘情感、康健养生、趋吉之道

### 六爻卜卦
- 铜钱摇卦动画，六掷成卦（老阴老阳动爻体例）
- 完整六十四卦数据：卦辞原文 + 白话断语
- 本卦 / 变卦 / 互卦 推演与吉凶评级

### 答疑解惑
- 输入任意问题，以**梅花易数**应时起卦（问题 + 时间确定性起卦）
- 自动识别问题类别（事业/财运/感情/学业/健康/出行）
- 分节输出：卦象总断、就事论断、变卦走向、互卦中程、行动指引

## 视觉设计
玄青底色 + 鎏金点缀，星空闪烁、八卦轮缓转、太极推演动画，配楷体/篆味中文字体，营造「仙气 + 道韵」的神秘氛围。全部图形为 SVG/CSS 实现，无位图依赖。

## 开发

```bash
npm install
npm run dev      # 开发服务器
npm run build    # 生产构建
npm run preview  # 预览构建产物
```

## 部署到 Cloudflare 免费版

本项目分两部分部署：

- 前端应用：Cloudflare Pages，构建产物在 `dist`
- 轻后端：Cloudflare Workers，用于 AI 代理和云同步，配置在 `worker/`

### 前端：Cloudflare Pages

推荐连接 GitHub 自动部署：

1. 登录 Cloudflare Dashboard，进入 **Workers & Pages**。
2. 选择 **Create application** -> **Pages** -> **Connect to Git**。
3. 选择仓库 `Joserin1991/bugua`，分支选择 `main`。
4. 构建设置：
   - Framework preset: `Vite`
   - Build command: `npm run build`
   - Build output directory: `dist`
   - Root directory: 留空
5. 保存后 Cloudflare 会自动构建并发布；以后推送到 `main` 会自动重新部署。

也可以在本地直接上传：

```bash
npm run deploy:cloudflare
```

首次运行会要求登录 Cloudflare；发布目标项目名为 `bugua`。

### 轻后端：Cloudflare Workers

如果需要 AI 代理或云同步，再部署 Worker：

```bash
cd worker
npx wrangler@latest login
npx wrangler@latest kv namespace create SYNC_KV
```

把命令输出的 `id` 填进 `worker/wrangler.toml` 的 `kv_namespaces.id`，然后设置密钥并发布：

```bash
npx wrangler@latest secret put UPSTREAM_KEY
npx wrangler@latest secret put ACCESS_CODE
npx wrangler@latest deploy
```

部署完成后，在应用的「我的」页中填写 Worker 地址。详细说明见 `worker/README.md`。

## 技术栈
Vite + React 19 + TypeScript，排盘历法引擎 lunar-javascript。

> 卦象命理内容基于《渊海子平》《增删卜易》等传统术数体例的规则化生成，仅供娱乐参考。
