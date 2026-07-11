# 待生成素材清单（AI 画图 / 视频）· 第二版

应用当前用内置 SVG/CSS 水墨动画兜底，**所有功能已可完整运行**。素材生成后放入对应路径即可自动生效（无需改代码，特别注明的除外），逐个替换、逐个提升质感。

**全局风格锁定（每条 prompt 末尾都建议带上）：**
> 纯黑白水墨，黑白灰单色无彩色，纯白背景，毛笔笔触带飞白与墨晕，留白构图，禅意仙气，无文字无水印无签名

- 白底冷白（#F6F6F3 附近）+ 墨黑（#171717）+ 灰阶墨韵；除朱砂红印章（#A8382B）外不得出现彩色
- 视频转 WebM：`ffmpeg -i in.mp4 -c:v libvpx-vp9 -crf 32 -b:v 0 -an out.webm`；带透明的 PNG 序列：`ffmpeg -framerate 30 -i frame_%04d.png -c:v libvpx-vp9 -pix_fmt yuva420p out.webm`

---

## 一、太极旋转视频（★★★ 最优先）

| 项目 | 要求 |
|---|---|
| 用途 | 「掐指推演」仪式动画第一幕 |
| 类型 | **视频**（需要墨晕流动感，静态图旋转做不出来） |
| 格式 | WebM（VP9），最好带 Alpha 透明通道；不支持透明就用**纯白背景**（代码用 multiply 混合融入白底） |
| 尺寸 | 1080 × 1080 |
| 时长/帧率 | 4–6 秒**无缝循环**（旋转整数圈），24–30 fps，≤5MB |
| 路径 | `public/fx/taiji-ink-spin.webm`（MP4 则改 `RitualOverlay.tsx` 顶部 `TAIJI_VIDEO_URL` 后缀） |

**Prompt（中）：** 纯黑白水墨太极图缓缓顺时针旋转，浓墨与留白对比强烈，墨色浓淡层次分明，边缘毛笔飞白与墨晕渗染，周围黑灰水墨烟雾缭绕流动，仙气飘飘禅意空灵，纯白背景，黑白灰单色无彩色，极简居中构图，无文字无印章，无缝循环动画

**Prompt（英）：** Pure black and white Chinese ink wash taiji yin-yang symbol slowly rotating clockwise, strong contrast of dense black ink and white negative space, tonal ink gradients with dry-brush flying-white edges and ink bleed halo, drifting grey ink mist and ethereal smoke around, zen, monochrome only no color, minimal centered composition, pure white background, no text no watermark, seamless loop animation

---

## 二、大师形象「玄机子」（★★★ 新增，问命对话的灵魂）

### 2a. 对话头像
| 项目 | 要求 |
|---|---|
| 用途 | 对话气泡旁的大师头像（替换现在的「玄」字圆印） |
| 类型 | **图片** |
| 格式 | PNG 透明背景 |
| 尺寸 | 512 × 512（圆形构图，四角留空） |
| 路径 | `public/fx/master-avatar.png`（放入后需在 `Master.tsx` 的 `MasterAvatar` 里切换为图片——生成后告诉我，我来接） |

**Prompt（中）：** 黑白水墨人物头像，一位仙风道骨的老者，长眉长须束发，面容慈祥睿智带一丝笑意，道袍高领，毛笔写意笔触，寥寥数笔神韵尽出，墨色浓淡有致，圆形构图适合做头像，纯白背景，黑白灰单色无彩色，无文字

### 2b. 开场立绘（可选加分项）
| 项目 | 要求 |
|---|---|
| 用途 | 进入「问命排盘」时的迎客画面装饰 |
| 格式 | PNG 透明背景 |
| 尺寸 | 900 × 1400（半身或全身立像） |
| 路径 | `public/fx/master-figure.png`（预留位，生成后我来接） |

**Prompt（中）：** 黑白水墨全身人物画，仙风道骨的老道长侧身而立，长须道袍宽袖，一手负后一手掐指推算，衣袂如墨云舒卷，脚下淡墨云雾，大量留白，写意笔法飞白苍劲，纯白背景渐隐为透明，黑白灰单色无彩色，无文字

---

## 三、烟雾消散转场视频（★★）

| 项目 | 要求 |
|---|---|
| 用途 | 仪式动画第二幕：太极散去、露出命盘 |
| 格式 | WebM（VP9 + **Alpha 透明通道必须**，要叠加在命盘上方） |
| 尺寸 | 1440 × 1440 |
| 时长 | 2.5–4 秒**单次播放**：满屏浓雾 → 完全散尽，≤4MB |
| 路径 | `public/fx/smoke-dissolve.webm`（预留位，当前 CSS 兜底） |

**Prompt（中）：** 黑灰色水墨烟雾从画面中心向四周缓缓消散退去露出透明背景，纯黑白水墨质感，烟雾如白纸上晕开又收拢的墨雾，浓淡相破柔和飘逸，仙气，单色无彩色，透明通道，从满屏浓雾到完全消散

---

## 四、水墨山水页面背景（★★）

| 项目 | 要求 |
|---|---|
| 用途 | 整站背景（替换 CSS 纸纹） |
| 格式 | JPG，质量 80，≤800KB |
| 尺寸 | 2560 × 1440，**中央大面积留白**（正文在此，保证可读） |
| 路径 | `public/bg/ink-landscape.jpg` + 取消 `src/index.css` body 里的注释（已标注） |

**Prompt（中）：** 纯黑白水墨山水，远山淡墨轻扫于画面顶部边缘，几只飞鸟，右下角一叶扁舟，大量留白，纯白底色，黑白灰单色无彩色，极简空灵禅意，中央区域完全空白，淡雅低对比度，适合网页背景

---

## 五、页脚远山剪影（★）

PNG 透明背景，1920 × 480，≤500KB → `public/bg/ink-mountains-footer.png`

**Prompt（中）：** 黑白水墨远山横幅，连绵山峦墨色由浓到淡，山间云雾留白，几株松树剪影，底部渐隐为透明，横长构图，黑白灰单色无彩色，透明背景

---

## 六、水墨铜钱正反面（★，六爻卜卦用）

PNG 透明背景，512 × 512 各一张 → `public/fx/coin-front.png`、`public/fx/coin-back.png`

**Prompt（中）：** 一枚古代铜钱的黑白水墨画，圆形方孔，毛笔勾勒轮廓带飞白，正面隐约可见「乾隆通宝」篆书四字（反面为光背无字），墨色浓淡晕染，黑白灰单色无彩色，透明背景，居中
