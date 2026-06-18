/**
 * hooks/useQuantCopilot.js
 * ------------------------
 * Fixes applied:
 *   1. runBacktest defined BEFORE submitQuery so it's in scope
 *   2. runBacktest accessed via ref inside submitQuery to avoid stale closure
 *   3. Auto-backtest trigger placed correctly inside ws.onmessage on "answer"
 */

import { useState, useRef, useCallback } from "react";

const API = process.env.NEXT_PUBLIC_API_URL;

export function useQuantCopilot() {
  const [events, setEvents]         = useState([]);
  const [equityData, setEquityData] = useState([]);
  const [isLoading, setIsLoading]   = useState(false);
  const [error, setError]           = useState(null);

  const wsRef          = useRef(null);
  // Ref so submitQuery always calls the latest runBacktest without
  // needing it as a useCallback dependency (avoids stale closure)
  const runBacktestRef = useRef(null);

  // ------------------------------------------------------------------
  // runBacktest — hits /backtest, returns equity curve for EquityChart
  // Defined first so submitQuery can reference it via runBacktestRef
  // ------------------------------------------------------------------
  const runBacktest = useCallback(async (tickers, startDate, endDate) => {
    setError(null);
    try {
      const res = await fetch(`${API}/backtest`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          tickers,
          start_date: startDate,
          end_date:   endDate,
        }),
      });

      if (!res.ok) throw new Error(`Server error: ${res.status}`);

      const data = await res.json();
      // data.equity_curve = [{ date: "2025-06-02", value: 1.043 }, ...]
      setEquityData(data.equity_curve || []);
      return data;

    } catch (e) {
      setError(e.message);
      return null;
    }
  }, []);

  // Keep ref in sync with the latest runBacktest
  runBacktestRef.current = runBacktest;

  // ------------------------------------------------------------------
  // submitQuery — opens WebSocket, streams tool_call/tool_done/answer
  // On "answer", auto-triggers runBacktest if tickers are present
  // ------------------------------------------------------------------
  const submitQuery = useCallback((query) => {
    // Reset state
    setEvents([]);
    setEquityData([]);
    setError(null);
    setIsLoading(true);

    // Close any existing socket
    if (wsRef.current) {
      wsRef.current.close();
    }

    const ws = new WebSocket(`${API.replace("http", "ws")}/ws/query`);
    wsRef.current = ws;

    ws.onopen = () => {
      ws.send(JSON.stringify({ query }));
    };

    ws.onmessage = (msg) => {
      try {
        const event = JSON.parse(msg.data);

        // Normalise all event shapes → { type, content }
        let normalised = null;

        if (event.type === "tool_call") {
          normalised = { type: "tool_call", content: `Calling ${event.tool}` };
        } else if (event.type === "tool_done") {
          normalised = { type: "tool_done", content: `${event.tool} completed` };
        } else if (event.type === "answer") {
          normalised = { type: "answer", content: event.data?.answer || JSON.stringify(event.data) };
        } else if (event.type === "cache_hit") {
          normalised = { type: "tool_done", content: "Cache hit — returning cached result" };
        } else if (event.type === "error") {
          normalised = { type: "answer", content: `Error: ${event.message}` };
        } else if (event.type === "start") {
          normalised = { type: "tool_call", content: event.message };
        }

        if (normalised) {
          setEvents((prev) => [...prev, normalised]);
        }

        if (event.type === "answer" || event.type === "error") {
          setIsLoading(false);
          ws.close();

          // Auto-trigger backtest to populate equity chart
          if (event.type === "answer") {
            const tickers = event.data?.tickers || [];
            const today      = new Date().toISOString().split("T")[0];
            const oneYearAgo = new Date(Date.now() - 365 * 24 * 60 * 60 * 1000)
                                 .toISOString().split("T")[0];

            if (tickers.length > 0) {
              runBacktestRef.current(tickers, oneYearAgo, today);
            }
          }
        }

      } catch (e) {
        console.error("WebSocket parse error:", e);
      }
    };

    ws.onerror = () => {
      setError("Connection to backend failed. Is the server running?");
      setIsLoading(false);
    };

    ws.onclose = () => {
      setIsLoading(false);
    };
  }, []);

  return {
    events,
    equityData,
    isLoading,
    error,
    submitQuery,
    runBacktest,
  };
}