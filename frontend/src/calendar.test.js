import { describe, expect, it } from 'vitest'
import { completePatch, monthGrid, periodLabel, periodRange, shift, toItems } from './calendar.js'

const d = (y, m, day) => new Date(y, m - 1, day)

describe('calendar math', () => {
  it('week runs Monday to Monday', () => {
    const [start, end] = periodRange('Week', d(2026, 11, 11)) // Wednesday
    expect([start, end]).toEqual([d(2026, 11, 9), d(2026, 11, 16)])
    expect(periodLabel('Week', d(2026, 11, 11))).toBe('Nov 9 – Nov 15, 2026')
  })

  it('shifts months without overflowing short months', () => {
    expect(shift('Month', d(2026, 1, 31), 1)).toEqual(d(2026, 2, 1))
    expect(shift('Week', d(2026, 12, 28), 1)).toEqual(d(2027, 1, 4))
    expect(shift('Day', d(2026, 3, 1), -1)).toEqual(d(2026, 2, 28))
  })

  it('month grid is whole Mon-Sun weeks', () => {
    const grid = monthGrid(d(2026, 11, 20))
    expect(grid.length % 7).toBe(0)
    expect(grid[0]).toEqual(d(2026, 10, 26))
    expect(grid.at(-1)).toEqual(d(2026, 12, 6))
  })
})

describe('items', () => {
  it('merges events and assignments sorted by start', () => {
    const items = toItems(
      [{ id: 'e1', title: 'Run', startTime: '2026-11-09T12:00:00Z', endTime: '2026-11-09T13:00:00Z', type: 'routine' }],
      [{ id: 'a1', taskId: 't1', eventDate: '2026-11-09T08:00:00Z', hoursRequired: 2, status: 'done' }],
      [{ id: 't1', title: 'Thesis' }],
    )
    expect(items.map((i) => [i.title, i.routine, i.done])).toEqual([['Thesis', false, true], ['Run', true, false]])
    expect(completePatch(items[0], false)).toEqual({ status: 'pending' })
    expect(completePatch(items[1], true)).toEqual({ completed: true })
  })
})
