import { useEffect, useState } from 'react'
import { GlossaryProvider } from './components/Master'
import { ScreenHead, EnsoRing } from './components/ChatUI'
import { BaziChat } from './components/BaziChat'
import { DivineChat } from './components/DivineChat'
import { OracleChat } from './components/OracleChat'
import { loadRecords, type RecordItem } from './lib/records'

type Screen = 'home' | 'bazi' | 'divine' | 'oracle' | 'records' | 'me'

const SCREEN_TITLE: Record<Screen, string> = {
  home: '', bazi: '问命排盘', divine: '六爻占卜', oracle: '答疑解惑', records: '我的记录', me: '我的',
}

export default function App() {
  const [screen, setScreen] = useState<Screen>('home')

  return (
    <GlossaryProvider>
      <div className="phone">
        {screen === 'home' && <Home go={setScreen} />}
        {screen !== 'home' && (
          <>
            <ScreenHead title={SCREEN_TITLE[screen]} onBack={() => setScreen('home')} />
            {screen === 'bazi' && <BaziChat key="bazi" />}
            {screen === 'divine' && <DivineChat key="divine" />}
            {screen === 'oracle' && <OracleChat key="oracle" />}
            {screen === 'records' && <RecordsScreen />}
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
        <div className="home-hero">
          <div className="home-art">
            {heroOk ? (
              <img src="/fx/hero-ink.png" onError={() => setHeroOk(false)} alt="" />
            ) : (
              <HeroFallback />
            )}
          </div>
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
        <button className="bnav-item active"><span className="bicon">◉</span>对话</button>
        <button className="bnav-item" onClick={() => go('records')}><span className="bicon">☰</span>记录</button>
        <button className="bnav-item" onClick={() => go('me')}><span className="bicon">◯</span>我的</button>
      </div>
    </>
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
function RecordsScreen() {
  const [records, setRecords] = useState<RecordItem[]>([])
  useEffect(() => { setRecords(loadRecords()) }, [])
  return (
    <div className="records-list">
      {records.length === 0 && (
        <div className="records-empty">尚无记录<br />排一次盘、问一次卦，缘分自会留痕</div>
      )}
      {records.map((r) => (
        <div className="record-item" key={r.id}>
          <EnsoRing size={52} stroke={3} />
          <div>
            <div className="r-title">{r.type} · {r.title}</div>
            <div className="r-sub">{r.summary}</div>
          </div>
          <div className="r-date">{r.date.slice(5, 16)}</div>
        </div>
      ))}
    </div>
  )
}

// ---------- 我的 ----------
function MeScreen() {
  return (
    <div className="records-list">
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
