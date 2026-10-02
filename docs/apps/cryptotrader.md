# /cryptotrader (Algo Crypto)

Hosted demo for project key `lit_crypto` (repo `jckail/crypto_trader`). Synthetic, client-side, no network calls.

## What the real repository is (verified from its README and source)

- Archived; commits Dec 2017 to May 2018; Python 3.6 / Anaconda, Pandas, boto3.
- `alpha/`: multithreaded collectors (`mt_alpha_runner.py`) for CryptoCompare (prices, minute/hour/day history, trade pairs, social stats, mining equipment), CoinMarketCap, Alpha Vantage (currency lists, exchange rates) and Quandl (LBMA, LME, CME code lists). Data is written locally as gzipped JSON, saved to an S3 bucket, then an AWS Glue crawler catalogs it so Athena can query it (`omega/athenaqueires/join_query.sql` joins LBMA gold with BTC/ETH/BCH/LTC daily prices).
- `omega/`: scikit-learn regression experiments; the README says the ML part is unfinished and unpublished.
- The repo contains no trading strategy and no Flask or SageMaker code (the portfolio blurb mentions both; the demo copy does not repeat that).
- The repo has hard-coded API keys in source. Never copy anything from it; the demo uses none.

## What the demo is

An educational illustration, not the original algorithm. `logic.ts` has a seeded mulberry32 PRNG, three synthetic markets (crypto-, NASDAQ-, commodity-like random walks with slowly varying drift), SMA crossover and momentum rules, and a long/flat backtest. Signals decided at a close trade the next day (no look-ahead); fees are charged per position change. Output: stats, three SVG charts (price and signals, equity, drawdown), a monthly data table and a trade log.

## Files

`frontend/src/app/labs/cryptotrader/` (lab.tsx, cryptotrader.css, logic.ts, tests), `backend/app/data/labs/cryptotrader.json`, `e2e/tests/cryptotrader.spec.ts`.
