import { addDays, dateKey } from './calendar.js'

const count = (list) => ({ done: list.filter((i) => i.done).length, total: list.length })
export const pct = ({ done, total }) => (total ? Math.round((done / total) * 100) : 0)

// Done/total for items starting on the same local day as d.
export const dayProgress = (items, d) => count(items.filter((i) => dateKey(i.start) === dateKey(d)))

// Done/total for items that have already started (future ones can't be missed yet).
export const completion = (items, now) => count(items.filter((i) => i.start <= now))

// Fully-done days in a row back from today; empty days don't break it, unfinished today doesn't either.
export function streak(items, now, lookback = 365) {
  const days = new Map()
  for (const i of items) {
    const k = dateKey(i.start)
    days.set(k, (days.get(k) ?? true) && i.done)
  }
  let n = 0
  for (let back = 0; back < lookback; back++) {
    const allDone = days.get(dateKey(addDays(now, -back)))
    if (allDone) n++
    else if (allDone === false && back > 0) break
  }
  return n
}
