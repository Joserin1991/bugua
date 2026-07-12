#!/usr/bin/env bash
# 玄机阁动效视频生成（doubao-seedance-2-0-260128）
# 用法：IMG_KEY=sk-xxx bash tools/gen_video.sh
# 注：视频接口为异步任务式（提交→轮询→下载），端点以 gpt-best.apifox.cn/api-343444777 文档为准；
#     若下方端点与文档不符，请按文档改 SUBMIT/QUERY 两个 URL 即可。
set -euo pipefail
KEY="${IMG_KEY:?请先 export IMG_KEY=你的密钥}"
BASE="https://api.apilio.ai"
SUBMIT="$BASE/v1/video/generations"
OUT="$(cd "$(dirname "$0")/.." && pwd)/public/fx"

PROMPT="中国水墨动画：一滴浓墨落入宣纸，缓缓晕开成一个禅意圆相（enso），墨色由浓转淡自然渗透，最后圆相中心浮现一点朱砂红，暖米色宣纸背景（#f0ecdf），极简高级东方美学，无文字无水印，5秒无缝循环，竖屏 720x1280"

resp=$(curl -sS -m 60 -X POST "$SUBMIT" \
  -H "Authorization: Bearer $KEY" -H "Content-Type: application/json" \
  -d "{\"model\":\"doubao-seedance-2-0-260128\",\"prompt\":$(python3 -c "import json,sys;print(json.dumps(sys.argv[1],ensure_ascii=False))" "$PROMPT"),\"duration\":5,\"resolution\":\"720p\"}")
echo "提交响应：$resp"
task=$(echo "$resp" | python3 -c "import json,sys;d=json.load(sys.stdin);print(d.get('id') or d.get('task_id') or '')" || true)
[ -z "$task" ] && { echo "未取到任务ID，请对照文档调整端点"; exit 1; }
echo "任务 $task，轮询中…"
for i in $(seq 1 60); do
  sleep 10
  q=$(curl -sS -m 30 -H "Authorization: Bearer $KEY" "$SUBMIT/$task")
  url=$(echo "$q" | grep -oE 'https://[^"]+\.mp4' | head -1 || true)
  [ -n "$url" ] && { curl -sSL "$url" -o "$OUT/fx-ink-loop.mp4"; echo "✓ fx-ink-loop.mp4"; exit 0; }
  st=$(echo "$q" | python3 -c "import json,sys;print(json.load(sys.stdin).get('status',''))" || true)
  echo "  [$i] $st"
done
echo "超时，请稍后用任务ID手查"
