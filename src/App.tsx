import { useEffect, useState } from 'react'
import { GlossaryProvider } from './components/Master'
import { ScreenHead, EnsoRing } from './components/ChatUI'
import { BaziChat } from './components/BaziChat'
import { DivineChat } from './components/DivineChat'
import { OracleChat } from './components/OracleChat'
import { ReplayChat } from './components/ReplayChat'
import { loadRecords, type RecordItem } from './lib/records'
import { loadSyncConfig, saveSyncConfig, syncRestore, ensureSyncCode } from './lib/sync'
import { fx } from './lib/fx'

type Screen = 'home' | 'bazi' | 'divine' | 'oracle' | 'records' | 'me' | 'replay'

const SCREEN_TITLE: Record<Screen, string> = {
  home: '', bazi: '问命排盘', divine: '六爻占卜', oracle: '答疑解惑', records: '我的记录', me: '我的', replay: '回看 · 续问',
}

export default function App() {
  const [screen, setScreen] = useState<Screen>('home')
  const [resumePid, setResumePid] = useState<string | null>(null)
  const [replayRec, setReplayRec] = useState<RecordItem | null>(null)
  useEffect(() => { ensureSyncCode() }, []) // 首次启动生成恢复码，自动备份即刻可用

  return (
    <GlossaryProvider>
      <div className="phone">
        {screen === 'home' && <Home go={(sc) => { setResumePid(null); setScreen(sc) }} />}
        {screen !== 'home' && (
          <>
            <ScreenHead
              title={SCREEN_TITLE[screen]}
              onBack={() => { setScreen(screen === 'replay' ? 'records' : 'home'); setResumePid(null) }}
              right={['bazi', 'divine', 'oracle', 'replay'].includes(screen)
                ? <span className="ai-badge on">AI·通</span>
                : undefined}
            />
            {screen === 'bazi' && <BaziChat key={`bazi-${resumePid ?? 'new'}`} resumePid={resumePid} />}
            {screen === 'divine' && <DivineChat key="divine" />}
            {screen === 'oracle' && <OracleChat key="oracle" />}
            {screen === 'records' && (
              <RecordsScreen
                onResume={(pid) => { setResumePid(pid); setScreen('bazi') }}
                onOpen={(rec) => { setReplayRec(rec); setScreen('replay') }}
              />
            )}
            {screen === 'replay' && replayRec && <ReplayChat key={replayRec.id} record={replayRec} />}
            {screen === 'me' && <MeScreen />}
          </>
        )}
      </div>
    </GlossaryProvider>
  )
}

// ---------- 首页 ----------
function Home({ go }: { go: (s: Screen) => void }) {
  const [heroOk, setHeroOk] = useState(true)
  return (
    <>
      <div className="home">
        <div className="home-bg" aria-hidden>
          {heroOk ? (
            <img src={fx('hero-ink.png')} onError={() => setHeroOk(false)} alt="" />
          ) : (
            <HeroFallback />
          )}
        </div>
        <div className="home-hero">
          <div className="home-title-wrap">
            <h1 className="home-title-col">
              <span className="ht-text">玄机阁</span>
              <span className="seal-dot">问道</span>
            </h1>
            <div className="home-slogan">
              <span>洞悉天命</span>
              <span>把握人生方向</span>
            </div>
          </div>
        </div>
        <div className="home-entries">
          <button className="entry-ring" onClick={() => go('bazi')}>
            <EnsoRing size={108} stroke={4} className="ring" />
            <span className="en-name">问命</span>
            <span className="en-sub">八字 · 紫微</span>
          </button>
          <button className="entry-ring" onClick={() => go('divine')}>
            <EnsoRing size={108} stroke={4} className="ring" />
            <span className="en-name">卜卦</span>
            <span className="en-sub">六爻 · 断事</span>
          </button>
          <button className="entry-ring" onClick={() => go('oracle')}>
            <EnsoRing size={108} stroke={4} className="ring" />
            <span className="en-name">解惑</span>
            <span className="en-sub">梅花易数</span>
          </button>
        </div>
      </div>
      <div className="bottom-nav">
        <button className="bnav-item active"><NavIcon kind="chat" active />对话</button>
        <button className="bnav-item" onClick={() => go('records')}><NavIcon kind="record" />记录</button>
        <button className="bnav-item" onClick={() => go('me')}><NavIcon kind="me" />我的</button>
      </div>
    </>
  )
}

