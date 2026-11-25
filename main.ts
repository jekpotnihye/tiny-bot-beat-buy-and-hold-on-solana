// Tiny trend bot for agent-fun/bars-replay/v1: a simple moving-average
// crossover, long only, paper trading on hourly bars. The harness sends one
// hello line, then one batch per bar, and this bot answers each batch with
// its orders for that bar (filled at the next bar's open). It never reads
// the clock, the environment, or any randomness, so two runs on the same
// bars produce the same orders.
//
// Rules, per symbol, over that symbol's own closes:
//   - Enter when the fast SMA crosses above the slow SMA and the trailing
//     momentum window is up (the close is above the close MOM bars back).
//   - Exit the whole position when the fast SMA crosses back below the
//     slow SMA, when the position has fallen STOP below its cost, or when
//     it has risen ROI above its cost (take profit).
//   - Stake: equity split over SLOTS slots, capped by the harness weight
//     cap (25% of equity per symbol) and by the cash left in this reply.
//   - Sells go first in each reply, then buys, in universe order, at most
//     the harness order cap. Slippage is capped at 100 bps past the close
//     the order was decided on, so a gap move is refused and retried on
//     the next bar while the signal still holds.
// Volume is deliberately not read: the dev window's bars carry no volume.

import { BPS, runBars, type BarsState, type BuyInput, type SellInput } from './vendor/makefun-bars.ts';

const FAST_BARS = 4;
const SLOW_BARS = 16;
const MOM_BARS = 8;
const STOP_NUM = 94n;
const STOP_DEN = 100n;
const ROI_NUM = 112n;
const ROI_DEN = 100n;
const SLOTS = 3;
const MAX_SLIPPAGE_BPS = 100;

interface Series {
  closes: number[];
  prevGap: number | null;
}

const series = new Map<string, Series>();

function sma(values: number[], span: number): number | null {
  if (values.length < span) return null;
  let sum = 0;
  for (let i = values.length - span; i < values.length; i++) sum += values[i];
  return sum / span;
}

await runBars({
  onBatch(state: BarsState, batch) {
    const crossUp = new Set<string>();
    const crossDown = new Set<string>();
    for (const bar of batch.bars) {
      let s = series.get(bar.symbol);
      if (s === undefined) {
        s = { closes: [], prevGap: null };
        series.set(bar.symbol, s);
      }
      s.closes.push(Number(bar.c));
      const fast = sma(s.closes, FAST_BARS);
      const slow = sma(s.closes, SLOW_BARS);
      if (fast === null || slow === null) continue;
      const gap = fast - slow;
      if (s.prevGap !== null) {
        if (gap > 0 && s.prevGap <= 0) crossUp.add(bar.symbol);
        if (gap < 0 && s.prevGap >= 0) crossDown.add(bar.symbol);
      }
      s.prevGap = gap;
    }
    if (state.warmingUp) return [];

    const { caps, fees } = state.hello;
    const sells: SellInput[] = [];
    const entries: string[] = [];
    for (const { symbol } of state.hello.symbols) {
      const s = series.get(symbol);
      if (s === undefined) continue;
      const held = state.positions.get(symbol);
      if (held !== undefined) {
        const value = state.value(symbol, held.qty);
        const stopped = value * STOP_DEN <= held.cost * STOP_NUM;
        const taken = value * ROI_DEN >= held.cost * ROI_NUM;
        if (crossDown.has(symbol) || stopped || taken) {
          sells.push({ side: 'sell', symbol, qty: held.qty, max_slippage_bps: MAX_SLIPPAGE_BPS });
        }
      } else if (crossUp.has(symbol)) {
        const back = s.closes[s.closes.length - 1 - MOM_BARS];
        const now = s.closes[s.closes.length - 1];
        if (back !== undefined && now > back) entries.push(symbol);
      }
    }

    const orders: (SellInput | BuyInput)[] = sells.slice(0, caps.max_orders_per_bar);
    const slots = Math.min(SLOTS, caps.max_open_positions);
    const stake = state.equity / BigInt(slots);
    const byWeight = (BigInt(caps.max_weight_bps) * state.equity) / BPS;
    let room = slots - state.positions.size;
    let cash = state.cash;
    for (const symbol of entries) {
      if (room <= 0 || orders.length >= caps.max_orders_per_bar) break;
      let slice = stake < byWeight ? stake : byWeight;
      if (cash < slice) slice = cash;
      if (slice === 0n || slice < BigInt(fees.min_notional_quote_units)) break;
      orders.push({ side: 'buy', symbol, notional_quote_units: slice, max_slippage_bps: MAX_SLIPPAGE_BPS });
      cash -= slice;
      room--;
    }
    return orders;
  },
});
