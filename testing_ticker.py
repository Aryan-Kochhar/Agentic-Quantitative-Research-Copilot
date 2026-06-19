"""
testing_ticker.py
----------------
Quick diagnostic: inspect cached price data for a single ticker in MongoDB.

Checks:
    - How many docs exist
    - Date range covered
    - Gaps larger than 5 calendar days (red flag for mutual funds)
    - When the data was last fetched (staleness)
    - First/last 5 close values (sanity check)

Usage:
    eg: python testing_ticker.py 0P0001II3X.BO
"""

import asyncio
import os
import sys
from datetime import datetime, timezone

from dotenv import load_dotenv
from motor.motor_asyncio import AsyncIOMotorClient

load_dotenv()

MONGO_URI = os.getenv("MONGO_URI", "mongodb://localhost:27017")
DB_NAME = "quant_copilot"
COLLECTION = "price_history"


async def main(ticker: str):
    ticker = ticker.upper().strip()
    client = AsyncIOMotorClient(MONGO_URI)
    db = client[DB_NAME]
    collection = db[COLLECTION]

    docs = await collection.find(
        {"ticker": ticker},
        sort=[("date", 1)],
    ).to_list(length=None)

    if not docs:
        print(f"\n❌ No cached data found for '{ticker}' in MongoDB.\n")
        client.close()
        return

    print(f"\n{'='*60}")
    print(f"  Ticker: {ticker}")
    print(f"{'='*60}")
    print(f"Total documents : {len(docs)}")
    print(f"Date range      : {docs[0]['date'].date()} → {docs[-1]['date'].date()}")
    print(f"Last fetched at : {docs[-1]['fetched_at']}")

    now = datetime.now(timezone.utc)
    last_fetch = docs[-1]["fetched_at"]
    if last_fetch.tzinfo is None:
        last_fetch = last_fetch.replace(tzinfo=timezone.utc)
    staleness_days = (now - last_fetch).days
    print(f"Staleness       : fetched {staleness_days} day(s) ago")

    last_date = docs[-1]["date"]
    if last_date.tzinfo is None:
        last_date = last_date.replace(tzinfo=timezone.utc)
    data_lag_days = (now - last_date).days
    print(f"Most recent NAV : {data_lag_days} day(s) old")

    # --- Gap detection ---
    print(f"\n--- Gaps larger than 5 calendar days ---")
    gap_found = False
    for i in range(1, len(docs)):
        prev_date = docs[i - 1]["date"]
        curr_date = docs[i]["date"]
        gap = (curr_date - prev_date).days
        if gap > 5:
            gap_found = True
            print(f"  GAP: {prev_date.date()} → {curr_date.date()}  ({gap} days, "
                  f"close stayed at {docs[i-1]['close']} then jumped to {docs[i]['close']})")

    if not gap_found:
        print("  None found.")

    # --- Flat-line detection (consecutive identical closes — sign of ffill masking) ---
    print(f"\n--- Longest run of identical consecutive closes (ffill artifact check) ---")
    max_run = 1
    run = 1
    run_start = 0
    best_start = 0
    for i in range(1, len(docs)):
        if docs[i]["close"] == docs[i - 1]["close"]:
            run += 1
            if run > max_run:
                max_run = run
                best_start = run_start
        else:
            run = 1
            run_start = i
    if max_run > 1:
        print(f"  {max_run} consecutive identical closes starting {docs[best_start]['date'].date()} "
              f"(value: {docs[best_start]['close']})")
    else:
        print("  None found.")

    # --- Sanity check: first/last 5 ---
    print(f"\n--- First 5 closes ---")
    for d in docs[:5]:
        print(f"  {d['date'].date()}  {d['close']}")

    print(f"\n--- Last 5 closes ---")
    for d in docs[-5:]:
        print(f"  {d['date'].date()}  {d['close']}")

    print()
    client.close()


if __name__ == "__main__":
    if len(sys.argv) < 2:
        print("Usage: python check_ticker.py <TICKER>")
        sys.exit(1)
    asyncio.run(main(sys.argv[1]))