// 底部导航水墨小图标（笔触感 stroke）
function NavIcon({ kind, active = false }: { kind: 'chat' | 'record' | 'me'; active?: boolean }) {
  const s = active ? '#211d14' : '#948d7c'
  return (
    <svg viewBox="0 0 24 24" fill="none">
      {kind === 'chat' && (
        <>
          <path d="M4.5 6.5 Q4 4.5 6 4.2 Q12 3.2 18 4.2 Q20 4.5 19.6 6.6 Q19.2 10 19.4 13 Q19.6 15.4 17.4 15.6 L9.5 16.2 L6 19 L6.2 16 Q4.6 15.6 4.4 13.6 Q4 10 4.5 6.5 Z" stroke={s} strokeWidth="1.7" strokeLinecap="round" strokeLinejoin="round" />
          {active && <circle cx="18.5" cy="5.5" r="2.2" fill="#a8382b" />}
        </>
      )}
      {kind === 'record' && (
        <>
          <path d="M5 5.2 Q12 4.4 19 5.2" stroke={s} strokeWidth="2" strokeLinecap="round" />
          <path d="M5.4 10.1 Q12 9.4 18.6 10.1" stroke={s} strokeWidth="1.7" strokeLinecap="round" />
          <path d="M5.8 15 Q11 14.4 15.5 15" stroke={s} strokeWidth="1.4" strokeLinecap="round" />
          <path d="M6.2 19.6 Q9.5 19.2 12 19.6" stroke={s} strokeWidth="1.2" strokeLinecap="round" />
        </>
      )}
      {kind === 'me' && (
        <>
          <circle cx="12" cy="8.2" r="3.6" stroke={s} strokeWidth="1.7" />
          <path d="M4.8 20 Q6.5 14.4 12 14.4 Q17.5 14.4 19.2 20" stroke={s} strokeWidth="1.7" strokeLinecap="round" />
        </>
      )}
    </svg>
  )
}

// 首页主视觉兜底（大禅圈 + 远山 + 飞鸟 + 红日）
function HeroFallback() {
  return (
    <svg viewBox="0 0 400 460" style={{ width: '100%', height: '100%' }}>
      <defs>
        <filter id="hero-rough" x="-20%" y="-20%" width="140%" height="140%">
          <feTurbulence type="fractalNoise" baseFrequency="0.025 0.04" numOctaves="2" seed="6" result="n" />
          <feDisplacementMap in="SourceGraphic" in2="n" scale="8" />
        </filter>
      </defs>
      <g filter="url(#hero-rough)" opacity="0.85">
        <path d="M 342 210 A 148 148 0 1 1 318 118" fill="none" stroke="#1e1c18" strokeWidth="15" strokeLinecap="round" />
      </g>
      <circle cx="258" cy="120" r="13" fill="#a8382b" opacity="0.9" />
      <g filter="url(#hero-rough)">
        <path d="M 60 330 Q 130 270 210 315 T 380 305 L 400 460 L 0 460 Z" fill="#55524a" opacity="0.35" />
        <path d="M 20 365 Q 120 315 230 352 T 420 342 L 400 460 L 0 460 Z" fill="#1e1c18" opacity="0.5" />
      </g>
      <g stroke="#1e1c18" strokeWidth="1.5" fill="none" strokeLinecap="round" opacity="0.7">
        <path d="M 150 170 q 7 -7 14 0" />
        <path d="M 175 155 q 6 -6 12 0" />
        <path d="M 196 172 q 5 -5 10 0" />
      </g>
      {/* 小舟 */}
      <g opacity="0.8">
        <path d="M 285 395 q 18 8 36 0 l -5 6 q -13 5 -26 0 Z" fill="#1e1c18" />
        <line x1="303" y1="378" x2="303" y2="395" stroke="#1e1c18" strokeWidth="1.6" />
      </g>
    </svg>
  )
}

// ---------- 记录 ----------
function RecordsScreen({ onResume, onOpen }: { onResume: (pid: string) => void; onOpen: (rec: RecordItem) => void }) {
  const [records, setRecords] = useState<RecordItem[]>([])
  const [filter, setFilter] = useState<'全部' | RecordItem['type']>('全部')
  useEffect(() => { setRecords(loadRecords()) }, [])
  const shown = filter === '全部' ? records : records.filter((r) => r.type === filter)
  return (
    <div className="records-list">
      <div className="rec-tabs">
        {(['全部', '八字排盘', '六爻问事', '答疑解惑'] as const).map((t) => (
          <button key={t} className={`rec-tab ${filter === t ? 'on' : ''}`} onClick={() => setFilter(t)}>{t === '八字排盘' ? '命盘' : t === '六爻问事' ? '卜卦' : t === '答疑解惑' ? '解惑' : '全部'}</button>
        ))}
      </div>
      {shown.length === 0 && (
        <div className="records-empty">
          <img src={fx('empty-records.png')} alt="" style={{ width: '70%', maxWidth: 300, opacity: 0.9, display: 'block', margin: '0 auto 10px' }} />
          尚无记录<br />排一次盘、问一次卦，缘分自会留痕
        </div>
      )}
      {shown.map((r) => (
        <div
          className="record-item clickable"
          key={r.id}
          onClick={() => { if (r.type === '八字排盘' && r.pid) onResume(r.pid); else onOpen(r) }}
        >
          <EnsoRing size={52} stroke={3} />
          <div>
            <div className="r-title">{r.type} · {r.title}</div>
            <div className="r-sub">{r.summary}</div>
          </div>
          <div className="r-right">
            <div className="r-date">{r.date.slice(5, 16)}</div>
            <div className="r-go">{r.type === '八字排盘' ? '续问' : r.gua ? '回看·续问' : '回看'} ›</div>
          </div>
        </div>
      ))}
    </div>
  )
}

