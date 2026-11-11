// Calendar date math in local time; weeks start on Monday.
export const VIEWS = ['Month', 'Week', 'Day', 'Agenda']
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

export const dateKey = (d) =>
  [d.getFullYear(), d.getMonth() + 1, d.getDate()].map((n) => String(n).padStart(2, '0')).join('-')
const weekday = (d) => (d.getDay() + 6) % 7 // 0 = Monday

// Start times of an event within [start, end); routines repeat from their first day.
export function occurrences(e, start, end) {
  const first = new Date(e.startTime)
  if (e.type !== 'routine') return first >= start && first < end ? [first] : []
  const days = e.weekdays?.length ? e.weekdays : [weekday(first)]
  const rules = {
    daily: () => true,
    weekly: (d) => days.includes(weekday(d)),
    monthly: (d) => d.getDate() === first.getDate(), // skips months without that day
  }
  return daysIn(startOfDay(first > start ? first : start), end)
    .filter(rules[e.frequency] ?? rules.daily)
    .map((d) => new Date(d.getFullYear(), d.getMonth(), d.getDate(), first.getHours(), first.getMinutes()))
}

// Events (expanded) and task assignments in [start, end) as one sorted list.
export function toItems({ events, assignments, tasks }, start, end) {
  const titles = Object.fromEntries(tasks.map((t) => [t.id, t.title]))
  const eventItems = events.flatMap((e) =>
    occurrences(e, start, end).map((s) => {
      const day = dateKey(s)
      const routine = e.type === 'routine'
      return {
        id: e.id, source: 'events', key: `events/${e.id}/${day}`, doc: e, day, title: e.title, start: s,
        end: new Date(s.getTime() + (new Date(e.endTime) - new Date(e.startTime))),
        routine, color: e.color, tags: e.tags ?? [],
        done: routine ? (e.completedDates ?? []).includes(day) : !!e.completed,
      }
    }),
  )
  const assignmentItems = assignments
    .map((a) => {
      const title = titles[a.taskId] ?? 'Task'
      return {
        id: a.id, source: 'assignments', key: `assignments/${a.id}`, doc: a, title: a.part ? `${title} · ${a.part}` : title,
        start: new Date(a.eventDate), hours: a.hoursRequired, routine: false, tags: [], done: a.status === 'done',
      }
    })
    .filter((i) => i.start >= start && i.start < end)
  return [...eventItems, ...assignmentItems].sort((a, b) => a.start - b.start)
}

// Routines track completion per day; everything else has one flag.
export function completePatch(item, done) {
  if (item.source === 'assignments') return { status: done ? 'done' : 'pending' }
  if (!item.routine) return { completed: done }
  const dates = (item.doc.completedDates ?? []).filter((d) => d !== item.day)
  return { completedDates: done ? [...dates, item.day] : dates }
}
