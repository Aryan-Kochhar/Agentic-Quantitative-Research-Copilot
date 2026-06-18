/**
 * components/BacktestPanel.jsx
 * ----------------------------
 * Props:
 *   onRun  (tickers: string[], startDate: string, endDate: string) => void
 *   isLoading boolean
 *
 * Two modes:
 *   DEMO  — pre-filled tickers + last-1-year dates, one click
 *   CUSTOM — user types their own tickers + picks dates
 */

import { useState } from "react";
import styles from "../styles/BacktestPanel.module.css";

const DEMO_TICKERS = ["AAPL", "MSFT", "GOOGL"];

function getDateRange() {
  const today      = new Date().toISOString().split("T")[0];
  const oneYearAgo = new Date(Date.now() - 365 * 24 * 60 * 60 * 1000)
                       .toISOString().split("T")[0];
  return { today, oneYearAgo };
}

export default function BacktestPanel({ onRun, isLoading }) {
  const { today, oneYearAgo } = getDateRange();

  const [mode, setMode]       = useState("demo");   // "demo" | "custom"
  const [tickerInput, setTickerInput] = useState("AAPL, MSFT, GOOGL");
  const [startDate, setStartDate]     = useState(oneYearAgo);
  const [endDate, setEndDate]         = useState(today);
  const [error, setError]             = useState("");

  const handleRun = () => {
    setError("");

    if (mode === "demo") {
      onRun(DEMO_TICKERS, oneYearAgo, today);
      return;
    }

    // Custom mode — validate
    const tickers = tickerInput
      .split(",")
      .map((t) => t.trim().toUpperCase())
      .filter(Boolean);

    if (tickers.length === 0) {
      setError("Enter at least one ticker.");
      return;
    }
    if (!startDate || !endDate) {
      setError("Both dates are required.");
      return;
    }
    if (startDate >= endDate) {
      setError("Start date must be before end date.");
      return;
    }

    onRun(tickers, startDate, endDate);
  };

  return (
    <div className={styles.card}>
      <div className={styles.label}>BACKTEST</div>

      {/* Mode toggle */}
      <div className={styles.toggle}>
        <button
          className={`${styles.tab} ${mode === "demo" ? styles.active : ""}`}
          onClick={() => setMode("demo")}
        >
          DEMO
        </button>
        <button
          className={`${styles.tab} ${mode === "custom" ? styles.active : ""}`}
          onClick={() => setMode("custom")}
        >
          CUSTOM
        </button>
      </div>

      {mode === "demo" ? (
        <div className={styles.demoInfo}>
          <span className={styles.demoTickers}>{DEMO_TICKERS.join(" · ")}</span>
          <span className={styles.demoDates}>{oneYearAgo} → {today}</span>
        </div>
      ) : (
        <div className={styles.customFields}>
          <div className={styles.field}>
            <label className={styles.fieldLabel}>TICKERS</label>
            <input
              className={styles.input}
              type="text"
              value={tickerInput}
              onChange={(e) => setTickerInput(e.target.value)}
              placeholder="AAPL, MSFT, TSLA"
              disabled={isLoading}
            />
          </div>
          <div className={styles.dateRow}>
            <div className={styles.field}>
              <label className={styles.fieldLabel}>FROM</label>
              <input
                className={styles.input}
                type="date"
                value={startDate}
                onChange={(e) => setStartDate(e.target.value)}
                disabled={isLoading}
              />
            </div>
            <div className={styles.field}>
              <label className={styles.fieldLabel}>TO</label>
              <input
                className={styles.input}
                type="date"
                value={endDate}
                onChange={(e) => setEndDate(e.target.value)}
                disabled={isLoading}
              />
            </div>
          </div>
        </div>
      )}

      {error && <div className={styles.error}>{error}</div>}

      <button
        className={styles.button}
        onClick={handleRun}
        disabled={isLoading}
      >
        {isLoading ? "RUNNING..." : "RUN BACKTEST →"}
      </button>
    </div>
  );
}
