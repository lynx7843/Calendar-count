import { describe, expect, it } from 'vitest'
import { completion, dayProgress, pct, streak } from './stats.js'

const NOW = new Date(2026, 10, 11, 12) // Wed noon
const item = (day, hour, done) => ({ start: new Date(2026, 10, day, hour), done })

describe('stats', () => {
  it('counts a day and computes percent', () => {
    const items = [item(11, 8, true), item(11, 18, false), item(10, 8, true)]
    expect(dayProgress(items, NOW)).toEqual({ done: 1, total: 2 })
    expect(pct({ done: 1, total: 3 })).toBe(33)
    expect(pct({ done: 0, total: 0 })).toBe(0)
  })

  it('completion ignores items that have not started', () => {
    expect(completion([item(11, 8, false), item(11, 18, false), item(12, 8, true)], NOW)).toEqual({ done: 0, total: 1 })
  })

  it('streak skips empty days and an unfinished today', () => {
    // 11 unfinished, 10 done, 9 empty, 8 done, 7 missed
    const items = [item(11, 8, false), item(10, 8, true), item(8, 8, true), item(8, 9, true), item(7, 8, false)]
    expect(streak(items, NOW)).toBe(2)
    const finished = [...items, item(11, 7, true)].map((i) => ({ ...i, done: i.start.getDate() !== 7 }))
    expect(streak(finished, NOW)).toBe(3)
    expect(streak([item(10, 8, true), item(10, 9, false)], NOW)).toBe(0)
  })
})
