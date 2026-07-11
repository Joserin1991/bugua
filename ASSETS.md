# 待生成素材清单（AI 画图 / 视频）

应用当前用内置 SVG/CSS 水墨动画兜底，**所有功能已可完整运行**。以下素材生成后放入对应路径即可自动生效（无需改代码），逐个替换、逐个提升质感。

---

## 一、太极旋转视频（最优先 ★★★）

| 项目 | 要求 |
|---|---|
| 用途 | 排盘仪式动画第一幕：水墨太极旋转 |
| 类型 | **视频**（需要动态的墨晕流动感，图片旋转做不出来） |
| 格式 | **WebM（VP9 编码）**，最好带 Alpha 透明通道；若工具不支持透明，则**纯白背景**（#F5F0E4 更佳）也可以，代码里用 `mix-blend-mode: multiply` 融入宣纸底 |
| 尺寸 | 1080 × 1080（正方形） |
| 帧率/时长 | 24–30 fps，**4–6 秒无缝循环**（首尾帧衔接，太极旋转整数圈） |
| 文件大小 | 建议 ≤ 5 MB（网页加载） |
| 存放路径 | `public/fx/taiji-ink-spin.webm` |
| 备选格式 | 若只能出 MP4（H.264）：改名放 `public/fx/` 后把 `RitualOverlay.tsx` 顶部 `TAIJI_VIDEO_URL` 的扩展名改成 `.mp4` 即可 |

**生成 Prompt（中文）：**
> 中国水墨画风格的太极图在宣纸上缓缓顺时针旋转，墨色浓淡相间，边缘有毛笔飞白和墨晕渗染效果，周围环绕淡淡的水墨烟雾缭绕流动，仙气飘飘，禅意空灵，米白色宣纸背景，极简构图，居中，无文字，无印章，循环动画

**生成 Prompt（English）：**
> Chinese ink wash painting style taiji (yin-yang) symbol slowly rotating clockwise on rice paper, ink gradients with dry-brush flying-white edges and ink bleed halo, surrounded by softly drifting ink mist and ethereal smoke, zen, minimal composition, centered, ivory rice paper background, no text, no watermark, seamless loop animation

---

## 二、烟雾消散转场视频（★★）

| 项目 | 要求 |
|---|---|
| 用途 | 仪式动画第二幕：太极消散、烟雾散开露出命盘 |
| 类型 | **视频** |
| 格式 | WebM（VP9 + Alpha 透明通道**必须**，因为要叠加在命盘上方） |
| 尺寸 | 1440 × 1440 |
| 帧率/时长 | 24–30 fps，2.5–4 秒，**单次播放**（不循环）：从浓雾满屏 → 完全散尽透明 |
| 文件大小 | ≤ 4 MB |
| 存放路径 | `public/fx/smoke-dissolve.webm`（预留位，当前由 CSS 模糊消散兜底） |

**生成 Prompt（中文）：**
> 浓白色水墨烟雾从画面中心向四周缓缓消散退去，露出透明背景，中国水墨画质感，烟雾如宣纸上晕开又收拢的墨雾，柔和飘逸，仙气，透明通道，从满屏浓雾到完全消散

**生成 Prompt（English）：**
> Thick white-grey ink mist slowly dissolving outward from center revealing transparent background, Chinese ink painting texture, soft ethereal smoke like ink wash dispersing on rice paper, alpha channel, from full-screen fog to fully cleared, elegant and slow

---

## 三、水墨山水页面背景（★★）

| 项目 | 要求 |
|---|---|
| 用途 | 整站页面背景（替换当前纯 CSS 宣纸底纹） |
| 类型 | **图片** |
| 格式 | JPG（无需透明），质量 80 左右 |
| 尺寸 | 2560 × 1440（横版），中心区域必须**大面积留白**（放正文，保证文字可读性） |
| 文件大小 | ≤ 800 KB |
| 存放路径 | `public/bg/ink-landscape.jpg`，然后在 `src/index.css` 的 `body` 背景里取消对应注释（我预留了标注） |

**生成 Prompt（中文）：**
> 中国水墨山水画，远山如黛淡墨轻扫在画面顶部边缘，几只飞鸟点缀，右下角一叶扁舟，大量留白，米白宣纸底色，构图极简空灵，禅意，仙气，中央区域完全空白，淡雅低对比度，适合做网页背景

**生成 Prompt（English）：**
> Chinese ink wash landscape painting, faint distant mountains brushed lightly along top edge, a few small birds, tiny lone boat in bottom corner, vast negative space, ivory rice paper tone, extremely minimal and zen, ethereal, center area completely empty, low contrast muted elegance, suitable as webpage background

---

## 四、页脚远山剪影（★）

| 项目 | 要求 |
|---|---|
| 用途 | 页面底部装饰横幅 |
| 类型 | **图片** |
| 格式 | **PNG（透明背景）** |
| 尺寸 | 1920 × 480（横条） |
| 文件大小 | ≤ 500 KB |
| 存放路径 | `public/bg/ink-mountains-footer.png` |

**生成 Prompt（中文）：**
> 水墨远山横幅，连绵山峦淡墨渲染由浓到淡，山间云雾缭绕，几株松树剪影，底部渐隐为透明，横长构图，中国画留白意境，透明背景 PNG

---

## 五、水墨铜钱（★，可选）

| 项目 | 要求 |
|---|---|
| 用途 | 六爻卜卦的铜钱（替换当前 CSS 绘制版） |
| 类型 | **图片**（正、反两面各一张） |
| 格式 | PNG 透明背景 |
| 尺寸 | 512 × 512 每张 |
| 存放路径 | `public/fx/coin-front.png`、`public/fx/coin-back.png` |

**生成 Prompt（中文）：**
> 一枚古代铜钱的水墨画，圆形方孔钱，毛笔勾勒轮廓带飞白笔触，正面隐约可见「乾隆通宝」四字篆书（反面则为光背无字），淡赭石色晕染，透明背景，居中，中国画风格

---

## 通用要求

- 色调统一：**米白宣纸底（#EDE7D7 附近）+ 墨黑（#1F1C17）+ 朱砂红点缀（#A8382B）**，避免鲜艳彩色
- 一律**无文字水印、无签名、无 logo**（提示词里已写明，生成后请检查）
- 视频若无法输出 WebM，可先出高质量 MP4/GIF/PNG 序列帧，再用 ffmpeg 转：
  `ffmpeg -i in.mp4 -c:v libvpx-vp9 -crf 32 -b:v 0 -an taiji-ink-spin.webm`
  （带透明的 PNG 序列：`ffmpeg -framerate 30 -i frame_%04d.png -c:v libvpx-vp9 -pix_fmt yuva420p taiji-ink-spin.webm`）
