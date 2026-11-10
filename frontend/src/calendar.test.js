import { describe, expect, it } from 'vitest'
import { completePatch, dateKey, monthGrid, occurrences, periodLabel, periodRange, shift, toItems } from './calendar.js'

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
  const week = periodRange('Week', d(2026, 11, 11)) // Nov 9-15
  const routine = (extra) => ({ id: 'r', title: 'Run', startTime: new Date(2026, 10, 3, 7).toISOString(), endTime: new Date(2026, 10, 3, 8).toISOString(), type: 'routine', ...extra })
  const days = (e) => occurrences(e, ...week).map((x) => x.getDate())

  it('merges events and assignments sorted by start', () => {
    const items = toItems({
      events: [{ id: 'e1', title: 'Gym', startTime: '2026-11-09T12:00:00Z', endTime: '2026-11-09T13:00:00Z' }],
      assignments: [{ id: 'a1', taskId: 't1', part: 'Outline', eventDate: '2026-11-09T08:00:00Z', hoursRequired: 2, status: 'done' }],
      tasks: [{ id: 't1', title: 'Thesis' }],
    }, ...week)
    expect(items.map((i) => [i.title, i.done])).toEqual([['Thesis · Outline', true], ['Gym', false]])
    expect(completePatch(items[0], false)).toEqual({ status: 'pending' })
    expect(completePatch(items[1], true)).toEqual({ completed: true })
  })

  it('expands routines by frequency', () => {
    expect(days(routine({ frequency: 'daily' }))).toEqual([9, 10, 11, 12, 13, 14, 15])
    expect(days(routine({ frequency: 'weekly', weekdays: [0, 4] }))).toEqual([9, 13])
    expect(days(routine({ frequency: 'weekly' }))).toEqual([10]) // Nov 3 is a Tuesday
    expect(days(routine({ frequency: 'monthly', startTime: new Date(2026, 10, 12, 7).toISOString(), endTime: new Date(2026, 10, 12, 8).toISOString() }))).toEqual([12])
    expect(days(routine({ startTime: new Date(2026, 10, 14, 7).toISOString(), endTime: new Date(2026, 10, 14, 8).toISOString() }))).toEqual([14, 15])
  })

  it('tracks routine completion per day', () => {
    const [mon, tue] = toItems({ events: [routine({ completedDates: ['2026-11-09'] })], assignments: [], tasks: [] }, ...week)
    expect([mon.done, tue.done, tue.end.getHours()]).toEqual([true, false, 8])
    expect(completePatch(tue, true)).toEqual({ completedDates: ['2026-11-09', '2026-11-10'] })
    expect(completePatch(mon, false)).toEqual({ completedDates: [] })
    expect(dateKey(d(2026, 1, 5))).toBe('2026-01-05')
  })
})
