/**
 * components/LiveFeedDemo.jsx
 * Auto-plays a fake agent event sequence for the landing page hero.
 */
"use client";
import { useState, useEffect } from "react";
import styles from "../styles/LiveFeedDemo.module.css";

const SEQUENCE = [
  { type: "tool_call", label: "CALLING TOOL",  txt: 'get_price_data("AAPL", "MSFT", "NVDA")' },
  { type: "tool_done", label: "TOOL DONE",     txt: "Fetched 250 daily closes · 3 tickers" },
  { type: "tool_call", label: "CALLING TOOL",  txt: "compute_sharpe_ratio(returns, rf=0.05)" },
  { type: "tool_done", label: "TOOL DONE",     txt: "AAPL 1.84 · MSFT 2.11 · NVDA 2.47" },
  { type: "tool_call", label: "CALLING TOOL",  txt: "compute_max_drawdown(equity_curve)" },
  { type: "tool_done", label: "TOOL DONE",     txt: "Max drawdown: -8.1% (Oct 2024)" },
  { type: "answer",    label: "REPORT",        txt: "NVDA leads on risk-adjusted returns (Sharpe 2.47) driven by AI infrastructure demand. MSFT offers the most defensive profile..." },
];

export default function LiveFeedDemo() {
  const [events, setEvents] = useState([]);
  const [thinking, setThinking] = useState(false);

  useEffect(() => {
    let i = 0;
    const step = () => {
      if (i >= SEQUENCE.length) return;
      setThinking(true);
      const delay = i === 0 ? 1200 : 900;
      setTimeout(() => {
        setThinking(false);
        setEvents(prev => [...prev, SEQUENCE[i++]]);
        setTimeout(step, 1400);
      }, delay);
    };
    const init = setTimeout(step, 800);
    return () => clearTimeout(init);
  }, []);

  return (
    <div className={styles.panel}>
      <div className={styles.label}>LIVE AGENT ACTIVITY</div>
      <div className={styles.feed}>
        {events.map((ev, i) => (
          <div key={i} className={`${styles.event} ${styles[ev.type]}`}>
            <div className={styles.evType}>{ev.label}</div>
            <div className={styles.evTxt}>{ev.txt}</div>
          </div>
        ))}
        {thinking && (
          <div className={styles.thinking}>
            <span className={styles.dot} />
            <span className={styles.dot} />
            <span className={styles.dot} />
            <span className={styles.thinkingTxt}>agent thinking…</span>
          </div>
        )}
      </div>
    </div>
  );
}
