[![make.fun](https://make.fun/badge/u-gorun-gadget-tiny-bot-easy-2-beat-a48f3ce1.svg)](https://make.fun/bounty/u-gorun-gadget-tiny-bot-easy-2-beat-a48f3ce1)
[![rank](https://make.fun/badge/u-gorun-gadget-tiny-bot-easy-2-beat-a48f3ce1/jekpotnihye/tiny-bot-beat-buy-and-hold-on-solana/rank.svg)](https://make.fun/bounty/u-gorun-gadget-tiny-bot-easy-2-beat-a48f3ce1)
[![reward](https://make.fun/badge/u-gorun-gadget-tiny-bot-easy-2-beat-a48f3ce1/jekpotnihye/tiny-bot-beat-buy-and-hold-on-solana/reward.svg)](https://make.fun/bounty/u-gorun-gadget-tiny-bot-easy-2-beat-a48f3ce1)

# Tiny Bot: Beat Buy-and-Hold on Solana

A tiny paper-trading bot for the make.fun competition
[Tiny Bot, Easy $2: Beat Buy-and-Hold on Solana](https://make.fun/bounty/u-gorun-gadget-tiny-bot-easy-2-beat-a48f3ce1).
It reads hourly bars and decides when to hold crypto and when to sit in
USDC. Paper/simulated trading only: no real funds, no real keys, no
network access.

## Strategy

A simple moving-average crossover, long only, one program (`main.ts`)
speaking the `agent-fun/bars-replay/v1` protocol through the vendored
shim (`vendor/makefun-bars.ts`):

- Enter when the fast SMA (6 bars) crosses above the slow SMA (24 bars)
  and the close is above the close 12 bars back (momentum filter).
- Exit the whole position when the fast SMA crosses back below the slow
  SMA, when the position is 8% below its cost (stop), or 20% above it
  (take profit).
- Stake: equity split over 4 slots, capped at 25% of equity per symbol
  (the harness weight cap) and by available cash. Sells go first in each
  reply, then buys, in universe order. Slippage capped at 100 bps.

See `BUILD.md` for the measured dev grades of every variant tried.

## Run it

The entrypoint is `main.ts` at the repository root; the grader runs it
with Node 22 (`node /bot/main.ts`). To grade locally against the dev
window (from the unpacked kit directory):

```sh
node cli/makefun.mjs grade-local --kit . --bot <repository> --driver process
```

(Docker is the kit's default driver; on a machine without Docker the
`process` driver runs the same harness locally.)

## Dev result (honest, measured)

On the kit's frozen dev window (136 hourly bars, 7 symbols, 10,000 USDC
starting balance), the final bot scored **-215.87 USDC net PnL**
(24 trades, max drawdown 4.33%). That is negative in absolute terms,
but **653.47 USDC above the buy-and-hold baseline (-869.34 USDC)** on
the same window, which is the bar for a placement. The final window is
a different, unseen 3 days, so the dev number is not a promise of any
profit.

## Layout

- `main.ts` — the bot (entrypoint)
- `vendor/makefun-bars.ts` — byte-identical copy of the kit SDK shim
- `.makefun/owner.json` — claim file naming the payout wallet
- `BUILD.md` — build log and measured grades
- `LICENSE` — MIT

## License

MIT. See `LICENSE`.
