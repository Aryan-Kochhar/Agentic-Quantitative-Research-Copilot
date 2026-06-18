/**
 * pages/index.jsx  (or app/page.tsx if you're on App Router)
 * -----------------------------------------------------------
 * Landing page for Quant Copilot.
 * No Framer Motion, no Galaxy lib — just canvas + CSS.
 *
 * Deps needed (all already in your package.json):
 *   next, react, react-dom
 *
 * Optional add for the equity chart preview:
 *   plotly.js-dist-min (already a dep)
 */

"use client";
import { useEffect, useRef } from "react";
import Link from "next/link";
import dynamic from "next/dynamic";
import styles from "../styles/Landing.module.css";

const GridBackground = dynamic(() => import("../components/GridBackground"), { ssr: false });
const LiveFeedDemo   = dynamic(() => import("../components/LiveFeedDemo"),   { ssr: false });

export default function LandingPage() {
  const chartRef = useRef(null);

  useEffect(() => {
    import("plotly.js-dist-min").then((Plotly) => {
      if (!chartRef.current) return;

      // Generate a fake but realistic equity curve
      let v = 1;
      const x = [], y = [];
      const start = new Date("2025-01-01");
      for (let i = 0; i < 250; i++) {
        v *= 1 + (Math.random() - 0.44) * 0.025;
        const d = new Date(start);
        d.setDate(d.getDate() + i);
        x.push(d.toISOString().split("T")[0]);
        y.push(parseFloat(v.toFixed(4)));
      }

      Plotly.newPlot(chartRef.current, [{
        x, y,
        type: "scatter", mode: "lines",
        line: { color: "#EF9F27", width: 1.5 },
        fill: "tozeroy",
        fillcolor: "rgba(239,159,39,0.07)",
      }], {
        paper_bgcolor: "transparent",
        plot_bgcolor:  "transparent",
        margin: { t: 0, r: 0, b: 24, l: 40 },
        xaxis: { color: "#6B7094", tickfont: { family: "JetBrains Mono", size: 9 }, gridcolor: "rgba(255,255,255,0.04)" },
        yaxis: { color: "#6B7094", tickfont: { family: "JetBrains Mono", size: 9 }, gridcolor: "rgba(255,255,255,0.04)", tickformat: ".2f" },
        showlegend: false,
      }, { displayModeBar: false, responsive: true });
    });
  }, []);

  return (
    <>
      <GridBackground />
      <div className={styles.page}>

        {/* Header */}
        <header className={styles.header}>
          <div className={styles.logo}>
            <div className={styles.logoMark} />
            <div>
              <div className={styles.logoName}>QUANT COPILOT</div>
              <div className={styles.logoSub}>AGENTIC RESEARCH TERMINAL</div>
            </div>
          </div>
          <Link href="/chat" className={styles.navBtn}>LAUNCH TERMINAL →</Link>
        </header>

        {/* Hero */}
        <section className={styles.hero}>
          <div className={styles.eyebrow}>POWERED BY MCP · GROQ LLAMA 3.3 70B · MONGODB ATLAS</div>

          <h1 className={styles.headline}>
            Markets move fast.<br />
            <span className={styles.amber}>Your research</span> moves faster.
          </h1>

          <p className={styles.sub}>
            An agentic quantitative research engine that streams live tool calls,
            backtests portfolios in real time, and surfaces alpha — while you watch it think.
          </p>

          <div className={styles.ctaRow}>
            <Link href="/chat" className={styles.ctaPrimary}>OPEN TERMINAL →</Link>
            <a href="https://github.com/Aryan-Kochhar/Agentic-Quantitative-Research-Copilot" target="_blank" rel="noopener" className={styles.ctaGhost}>VIEW ON GITHUB</a>
          </div>

          {/* Terminal mockup */}
          <div className={styles.preview}>
            <div className={styles.previewBar}>
              <div className={styles.dot} style={{ background: "#E24B4A" }} />
              <div className={styles.dot} style={{ background: "#EF9F27" }} />
              <div className={styles.dot} style={{ background: "#1D9E75" }} />
              <div className={styles.previewUrl}>localhost:3000 — Quant Copilot</div>
            </div>
            <div className={styles.previewBody}>
              <LiveFeedDemo />
              <div className={styles.chartPanel}>
                <div className={styles.chartLabel}>PORTFOLIO EQUITY CURVE</div>
                <div ref={chartRef} className={styles.chartCanvas} />
                <div className={styles.statsRow}>
                  <div className={styles.stat}>
                    <div className={styles.statLabel}>SHARPE</div>
                    <div className={styles.statVal}>1.84</div>
                  </div>
                  <div className={styles.stat}>
                    <div className={styles.statLabel}>RETURN</div>
                    <div className={`${styles.statVal} ${styles.green}`}>+24.3%</div>
                  </div>
                  <div className={styles.stat}>
                    <div className={styles.statLabel}>MAX DD</div>
                    <div className={`${styles.statVal} ${styles.blue}`}>-8.1%</div>
                  </div>
                </div>
              </div>
            </div>
          </div>
        </section>

        {/* Stack badges */}
        <div className={styles.badgeRow}>
          {["FASTAPI + WEBSOCKET","GROQ LLAMA 3.3 70B","MONGODB ATLAS","REDIS CACHE","MCP TOOL PROTOCOL","YFINANCE","OLLAMA FALLBACK"].map(b => (
            <div key={b} className={styles.badge}>{b}</div>
          ))}
        </div>

        {/* Feature cards */}
        <div className={styles.features}>
          <div className={styles.feat}>
            <div className={styles.featIcon}>⚡</div>
            <div className={styles.featTitle}>LIVE STREAMING</div>
            <div className={styles.featDesc}>Watch every tool call stream in real time over WebSocket. No black box — see exactly what the agent is doing as it fetches, computes, and reasons.</div>
          </div>
          <div className={styles.feat}>
            <div className={styles.featIcon}>📊</div>
            <div className={styles.featTitle}>BACKTEST ENGINE</div>
            <div className={styles.featDesc}>Run equity curve backtests on any ticker combination. Sharpe ratio, max drawdown, and annualized returns computed from live yfinance data.</div>
          </div>
          <div className={styles.feat}>
            <div className={styles.featIcon}>🔩</div>
            <div className={styles.featTitle}>MCP TOOL PROTOCOL</div>
            <div className={styles.featDesc}>Agent orchestrates specialized quant tools via the Model Context Protocol — price data, volatility, correlation, and portfolio analysis as modular servers.</div>
          </div>
        </div>

        {/* Footer */}
        <footer className={styles.footer}>
          <div className={styles.footerL}>© 2026 Quant Copilot · Aryan Kochhar</div>
          <div className={styles.footerR}>
            <a href="https://github.com/Aryan-Kochhar/Agentic-Quantitative-Research-Copilot" target="_blank" rel="noopener" className={styles.footerLink}>GitHub</a>
            <span className={styles.footerLink}>API Docs</span>
          </div>
        </footer>

      </div>
    </>
  );
}