// ---------- 我的 ----------
function MeScreen() {
  const recs = loadRecords()
  const profCount = (() => { try { return Object.keys(JSON.parse(localStorage.getItem('xjg-profiles') ?? '{}')).length } catch { return 0 } })()
  const [note, setNote] = useState('')
  const clearData = () => {
    localStorage.removeItem('xuanjige_records')
    localStorage.removeItem('xjg-profiles')
    setNote('已清除本机记录与命主档案——刷新后生效')
  }
  return (
    <div className="records-list">
      <div className="me-stats card-msg">
        <div className="me-stat"><b>{recs.filter((r) => r.type === '八字排盘').length}</b><span>排盘</span></div>
        <div className="me-stat"><b>{recs.filter((r) => r.type !== '八字排盘').length}</b><span>问卦</span></div>
        <div className="me-stat"><b>{profCount}</b><span>命主档案</span></div>
      </div>
      <BackupCard />
      <div className="about-card card-msg">
        <div className="card-title">关于与免责声明</div>
        <ul className="about-list">
          <li>「玄机阁」是一款基于传统术数文化（八字、紫微斗数、六爻、梅花易数）的<b>文化娱乐类</b>应用，所有排盘与断语仅供参考、休闲与传统文化学习之用。</li>
          <li>本应用内容<b>不构成</b>医疗、健康、投资、理财、法律、婚恋等任何专业建议。涉及健康请就医，涉及钱财与重大决定请咨询持牌专业人士，切勿以卦断代替理性判断。</li>
          <li>大师问答由 AI 大模型基于盘面实时生成，可能存在错漏，请自行甄别；网络不通时按古籍体例出具模板断语。</li>
          <li>未成年人请在监护人陪同下使用，请勿沉迷占测。</li>
          <li><b>隐私</b>：出生信息、对话记录与命主档案保存在你的设备上，并凭「恢复码」自动备份到本应用云端，用于换设备找回；恢复码即钥匙，请勿外泄。点上方「清除本机记录与档案」可抹除本机数据。</li>
          <li>命自我立，福自己求——卦为镜，路在人。</li>
        </ul>
        <div className="ai-actions" style={{ marginTop: 8 }}>
          <button className="chip chip-ghost" onClick={clearData}>清除本机记录与档案</button>
        </div>
        {note && <p className="ai-status">{note}</p>}
      </div>
      <div className="records-empty">
        玄机阁 · 卜卦问道
        <br />
        八字排盘 · 紫微斗数 · 六爻占卜 · 梅花易数
        <br />
        <span style={{ fontSize: '0.68rem' }}>内容基于传统术数体例生成 · 仅供参考 · 命自我立</span>
      </div>
    </div>
  )
}

// 云备份：全自动，界面只露恢复码；换设备输入恢复码即可取回
function BackupCard() {
  const [code] = useState(() => ensureSyncCode())
  const [inCode, setInCode] = useState('')
  const [status, setStatus] = useState('自动备份已开启 · 数据变动后静默上云')
  const [working, setWorking] = useState(false)

  const copy = async () => {
    try { await navigator.clipboard.writeText(code); setStatus('恢复码已复制，请抄在安全的地方') }
    catch { setStatus(`恢复码：${code}（请手动抄录）`) }
  }

  const restore = async () => {
    const c = inCode.trim().toUpperCase()
    if (c.length < 6) { setStatus('恢复码不对——形如 XJG-XXXXXXXX'); return }
    setWorking(true)
    setStatus('连接云端…')
    try {
      const saved = loadSyncConfig()
      const cfg = { ...(saved?.url ? { url: saved.url } : {}), code: c }
      const msg = await syncRestore(cfg)
      saveSyncConfig(cfg) // 此后本机以该码继续自动备份
      setStatus(msg)
    } catch (e) {
      setStatus(`恢复失败：${e instanceof Error ? e.message : String(e)}`)
    }
    setWorking(false)
  }

  return (
    <div className="ai-config card-msg">
      <div className="card-title">云备份</div>
      <div className="card-sub">档案、记录自动备份，无需操作。换设备时在新设备输入这台机器的恢复码即可找回</div>
      <div className="backup-code" onClick={copy} title="点击复制">
        <span>本机恢复码</span>
        <b>{code}</b>
        <span className="bc-hint">点击复制 · 请抄录保管</span>
      </div>
      <label className="ai-field">从旧设备恢复<input value={inCode} placeholder="输入旧设备的恢复码 XJG-…" onChange={(e) => setInCode(e.target.value)} /></label>
      <div className="ai-actions">
        <button className="chip" onClick={restore} disabled={working}>取回云端数据</button>
      </div>
      <p className="ai-status">{status}</p>
    </div>
  )
}
