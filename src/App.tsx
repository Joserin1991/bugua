import { useState } from 'react'
import { InkAtmosphere, BaguaWheel } from './components/Decor'
import { BaziPanel } from './components/BaziPanel'
import { DivinePanel } from './components/DivinePanel'
import { OraclePanel } from './components/OraclePanel'

type Tab = 'bazi' | 'divine' | 'oracle'

const TABS: { key: Tab; label: string }[] = [
  { key: 'bazi', label: '八字排盘' },
  { key: 'divine', label: '六爻卜卦' },
  { key: 'oracle', label: '答疑解惑' },
]

export default function App() {
  const [tab, setTab] = useState<Tab>('bazi')

  return (
    <>
      <InkAtmosphere />
      <BaguaWheel className="bagua-bg tl" />
      <BaguaWheel className="bagua-bg br" size={640} />
      <div className="app-shell">
        <header className="site-header">
          <h1 className="site-title">玄机阁</h1>
          <p className="site-subtitle">观天之道 · 执天之行</p>
          <div><span className="header-seal">奉道推演</span></div>
        </header>

        <nav className="nav-tabs">
          {TABS.map((t) => (
            <button
              key={t.key}
              className={`nav-tab ${tab === t.key ? 'active' : ''}`}
              onClick={() => setTab(t.key)}
            >
              {t.label}
            </button>
          ))}
        </nav>

        <main>
          {tab === 'bazi' && <BaziPanel />}
          {tab === 'divine' && <DivinePanel />}
          {tab === 'oracle' && <OraclePanel />}
        </main>

        <footer className="footer-note">
          <p>盘由心生 · 命自我立 · 卦象所示仅供参考</p>
          <p>玄机阁 © 丙午年 · 内容基于《渊海子平》《增删卜易》等传统术数体例生成，请理性看待</p>
        </footer>
      </div>
    </>
  )
}
