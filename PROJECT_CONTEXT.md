# Quant Copilot — Project Context

## What we built
A production-grade Agentic Quant Research Copilot. User types a natural
language financial query, an LLM agent calls MCP tools, fetches real market
data, runs quant analysis, and streams a structured research report back in
real time via WebSocket. Supports both US and Indian (NSE/BSE) markets.

## Stack
- MongoDB Atlas (motor async) — stores close prices
- Redis (Docker) — caches LLM query results (1hr TTL) AND ticker search results (5min TTL)
- yfinance — US + Indian (NSE/BSE via .NS/.BO suffix) market data, close prices only, log returns, ffill
- Groq llama-3.3-70b-versatile — primary LLM with tool calling
- Ollama qwen2.5:14b — local fallback on RateLimitError/APIStatusError, reached via
  127.0.0.1 (not localhost — Windows dual-stack IPv4/IPv6 resolution was causing
  "All connection attempts failed" errors even with Ollama running)
- MCP (FastMCP) — tool protocol between agent and data servers
- FastAPI + WebSocket + slowapi — API layer with rate limiting
- Next.js (Pages Router) — frontend
- httpx — async HTTP client for Yahoo Finance search proxy, explicit timeout
  (2.5s total / 1.5s connect) with try/except fallback to empty results

## Backend file structure
```
MCP Quant/
├── db/
│   ├── __init__.py
│   └── mongo.py              — Atlas connection, save/load/cache/delete,
│                                ticker_exists() boundary-checked (see Bugs Fixed)
├── mcp_servers/
│   ├── __init__.py
│   ├── market_data.py        — yfinance fetch, ffill, log returns, 3 MCP tools
│   └── quant.py              — 5 MCP tools wrapping quant analysis functions
├── quant/
│   ├── __init__.py
│   ├── analysis.py           — max_drawdown, var_95, correlation_matrix, portfolio_summary
│   └── backtest.py           — Backtester class, run() returns 5 metrics + equity curve
├── agent.py                  — Groq tool loop, Ollama fallback, MAX_ITERATIONS=8,
│                                tool result compaction before re-entering message history
├── main.py                   — FastAPI, lifespan, rate limiting, CORS, /query, /backtest,
│                                /ws/query, /search (now timeout+cached+fault-tolerant)
├── redis_cache.py            — async Redis connect/get/set, plus generic
│                                get_cached_raw/set_cached_raw for non-query caching
├── check_ticker.py           — diagnostic script: inspect cached price data for a ticker
│                                (gap detection, staleness, ffill-artifact check)
├── requirements.txt
└── .env
```

## Frontend file structure
```
MCP Quant/frontend/
├── components/
│   ├── QueryInput.jsx        — text input + submit, 500 char limit
│   ├── LiveFeed.jsx          — streaming WebSocket events display, auto-scroll
│   ├── EquityChart.jsx       — Plotly equity curve + 5 metrics + investment simulator
│   ├── BacktestPanel.jsx     — US/IN market toggle, DEMO/CUSTOM mode, live ticker search, tag pills, date pickers
│   ├── GridBackground.jsx    — animated canvas: pure black bg, amber grid, twinkling stars
│   └── LiveFeedDemo.jsx      — auto-plays fake agent events in landing hero
├── hooks/
│   └── useQuantCopilot.js    — WebSocket + fetch, separate isLoading/btLoading states
├── pages/
│   ├── _app.jsx              — Next.js entry, imports globals
│   ├── index.jsx             — landing page
│   └── chat.jsx              — terminal UI (main product page)
├── styles/
│   ├── globals.css           — black bg, JetBrains Mono, amber scrollbar
│   ├── Landing.module.css
│   ├── Chat.module.css
│   ├── LiveFeedDemo.module.css
│   ├── BacktestPanel.module.css
│   ├── QueryInput.module.css
│   ├── LiveFeed.module.css
│   └── EquityChart.module.css
└── .env.local                — NEXT_PUBLIC_API_URL=http://localhost:8000
```

