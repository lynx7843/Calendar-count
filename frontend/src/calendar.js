// Calendar date math in local time; weeks start on Monday.
export const startOfDay = (d) => new Date(d.getFullYear(), d.getMonth(), d.getDate())
export const addDays = (d, n) => new Date(d.getFullYear(), d.getMonth(), d.getDate() + n)
export const sameDay = (a, b) => startOfDay(a).getTime() === startOfDay(b).getTime()
const startOfWeek = (d) => addDays(d, -((d.getDay() + 6) % 7))

// Returns [start, end) of the visible period.
export function periodRange(view, cursor) {
  if (view === 'Day') return [startOfDay(cursor), addDays(cursor, 1)]
  if (view === 'Week') return [startOfWeek(cursor), addDays(startOfWeek(cursor), 7)]
  return [new Date(cursor.getFullYear(), cursor.getMonth(), 1), new Date(cursor.getFullYear(), cursor.getMonth() + 1, 1)]
}

export function shift(view, cursor, dir) {
  if (view === 'Day') return addDays(cursor, dir)
  if (view === 'Week') return addDays(cursor, 7 * dir)
  return new Date(cursor.getFullYear(), cursor.getMonth() + dir, 1)
}

export function daysIn(start, end) {
  const days = []
  for (let d = start; d < end; d = addDays(d, 1)) days.push(d)
  return days
}

// Whole Mon-Sun weeks covering the cursor's month.
export function monthGrid(cursor) {
  const [start, end] = periodRange('Month', cursor)
  const days = daysIn(startOfWeek(start), end)
  while (days.length % 7) days.push(addDays(days.at(-1), 1))
  return days
}

const fmt = (d, opts) => d.toLocaleDateString('en-US', opts)
export const monthLabel = (d) => fmt(d, { month: 'long', year: 'numeric' })
export const dayLabel = (d) => fmt(d, { weekday: 'long', month: 'short', day: 'numeric' })
export const timeLabel = (d) => d.toLocaleTimeString('en-US', { hour: 'numeric', minute: '2-digit' })

export function periodLabel(view, cursor) {
  if (view === 'Day') return `${dayLabel(cursor)}, ${cursor.getFullYear()}`
  if (view !== 'Week') return monthLabel(cursor)
  const [start, end] = periodRange(view, cursor)
  const short = { month: 'short', day: 'numeric' }
  return `${fmt(start, short)} – ${fmt(addDays(end, -1), { ...short, year: 'numeric' })}`
}

// Events and task assignments as one sorted list of calendar items.
export function toItems(events, assignments, tasks) {
  const titles = Object.fromEntries(tasks.map((t) => [t.id, t.title]))
  return [
    ...events.map((e) => ({
      id: e.id, source: 'events', title: e.title, start: new Date(e.startTime), end: new Date(e.endTime),
      routine: e.type === 'routine', done: !!e.completed,
    })),
    ...assignments.map((a) => ({
      id: a.id, source: 'assignments', title: titles[a.taskId] ?? 'Task', start: new Date(a.eventDate),
      hours: a.hoursRequired, routine: false, done: a.status === 'done',
    })),
  ].sort((a, b) => a.start - b.start)
}

export const completePatch = (item, done) =>
  item.source === 'events' ? { completed: done } : { status: done ? 'done' : 'pending' }
