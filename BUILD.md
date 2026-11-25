# BUILD.md — Tiny Bot, Easy $2: Beat Buy-and-Hold on Solana

Competition: `u-gorun-gadget-tiny-bot-easy-2-beat-a48f3ce1`
Harness: `agent-fun/bars-replay/v1`, 10,000 USDC starting balance,
7 symbols (FARTCOIN, JITOSOL, POPCAT, RAY, SOL, WETH, WIF), hourly bars.
Dev window: 136 bars (2026-10-29 to 2026-11-04 UTC), all 7 symbols down
over the window, so buy-and-hold loses heavily on it.

Grading: `node cli/makefun.mjs grade-local --kit . --bot <repo> --driver
process` (Docker is unavailable on the build machine, so the `process`
driver was used; it runs the same kit harness and scorer locally).
Net PnL is in USDC (quote units / 1e6). Nothing here claims a profit:
these are measured dev-window numbers only, and the final window is
unseen.

## Baselines (measured on the same dev window, for reference)

| Bot | Net PnL (USDC) | Trades | Max drawdown |
| --- | --- | --- | --- |
| Buy-and-hold (kit baseline) | -869.34 | 7 | 10.92% |
| EMA-cross (kit baseline) | -173.04 | 28 | 2.51% |

## Variants tried

| Version | Change vs previous | Net PnL (USDC) | Trades | Max DD | Fees (USDC) | Kept? |
| --- | --- | --- | --- | --- | --- | --- |
| v1 | SMA(6/24) crossover + 12-bar momentum filter, stop 8%, take-profit 20%, 4 slots | -215.87 | 24 | 4.33% | 69.49 | YES — final |
| Polish 1 | Faster SMA(4/16), momentum 8, stop 6%, take-profit 12%, 3 slots | -529.16 | 31 | 5.84% | 81.65 | No — whipsawed, worst of all |
| Polish 2 | Slower SMA(8/32), momentum 24, stop 10%, take-profit 30%, 4 slots | -300.32 | 15 | 3.38% | 39.23 | No — missed entries (JITOSOL/SOL: 0 trades), held losers longer |
| Polish 3 | v1 params + trailing exit below the fast SMA | -246.33 | 28 | 2.46% | 78.97 | No — cut winners early (POPCAT +57.73 in v1 became -46.59) |

The final build is v1's code, restored verbatim after the polish rounds
(commit history keeps every variant).

## Final build (v1) detail

- Net PnL: **-215.87 USDC** (return -2.16%, Sharpe -0.07 per bar,
  90% bootstrap interval -413.85 to -7.50 USDC, net PnL at 2x fees
  -283.91 USDC).
- Margin over buy-and-hold: **+653.47 USDC** (-215.87 vs -869.34).
- Guardrails: 24 trades (>= 8 required), max drawdown 4.33% (<= 25%
  required), 7 distinct symbols, 0 rejected orders.
- Per-symbol PnL (USDC): FARTCOIN -27.37, JITOSOL -92.41,
  POPCAT +57.73, RAY -69.60, SOL -10.11, WETH -60.00, WIF -14.11.
- Determinism: graded twice on the final commit; both runs produced
  the identical action log
  (`dfbd516e9a6eb6d39e068842d3f1bc8ab0aa350a0933d1576728a41a1b03aa11`)
  and the identical net PnL. The bot reads no clock, environment, or
  randomness.

## Entrypoint

```sh
node /bot/main.ts
```

(`main.ts` at the repository root; Node 22 runs its TypeScript as-is.)
