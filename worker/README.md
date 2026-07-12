# 玄机阁轻后端（Cloudflare Workers 免费档）

一个 Worker 同时解决两件事：

1. **AI 密钥代理** —— 上游 API 密钥只存在 Cloudflare Secret 里，前端和代码库永远见不到。访客只需要你发的「访问口令」，烧不了你不知情的额度（每次回答上限 1200 tokens，历史最多带 24 条）。
2. **云同步** —— 命主档案 + 问卦记录按「同步口令」备份到 Workers KV，换手机输入同一口令即可恢复。口令经 SHA-256 才作键名，云端无法反查；AI 配置与密钥**不参与**同步。

免费额度（每天 10 万次请求、KV 读 10 万写 1 千）对个人使用绰绰有余。

## 一次性部署（约 5 分钟）

前提：注册 [Cloudflare](https://dash.cloudflare.com/sign-up)（免费）、本机装有 Node.js。

```bash
cd worker

# 1. 登录（浏览器授权）
npx wrangler login

# 2. 建云同步存储，把输出的 id 填进 wrangler.toml 的 kv_namespaces
npx wrangler kv namespace create SYNC_KV

# 3. 设机密（依提示粘贴，不会显示在屏幕上）
npx wrangler secret put UPSTREAM_KEY    # 上游 API 密钥（如 apilio 的 sk-…）
npx wrangler secret put ACCESS_CODE     # 自定一个访问口令，发给可以用的人

# 4. 部署
npx wrangler deploy
```

部署成功会给出地址，形如 `https://xuanjige-api.你的子域.workers.dev`。

## 在应用里怎么填

## 应用侧零配置

前端**无需任何填写**：

- **AI**：默认直连本 Worker（地址内置在 `src/lib/sync.ts` 的 `SYNC_URL`）。放行逻辑：来源在 `PUBLIC_ORIGINS` 白名单内（或 localhost 开发）即可用，受每日限额约束（全站 `DAILY_LIMIT`、单 IP `IP_DAILY_LIMIT`）；带 `ACCESS_CODE` 的请求不限额（自用）。
- **云备份**：全自动。首次启动生成「恢复码」（「我的」页可见、点击复制），数据变动后 5 秒静默上云；换设备输入旧机恢复码即可取回档案与记录。

## 改配置

- 换上游 / 换模型：改 `wrangler.toml` 的 `UPSTREAM_BASE` / `UPSTREAM_MODEL` 后重新 `npx wrangler deploy`
- 换密钥：重跑 `npx wrangler secret put UPSTREAM_KEY`
- 收紧来源：`ALLOW_ORIGIN = "https://joserin1991.github.io"`（默认 `*` 方便预览页调试）

## 安全边界（照实说）

- 拿到 ACCESS_CODE 的人就能通过你的 Worker 用你的额度——口令别公开发，泄露就换一个
- 同步数据以口令为唯一凭证，口令弱则可能被撞出；建议用长口令（如四个词连写）
- 免费档无请求日志留存需求，本 Worker 不记录任何内容
