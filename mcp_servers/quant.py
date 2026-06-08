"""
mcp_servers/quant.py
--------------------
MCP server exposing quantitative analysis tools to the agent.

Wraps quant/analysis.py functions as MCP tools.
Fetches log returns internally via the cache layer in market_data.py.

Tools:
    - get_max_drawdown       → max drawdown per ticker
    - get_var_95             → historical 95% VaR per ticker
    - get_correlation_matrix → pairwise correlation (requires ≥2 tickers)
    - get_portfolio_summary  → equal-weight portfolio stats
"""

import logging
from datetime import datetime, timezone

from mcp.server.fastmcp import FastMCP

from mcp_servers.market_data import _get_multi_ticker_closes, _compute_log_returns
from quant.analysis import max_drawdown, var_95, correlation_matrix, portfolio_summary

from quant.backtest import Backtester

logger = logging.getLogger(__name__)

mcp = FastMCP("quant")



async def _get_returns(tickers: list[str], start_date: str, end_date: str):
    start = datetime.strptime(start_date, "%Y-%m-%d").replace(tzinfo=timezone.utc)
    end   = datetime.strptime(end_date,   "%Y-%m-%d").replace(tzinfo=timezone.utc)
    closes  = await _get_multi_ticker_closes(tickers, start, end)
    returns = _compute_log_returns(closes)
    return returns

@mcp.tool()
async def get_max_drawdown(
    tickers: list[str],
    start_date: str,
    end_date: str,
) -> dict:
    """
    Maximum drawdown for each ticker over the date range.

    Args:
        tickers:    e.g. ["AAPL", "MSFT"]
        start_date: "YYYY-MM-DD"
        end_date:   "YYYY-MM-DD"

    Returns:
        Per-ticker max drawdown % and insight string.
    """
    try:
        returns = await _get_returns(tickers, start_date, end_date)
        result  = max_drawdown(returns)
        return {"status": "ok", "data": result}
    except Exception as e:
        logger.error("[get_max_drawdown] %s", e)
        return {"status": "error", "message": str(e)}


@mcp.tool()
async def get_var_95(
    tickers: list[str],
    start_date: str,
    end_date: str,
) -> dict:
    """
    Historical 95% Value-at-Risk for each ticker.

    Args:
        tickers:    e.g. ["AAPL"]
        start_date: "YYYY-MM-DD"
        end_date:   "YYYY-MM-DD"

    Returns:
        Per-ticker VaR % and insight string.
    """
    try:
        returns = await _get_returns(tickers, start_date, end_date)
        result  = var_95(returns)
        return {"status": "ok", "data": result}
    except Exception as e:
        logger.error("[get_var_95] %s", e)
        return {"status": "error", "message": str(e)}


@mcp.tool()
async def get_correlation_matrix(
    tickers: list[str],
    start_date: str,
    end_date: str,
) -> dict:
    """
    Pairwise correlation matrix for 2+ tickers.

    Args:
        tickers:    e.g. ["AAPL", "MSFT", "GOOGL"] — minimum 2
        start_date: "YYYY-MM-DD"
        end_date:   "YYYY-MM-DD"

    Returns:
        Pairwise correlation values and insight strings.
    """
    try:
        if len(tickers) < 2:
            return {"status": "error", "message": "Need at least 2 tickers for correlation."}
        returns = await _get_returns(tickers, start_date, end_date)
        result  = correlation_matrix(returns)
        return {"status": "ok", "data": result}
    except Exception as e:
        logger.error("[get_correlation_matrix] %s", e)
        return {"status": "error", "message": str(e)}


@mcp.tool()
async def get_portfolio_summary(
    tickers: list[str],
    start_date: str,
    end_date: str,
) -> dict:
    """
    Equal-weight portfolio stats: annual return, volatility, Sharpe ratio.

    Args:
        tickers:    e.g. ["AAPL", "MSFT", "GOOGL"]
        start_date: "YYYY-MM-DD"
        end_date:   "YYYY-MM-DD"

    Returns:
        Annual return %, volatility %, Sharpe ratio, insight string.
    """
    try:
        returns = await _get_returns(tickers, start_date, end_date)
        result  = portfolio_summary(returns)
        return {"status": "ok", "data": result}
    except Exception as e:
        logger.error("[get_portfolio_summary] %s", e)
        return {"status": "error", "message": str(e)}
    
@mcp.tool()
async def run_backtest(
    tickers: list[str],
    start_date: str,
    end_date: str,
    risk_free_rate: float = 0.0,
) -> dict:
    """
    Run a vectorised equal-weight backtest over a date range.

    Takes close prices (not returns) — Backtester handles log return
    computation internally via compute_log_returns().

    Args:
        tickers:        e.g. ["AAPL", "MSFT"]
        start_date:     "YYYY-MM-DD"
        end_date:       "YYYY-MM-DD"
        risk_free_rate: annual risk-free rate for Sharpe (default 0.0)

    Returns:
        metrics dict + equity_curve list of {date, value} dicts.
    """
    try:
        start = datetime.strptime(start_date, "%Y-%m-%d").replace(tzinfo=timezone.utc)
        end   = datetime.strptime(end_date,   "%Y-%m-%d").replace(tzinfo=timezone.utc)

        # Backtester needs close prices, not log returns
        # _get_multi_ticker_closes handles cache + yfinance fallback
        closes = await _get_multi_ticker_closes(tickers, start, end)

        bt     = Backtester()
        result = bt.run(closes, risk_free_rate=risk_free_rate)  
        metrics = result["metrics"]

        return {
            "status": "ok",
            "data"  : metrics
        }

    except Exception as e:
        logger.error("[run_backtest] %s", e)
        return {"status": "error", "message": str(e)}