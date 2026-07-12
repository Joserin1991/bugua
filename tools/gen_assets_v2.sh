#!/usr/bin/env bash
# 玄机阁素材批量生成（gpt-image-2 @ api.apilio.ai）
# 用法：IMG_KEY=sk-xxx bash tools/gen_assets_v2.sh [起始序号]
# 产出直接写入 public/fx/；密钥只从环境变量读取，绝不写入仓库
set -euo pipefail
KEY="${IMG_KEY:?请先 export IMG_KEY=你的密钥}"
API="https://api.apilio.ai/v1/chat/completions"
OUT="$(cd "$(dirname "$0")/.." && pwd)/public/fx"
mkdir -p "$OUT"

DNA="中国水墨画风格，宣纸暖米色背景（#f0ecdf），浓淡墨分层（浓墨#211d14、中墨#4c463a、淡墨#948d7c），留白至少占画面40%，笔触干湿浓淡分明、有飞白，仅以一点朱砂红（#a8382b）点睛，无文字、无水印、无签名，构图疏朗，高级东方美学。透明背景PNG。"

# 文件名|尺寸|prompt
ITEMS=(
"hero-ink|1280x1472|${DNA} 一位背影独立山巅的老者道人，宽袍广袖随风，眺望远方云海与淡墨远山，一轮朱砂红圆日悬于左上，三两飞鸟掠过，山脚一叶扁舟，人物极小置于画面下三分之一，上方大量留白，竖幅构图"
"master-avatar|512x512|${DNA} 一笔而成的禅意圆相（enso）笔触作外框，圈内一位水墨老者侧脸剪影，长眉长髯，神态安详微垂目，仅头颈部，笔触极简五至七笔，圆相右下故意留一处断口，断口旁一点朱砂红"
"app-icon|1024x1024|${DNA} 单枚朱砂红方形篆刻印章居中，印面为抽象玄字变形（不可为真实可读文字），印章边缘有磨损崩缺质感，四周大量留白，背景为温润宣纸底色（此张为实底不透明）"
"seal-xuanjige|256x256|${DNA} 一枚小型朱砂红闲章，随意的方圆之间形状，印泥质感斑驳、边缘晕开，印面为抽象云纹或卦象三横线变形"
"art-love|1024x512|${DNA} 一弯淡墨残月下，一对小小人影并立于石桥，桥下水面倒影，一枝红梅从画面左侧探入，花瓣一点朱砂红，横幅构图右侧留白"
"art-liunian|1024x512|${DNA} 一叶扁舟行于蜿蜒淡墨长河，河道自左下向右上蜿蜒渐远消失于云雾，沿岸四季意象各一笔带过（一枝桃花、一片荷叶、一叶红枫、一段枯枝），红枫为唯一朱砂色，横幅"
"art-career|1024x512|${DNA} 层叠淡墨群山，一条山径盘旋而上，径末一人负手立于峰顶，一轮小红日破云，山腰云带横断，人物极小，横幅"
"art-wealth|1024x512|${DNA} 一株墨竹自左侧斜出，竹节劲挺，竹下一只古朴陶罐半埋于土，罐口溢出几枚圆形方孔铜钱剪影，其中一枚以朱砂红勾边，横幅"
"art-health|1024x512|${DNA} 一株遒劲墨松横斜，松下一只丹顶鹤单足而立引颈梳羽，鹤顶一点朱砂红，远处淡墨山影一抹，横幅"
"art-dayun|1024x512|${DNA} 蜿蜒江河穿过浓淡不一的八重山峦由近及远，每重山色深浅不同示意十年一程，最远处山口透出一线朱砂色天光，横幅"
"art-sanpan|1024x512|${DNA} 三个大小不一的墨圈（enso）品字形交叠，交叠处墨色加深，中心交集处一点朱砂红，三圈笔触浓淡各异，横幅"
"coin-front|512x512|${DNA} 一枚水墨勾勒的圆形方孔古铜钱正面，钱缘一圈浓墨、内方孔留白，钱面四方位以抽象笔画示意（不可为真实可读文字），微微斑驳锈迹"
"coin-back|512x512|${DNA} 一枚水墨勾勒的圆形方孔古铜钱背面，钱面光素无纹，仅方孔与外缘，一道朱砂红细线沿外缘四分之一圈"
"art-gua|1024x512|${DNA} 悬浮的六道横向墨爻自下而上排列，第四道断为两截（阴爻），其余为整笔（阳爻），墨爻粗拙有飞白，右上一点朱砂红圆点如印，横幅"
"ink-splash|512x512|${DNA} 一团正在晕开的墨滴俯视图，中心浓墨向外逐渐晕散成极淡灰，边缘呈自然羽状渗透，形状不规则"
"divider-ink|1024x64|${DNA} 一道横向干笔飞白墨线，起笔重收笔轻渐淡消失，中段一处自然断续"
"empty-records|768x512|${DNA} 一张矮案上摊开一卷空白书卷，旁置一方砚台与斜倚毛笔，笔尖一点朱砂红，大量留白"
"report-header|1280x400|${DNA} 横幅：左侧远山一抹与一轮朱砂红小日，右侧大片留白，底部一道极淡墨色云带贯穿，气象庄重"
)

START="${1:-0}"
i=0
for item in "${ITEMS[@]}"; do
  name="${item%%|*}"; rest="${item#*|}"; size="${rest%%|*}"; prompt="${rest#*|}"
  if [ "$i" -lt "$START" ]; then i=$((i+1)); continue; fi
  echo "[$i] 生成 $name ($size) ..."
  resp=$(curl -sS -m 300 -X POST "$API" \
    -H "Authorization: Bearer $KEY" -H "Content-Type: application/json" \
    -d "$(python3 - "$prompt" "$size" <<'PY'
import json, sys
print(json.dumps({
  "model": "gpt-image-2",
  "messages": [{"role": "user", "content": f"{sys.argv[1]}\n尺寸：{sys.argv[2]}"}],
}, ensure_ascii=False))
PY
)")
  # 提取图片：优先 b64，其次 markdown/URL
  url=$(echo "$resp" | grep -oE 'https://[^"\\)\ ]+\.(png|jpe?g|webp)' | head -1 || true)
  b64=$(echo "$resp" | python3 -c "
import json,sys,re
try:
  d=json.load(sys.stdin); c=d['choices'][0]['message']['content']
  m=re.search(r'data:image/[a-z]+;base64,([A-Za-z0-9+/=]+)', c if isinstance(c,str) else json.dumps(c))
  print(m.group(1) if m else '')
except Exception: print('')
" || true)
  if [ -n "$b64" ]; then
    echo "$b64" | base64 -d > "$OUT/$name.png" && echo "  ✓ b64 → $name.png"
  elif [ -n "$url" ]; then
    curl -sSL -m 120 "$url" -o "$OUT/$name.png" && echo "  ✓ url → $name.png"
  else
    echo "  ✗ 未取到图片，原始响应前200字：$(echo "$resp" | head -c 200)"
  fi
  i=$((i+1))
  sleep 2
done
echo "完成。灰底图请交回处理透明化。"