## Design system
- Background: pure black #000000 + amber grid canvas (GridBackground.jsx)
- Cards: #161929 background, 0.5px #252840 border, 12px border-radius
- Accent: #BA7517 (labels), #EF9F27 (interactive/amber)
- Success/tool_done: #1D9E75 (green)
- Info/answer: #378ADD (blue)
- Error: #E24B4A (red)
- Font: JetBrains Mono throughout
- Thin amber scrollbar (#BA7517 on hover)

## Key data decisions (locked)
- US market data via yfinance, close prices only
- Indian market via yfinance .NS (NSE) / .BO (BSE) suffix
- Mixed US + Indian portfolios blocked at backend level (returns 400 error)
- Log returns: log(P_t / P_{t-1}), forward fill for missing data
- DataFrame contract: datetime index, ticker columns, no NaNs
- MongoDB stores one doc per ticker per day: {ticker, date, close, fetched_at}
- Cache-hit check (ticker_exists) validates BOTH document count AND that the
  earliest cached date actually covers the requested start date (3-day buffer
  for weekends/holidays) — prevents silently using a later cached start as
  if it were the requested one
- Equity curve stripped before LLM sees it (228 chars vs 13k) — keeps agent context cheap
- get_price_data returns summary stats not raw rows (avoids 413 payload errors)
- Large tool results (e.g. get_close_prices) are compacted to summary stats
  (count, start/end date, first/last/min/max close) before re-entering LLM
  message history — raw data still used for the actual tool computation,
  only the history copy is shrunk
- /search results cached in Redis 5 min per (market, query) pair; failures
  (timeout, Yahoo error) return {"quotes": []} instead of 500, never cached

## API endpoints
- POST /query        — HTTP, rate limited 10/min, Redis cached 1hr
- POST /backtest     — HTTP, rate limited 5/min, returns full equity curve + 5 metrics, blocks mixed US/IN portfolios
- GET  /search       — proxies Yahoo Finance search, params: q (query), market (US|IN),
                        2.5s timeout, Redis cached 5min, graceful empty-result fallback on failure
- WS   /ws/query     — WebSocket, streams {type, ...} events:
    {type: "start",     message: "..."}
    {type: "tool_call", tool: "get_price_data"}
    {type: "tool_done", tool: "get_price_data"}
    {type: "cache_hit", message: "..."}
    {type: "answer",    data: {status, answer, provider, query, timestamp, tickers}}
    {type: "error",     message: "..."}
- GET  /health       — health check

## Backtest response shape
```json
{
  "status": "ok",
  "tickers": ["AAPL", "MSFT"],
  "start": "2025-01-01",
  "end": "2026-01-01",
  "metrics": {
    "cumulative_return": 0.1417,
    "annualized_return": 0.1435,
    "annualized_volatility": 0.2425,
    "sharpe_ratio": 0.5917,
    "max_drawdown": -0.2414
  },
  "equity_curve": [
    {"date": "2025-01-03", "value": 1.0047},
    ...
  ]
}
```
Note: field is `cumulative_return`, NOT `total_return` — frontend was fixed to match this.

## MCP tools available to agent
market_data.py:
  get_price_data(tickers, start_date, end_date)     → summary stats (Sharpe, vol, returns)
  get_close_prices(tickers, start_date, end_date)   → raw close prices (compacted before
                                                        re-entering message history)
  refresh_ticker(ticker)                            → force re-fetch from yfinance

quant.py:
  max_drawdown(tickers, start_date, end_date)       → per ticker drawdown
  var_95(tickers, start_date, end_date)             → 95% VaR
  correlation_matrix(tickers, start_date, end_date) → pairwise correlations
  portfolio_summary(tickers, start_date, end_date)  → equal weight portfolio stats
  run_backtest(tickers, start_date, end_date)       → 5 metrics, equity curve stripped

## Frontend component contracts

### EquityChart props
  data     { date: string, value: number }[]
  metrics  { cumulative_return, annualized_return, annualized_volatility, sharpe_ratio, max_drawdown } | null
  tickers  string[]
Renders: Plotly equity curve + 5 metric cards + investment simulator (default $10k, live update, no backend call — pure frontend math on equity curve's final value)

### BacktestPanel props
  onRun      (tickers: string[], startDate: string, endDate: string) => void
  isLoading  boolean (btLoading from hook — backtest only, independent of query isLoading)
Features: US/IN market toggle (switching resets selected tickers), DEMO/CUSTOM mode,
live Yahoo Finance search via /search proxy with 300ms debounce, tag pills with × remove,
.NS suffix hidden in display but sent to backend as-is. Note: Yahoo's search is prefix-based,
not fuzzy — imprecise/misspelled queries return no suggestions by design (Yahoo limitation,
not a bug).

### LiveFeed props
  events    { type: "tool_call" | "tool_done" | "answer", content: string }[]
  isLoading boolean
Event colors: tool_call=amber, tool_done=green, answer=blue, auto-scrolls to latest

### useQuantCopilot hook returns
  events, equityData, metrics, tickers  — display state
  isLoading   — WebSocket query in progress (locks QueryInput only)
  btLoading   — backtest fetch in progress (locks BacktestPanel only, independent of isLoading)
  error       — string | null
  submitQuery(query) — opens WebSocket, resets events ONLY (equityData/metrics/tickers persist
                       across new queries so the chart doesn't disappear)
  runBacktest(tickers, startDate, endDate) — POST /backtest, updates equityData+metrics+tickers,
                       wrapped in try/finally so btLoading always resets

## Bugs fixed during development
1. Auto-backtest trigger code was accidentally placed at module level (outside any function) —
   moved inside ws.onmessage's "answer" handler
2. runBacktest was defined after submitQuery but referenced by it — moved above, also used
   a ref (runBacktestRef) to avoid stale closure issues since submitQuery has empty deps array
3. EquityChart rendered a broken empty Plotly chart with garbage axes when no data — now only
   renders when data.length > 0
4. BacktestPanel and QueryInput shared one isLoading flag — backtest button was locked out
   whenever a query was in flight, and vice versa. Split into isLoading (query) and
   btLoading (backtest), independent state
5. submitQuery was wiping equityData/metrics/tickers on every new query — chart would
   disappear after running a new query post-backtest. Removed those resets so chart persists
6. Metrics field name mismatch — frontend expected total_return, backend returns
   cumulative_return — fixed in EquityChart.jsx
7. /search had no timeout, no error handling — a Yahoo Finance ConnectTimeout would
   propagate as a raw 500, which the frontend couldn't recover from without a manual
   page refresh. Fixed: explicit httpx timeout (2.5s/1.5s connect) + try/except
   returning {"quotes": []} on any failure, so the endpoint never 500s
8. Multi-tool queries (e.g. "why is TCS performing bad" → get_close_prices +
   get_max_drawdown) could blow past Groq's payload limit (413) because the full
   raw price series from get_close_prices (11k+ chars) was appended verbatim to
   message history and resent on every subsequent LLM call. Fixed: _compact_tool_result()
   in agent.py replaces large date:price series with summary stats before the result
   re-enters history; hard-truncate safety net for anything still oversized
9. Ollama fallback failed with "All connection attempts failed" even when `ollama serve`
   was confirmed running — caused by OLLAMA_BASE_URL using `localhost`, which resolves
   to both 127.0.0.1 and ::1 on Windows; IPv6 attempt failed and broke the whole
   connection. Fixed: changed .env to use 127.0.0.1 explicitly
10. ticker_exists() only checked document COUNT in the requested range, not whether
    the cached data's earliest date actually reached back to the requested start date.
    Real-world case: mutual fund (0P0001II3X.BO) cached from Aug 14, 2025 onward;
    backtest requested from Aug 7, 2025 (actual investment date); cache silently
    "hit" using Aug 14's NAV as if it were Aug 7's, inflating computed return
    (10.2% reported vs 8.85% actual). Fixed: added boundary check comparing earliest
    cached date to requested start (3-day buffer for weekends/holidays); forces
    yfinance re-fetch to backfill the gap if the boundary doesn't hold

## Routes
- localhost:3000       → landing page
- localhost:3000/chat  → terminal UI

## Running the system
Terminal 1: docker start redis
Terminal 2: cd "MCP Quant" && .\mcp\Scripts\activate && uvicorn main:app --reload --port 8000
Terminal 3: ollama serve
Terminal 4: cd frontend && npm run dev

## Venv
Named 'mcp', located at C:\Programming\Projects\MCP Quant\mcp\

## Diagnostics
check_ticker.py <TICKER> — run from project root, inspects MongoDB cache for a
  single ticker: doc count, date range, staleness, gap detection (>5 day jumps),
  ffill-artifact detection (long runs of identical consecutive closes), first/last
  5 raw values. Use this whenever a backtest/return number looks suspicious before
  assuming it's a calculation bug — often it's a caching/data-coverage issue instead.

## Current status
Phase 1 complete: mongo.py, market_data.py, agent.py
Phase 2 complete: main.py, redis_cache.py, quant.py, full Next.js frontend (landing + terminal)
Phase 3 complete: Indian market support (.NS/.BO), /search endpoint for live ticker
  autocomplete, investment simulator, search caching + fault tolerance, tool result
  compaction (413 fix), Ollama fallback connectivity fix, ticker cache boundary fix

## Pending
- Conversation memory (multi-turn context within a WebSocket session — agent currently
  has no memory of previous questions in the same session). Not urgent — Redis is
  already wired up, so this is a cheap add whenever prioritized.
- Demo (GIF/video walkthrough) for README
- README rewrite with live demo GIF/screenshot
- Deploy backend to Railway or Render
- Deploy frontend to Vercel, point NEXT_PUBLIC_API_URL at deployed backend
- Live demo URL for recruiters
- Mobile responsiveness pass on BacktestPanel dropdown (may overflow on small screens)