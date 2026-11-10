import { Fragment, useEffect, useState } from 'react'
import { api } from './api.js'
import {
  addDays, completePatch, dateKey, dayLabel, monthGrid, monthLabel, periodLabel, periodRange,
  daysIn, sameDay, shift, startOfDay, timeLabel, toItems,
} from './calendar.js'
import { completion, dayProgress, pct, streak } from './stats.js'
import TasksPanel from './Tasks.jsx'
import './Dashboard.css'

const NAV_VIEWS = ['Month', 'Week', 'Day', 'Agenda']

const FILTERS = [
  { icon: 'calendar_today', label: 'All Activities', active: true },
  { icon: 'repeat', label: 'Repeating Routines' },
  { icon: 'check_circle', label: 'One-time Tasks' },
  { icon: 'history', label: 'Completed History' },
]

const REPEAT_OPTIONS = ['daily', 'weekly', 'monthly']
const WEEKDAYS = ['Monday', 'Tuesday', 'Wednesday', 'Thursday', 'Friday', 'Saturday', 'Sunday']
const COLORS = [
  { label: 'Purple', cls: 'sw-primary', value: '#9141f2' },
  { label: 'Violet', cls: 'sw-secondary', value: '#914af6' },
  { label: 'Grey', cls: 'sw-highest', value: '#dce2f7' },
  { label: 'Dark', cls: 'sw-inverse', value: '#293040' },
]
const SOURCES = ['events', 'assignments', 'tasks', 'progress']
const hhmm = (d) => d.toTimeString().slice(0, 5)

function Icon({ name, size, className = '' }) {
  return (
    <span
      className={`material-symbols-outlined ${className}`}
      style={size ? { fontSize: size } : undefined}
    >
      {name}
    </span>
  )
}

const WEEK_DOW = ['MON', 'TUE', 'WED', 'THU', 'FRI', 'SAT', 'SUN']

// Maps an item to a chip kind relative to now.
function cellFor(item, now) {
  const time = timeLabel(item.start)
  const when = item.end ? `${time} – ${timeLabel(item.end)}` : item.hours ? `${time} · ${item.hours}h` : time
  const meta = [when, ...item.tags.map((t) => `#${t}`)].join(' · ')
  const cell = { title: item.title, meta, routine: item.routine }
  if (item.done) return { ...cell, kind: sameDay(item.start, now) ? 'doneToday' : 'done' }
  if (item.start < addDays(startOfDay(now), 1)) {
    const note = item.start > now ? 'Upcoming' : sameDay(item.start, now) ? '' : 'Missed'
    return { ...cell, kind: 'pending', note }
  }
  return { ...cell, kind: item.routine ? 'routine' : 'onetime' }
}

function Chip({ cell, onToggle }) {
  const undo = (
    <button type="button" className="check-box" aria-label={`Mark ${cell.title} incomplete`} onClick={() => onToggle(false)}>
      <Icon name="check" size={11} />
    </button>
  )
  switch (cell.kind) {
    case 'done':
      return (
        <div className="chip chip-done">
          <div className="row gap-1">
            {undo}
            <span className="chip-title struck">{cell.title}</span>
          </div>
          <span className="chip-sub muted-outline">{cell.meta}</span>
        </div>
      )
    case 'doneToday':
      return (
        <div className="chip chip-done chip-done-today">
          <div className="cutoff" />
          <div className="row gap-1 rel">
            {undo}
            <span className="chip-title struck">{cell.title}</span>
          </div>
          <div className="row between chip-sub rel">
            <span className="row gap-1 pill-mini">
              {cell.routine && <Icon name="repeat" size={11} className="primary" />}
              {cell.meta}
            </span>
          </div>
        </div>
      )
    case 'routine':
      return (
        <div className="chip chip-routine">
          <div className="row between">
            <span className="chip-title strong">{cell.title}</span>
            <Icon name="repeat" size={13} className="primary" />
          </div>
          <span className="chip-sub">{cell.meta}</span>
        </div>
      )
    case 'onetime':
      return (
        <div className="chip chip-onetime">
          <div className="row between">
            <span className="chip-title strong">{cell.title}</span>
            <span className="badge-onetime">One-time</span>
          </div>
          <span className="chip-sub">{cell.meta}</span>
        </div>
      )
    case 'pending':
      return (
        <div className="chip chip-pending">
          <div className="row between top gap-1">
            <div className="row gap-1h grow">
              <input type="checkbox" checked={false} aria-label={`Complete ${cell.title}`} onChange={() => onToggle(true)} />
              <span className="chip-title strong dark">{cell.title}</span>
            </div>
            {cell.routine ? (
              <span className="badge-repeat">
                <Icon name="repeat" size={13} />
              </span>
            ) : (
              <span className="badge-tag">One-time</span>
            )}
          </div>
          <div className="row between pending-meta">
            <span>{cell.meta}</span>
            <span className={cell.note === 'Upcoming' ? 'primary bold small' : 'note'}>
              {cell.note}
            </span>
          </div>
        </div>
      )
    default:
      return null
  }
}

// Create (no event) or edit an event; onSave/onDelete throw on API errors.
function ActivityModal({ event, day, onClose, onSave, onDelete }) {
  const [f, setF] = useState(() => {
    const start = event ? new Date(event.startTime) : new Date(day.getFullYear(), day.getMonth(), day.getDate(), new Date().getHours() + 1)
    const end = event ? new Date(event.endTime) : new Date(start.getTime() + 3600e3)
    return {
      title: event?.title ?? '', date: dateKey(start), start: hhmm(start), end: hhmm(end),
      repeating: event?.type === 'routine', frequency: event?.frequency ?? 'daily', weekdays: event?.weekdays ?? [0, 1, 2, 3, 4],
      color: event?.color || COLORS[0].value, tags: (event?.tags ?? []).map((t) => `#${t}`).join(', '),
    }
  })
  const [error, setError] = useState('')
  const [busy, setBusy] = useState(false)
  const set = (patch) => setF((old) => ({ ...old, ...patch }))
  const toggleDay = (i) => set({ weekdays: f.weekdays.includes(i) ? f.weekdays.filter((d) => d !== i) : [...f.weekdays, i].sort() })

  const run = async (action) => {
    setBusy(true)
    try {
      await action()
      onClose()
    } catch (e) {
      setError(e.message)
      setBusy(false)
    }
  }

  const submit = (e) => {
    e.preventDefault()
    const startTime = new Date(`${f.date}T${f.start}`)
    const endTime = new Date(`${f.date}T${f.end}`)
    if (endTime <= startTime) return setError('End time must be after start time.')
    run(() =>
      onSave({
        title: f.title.trim(), startTime: startTime.toISOString(), endTime: endTime.toISOString(),
        type: f.repeating ? 'routine' : 'onetime', frequency: f.frequency, weekdays: f.weekdays, color: f.color,
        tags: f.tags.split(/[\s,]+/).map((t) => t.replace(/^#/, '')).filter(Boolean),
      }),
    )
  }

  const title = event ? 'Edit Activity' : 'Quick Add Activity'
  return (
    <div className="modal">
      <div className="modal-backdrop" onClick={onClose} />
      <form className="modal-panel" role="dialog" aria-label={title} onSubmit={submit}>
        <div className="col gap-lg">
          <div className="row between">
            <div className="row gap-xs">
              <Icon name={event ? 'edit_calendar' : 'post_add'} size={24} className="primary" />
              <span className="headline-sm">{title}</span>
            </div>
            <button type="button" className="icon-btn round" aria-label="Close" onClick={onClose}>
              <Icon name="close" size={20} />
            </button>
          </div>

          <div className="col gap-md">
            <div className="col gap-xs">
              <span className="label-sm upper">Activity Frequency</span>
              <div className="seg">
                <button type="button" aria-pressed={!f.repeating} className={!f.repeating ? 'seg-on' : ''} onClick={() => set({ repeating: false })}>
                  One-Time
                </button>
                <button
                  type="button"
                  aria-pressed={f.repeating}
                  className={`row center gap-1 ${f.repeating ? 'seg-on' : ''}`}
                  onClick={() => set({ repeating: true })}
                >
                  <Icon name="repeat" size={15} />
                  Repeating Routine
                </button>
              </div>
            </div>

            <label className="col gap-xs">
              <span className="label-sm">Activity Name</span>
              <input
                className="field"
                type="text"
                required
                value={f.title}
                onChange={(e) => set({ title: e.target.value })}
                placeholder="e.g. Core Strength Workout, Review Pitch"
              />
            </label>

            <div className="grid-3 gap-sm">
              <label className="col gap-xs">
                <span className="label-sm">{f.repeating ? 'Starts' : 'Date'}</span>
                <input className="field" type="date" required value={f.date} onChange={(e) => set({ date: e.target.value })} />
              </label>
              <label className="col gap-xs">
                <span className="label-sm">From</span>
                <input className="field" type="time" required value={f.start} onChange={(e) => set({ start: e.target.value })} />
              </label>
              <label className="col gap-xs">
                <span className="label-sm">To</span>
                <input className="field" type="time" required value={f.end} onChange={(e) => set({ end: e.target.value })} />
              </label>
            </div>

            {f.repeating && (
              <div className="col gap-sm repeat-box">
                <span className="label-md">Repeat Rhythm</span>
                <div className="grid-4 label-sm">
                  {REPEAT_OPTIONS.map((o) => (
                    <button
                      key={o}
                      type="button"
                      aria-pressed={f.frequency === o}
                      className={`freq ${f.frequency === o ? 'freq-on' : ''}`}
                      onClick={() => set({ frequency: o })}
                    >
                      {o[0].toUpperCase() + o.slice(1)}
                    </button>
                  ))}
                </div>
                {f.frequency === 'weekly' && (
                  <div className="row between weekdays">
                    {WEEKDAYS.map((w, i) => (
                      <button
                        key={w}
                        type="button"
                        aria-label={w}
                        aria-pressed={f.weekdays.includes(i)}
                        className={`wd ${f.weekdays.includes(i) ? 'wd-on' : ''}`}
                        onClick={() => toggleDay(i)}
                      >
                        {w[0]}
                      </button>
                    ))}
                  </div>
                )}
              </div>
            )}

            <div className="col gap-xs">
              <span className="label-sm">Tag &amp; Color Anchor</span>
              <div className="row gap-sm">
                {COLORS.map((c) => (
                  <button
                    key={c.value}
                    type="button"
                    aria-label={c.label}
                    aria-pressed={f.color === c.value}
                    className={`swatch ${c.cls} ${f.color === c.value ? 'selected' : ''}`}
                    onClick={() => set({ color: c.value })}
                  />
                ))}
                <input
                  className="field small grow"
                  type="text"
                  aria-label="Tags"
                  value={f.tags}
                  onChange={(e) => set({ tags: e.target.value })}
                  placeholder="Tag: #health, #work, #focus"
                />
              </div>
            </div>
            {error && <p className="cal-error" role="alert">{error}</p>}
          </div>
        </div>

        <div className="row gap-sm modal-footer">
          {event ? (
            <button
              type="button"
              className="btn btn-soft grow"
              disabled={busy}
              onClick={() => window.confirm(`Delete "${event.title}"${event.type === 'routine' ? ' and every repeat' : ''}?`) && run(onDelete)}
            >
              <Icon name="delete" size={16} />
              <span>Delete</span>
            </button>
          ) : (
            <button type="button" className="btn btn-soft grow" onClick={onClose}>
              Cancel
            </button>
          )}
          <button type="submit" className="btn btn-primary grow" disabled={busy}>
            <Icon name="check" size={16} />
            <span>{event ? 'Save Changes' : 'Schedule Activity'}</span>
          </button>
        </div>
      </form>
    </div>
  )
}

function dayStat(items, d, now) {
  const s = dayProgress(items, d)
  if (!s.total) return ''
  if (sameDay(d, now)) return `${s.done}/${s.total} Done`
  return d < now ? `${pct(s)}%` : `${s.done}/${s.total}`
}

// Week and Day views: one row per hour that has items.
function TimeGrid({ days, items, now, renderItem }) {
  const state = (d) => (sameDay(d, now) ? 'today' : d < now ? 'past' : 'future')
  const showsToday = days.some((d) => sameDay(d, now))
  const hours = [...new Set([...items.map((i) => i.start.getHours()), ...(showsToday ? [now.getHours()] : [])])]
  hours.sort((a, b) => a - b)
  const tz = now.toLocaleTimeString('en-US', { timeZoneName: 'short' }).split(' ').pop()

  return (
    <div className="calendar" style={{ gridTemplateColumns: `80px repeat(${days.length}, 1fr)`, minWidth: days.length > 1 ? undefined : 0 }}>
      <div className="col-head tz label-sm muted">{tz}</div>
      {days.map((d) => {
        const dow = WEEK_DOW[(d.getDay() + 6) % 7]
        const stat = dayStat(items, d, now)
        return (
          <div key={d.getTime()} className={`col-head ${state(d) === 'today' ? 'head-today' : ''}`}>
            {state(d) === 'today' ? (
              <>
                <span className="label-sm primary bold">TODAY · {dow}</span>
                <div className="today-badge">{d.getDate()}</div>
                <span className="label-sm primary bold mt-half">{stat}</span>
              </>
            ) : (
              <>
                <span className="label-sm muted">{dow}</span>
                <span className="headline-sm">{d.getDate()}</span>
                <span className={`label-sm ${state(d) === 'past' ? 'primary bold' : 'muted'}`}>{stat}</span>
              </>
            )}
          </div>
        )
      })}
      {hours.map((h) => (
        <Fragment key={h}>
          <div className="time-cell">{timeLabel(new Date(2000, 0, 1, h))}</div>
          {days.map((d) => (
            <div key={d.getTime()} className={`slot bg-${state(d)}`}>
              {sameDay(d, now) && h === now.getHours() && (
                <div className="now-line">
                  <span />
                  <div />
                </div>
              )}
              {items.filter((i) => sameDay(i.start, d) && i.start.getHours() === h).map(renderItem)}
            </div>
          ))}
        </Fragment>
      ))}
    </div>
  )
}

function MonthView({ cursor, items, now, renderItem }) {
  return (
    <div className="month">
      {WEEK_DOW.map((d) => (
        <div key={d} className="col-head label-sm muted">{d}</div>
      ))}
      {monthGrid(cursor).map((d) => (
        <div key={d.getTime()} className={`month-cell ${d.getMonth() === cursor.getMonth() ? '' : 'out'}`}>
          <span className={sameDay(d, now) ? 'today-badge' : 'label-md'}>{d.getDate()}</span>
          {items.filter((i) => sameDay(i.start, d)).map(renderItem)}
        </div>
      ))}
    </div>
  )
}

function AgendaView({ items, renderItem }) {
  const days = [...new Map(items.map((i) => [startOfDay(i.start).getTime(), startOfDay(i.start)])).values()]
  return (
    <div className="agenda">
      {days.map((d) => (
        <section key={d.getTime()} className="col gap-xs">
          <span className="label-md">{dayLabel(d)}</span>
          {items.filter((i) => sameDay(i.start, d)).map(renderItem)}
        </section>
      ))}
    </div>
  )
}

export default function Dashboard({ onSignOut }) {
  const [filter, setFilter] = useState('all')
  const [modal, setModal] = useState(null) // null, {} to create, { event } to edit
  const [view, setView] = useState('Week')
  const [cursor, setCursor] = useState(() => new Date())
  const [data, setData] = useState({ events: [], assignments: [], tasks: [], progress: [] })
  const [error, setError] = useState('')
  const now = new Date()

  useEffect(() => {
    // shortcut: loads all docs once and filters client-side, add range queries when data grows
    Promise.all(SOURCES.map((s) => api(`/${s}`)))
      .then(([events, assignments, tasks, progress]) => setData({ events, assignments, tasks, progress }))
      .catch((e) => setError(`Couldn't load your calendar: ${e.message}`))
  }, [])

  // Local doc cache: replace in place or append; drop by id.
  const put = (source, doc) =>
    setData((d) => {
      const i = d[source].findIndex((x) => x.id === doc.id)
      return { ...d, [source]: i < 0 ? [...d[source], doc] : d[source].with(i, doc) }
    })
  const drop = (source, id) => setData((d) => ({ ...d, [source]: d[source].filter((x) => x.id !== id) }))
  const remove = async (source, id) => {
    await api(`/${source}/${id}`, { method: 'DELETE' })
    drop(source, id)
  }
  // Runs an API action, surfaces errors; resolves true on success.
  const attempt = (fn) =>
    fn().then(
      () => true,
      (e) => {
        setError(e.message)
        return false
      },
    )

  // Optimistic update, reverted if the save fails.
  const patch = async (source, doc, changes, label = doc.title) => {
    put(source, { ...doc, ...changes })
    try {
      await api(`/${source}/${doc.id}`, { method: 'PATCH', body: changes })
      return true
    } catch (e) {
      put(source, doc)
      setError(`Couldn't save "${label}": ${e.message}`)
      return false
    }
  }

  const saveEvent = async (body) => {
    const { event } = modal
    put('events', await api(event ? `/events/${event.id}` : '/events', { method: event ? 'PATCH' : 'POST', body }))
  }

  const tasks = {
    onCreate: ({ title, dueDate }) =>
      attempt(async () =>
        put('tasks', await api('/tasks', { method: 'POST', body: { title, ...(dueDate && { dueDate: new Date(`${dueDate}T00:00`).toISOString() }) } })),
      ),
    onPatch: (task, changes) => patch('tasks', task, changes),
    // Deletes the task's scheduled parts and progress log first so no orphans remain.
    onDelete: (task) =>
      attempt(async () => {
        const owned = ['assignments', 'progress'].flatMap((s) => data[s].filter((d) => d.taskId === task.id).map((d) => remove(s, d.id)))
        await Promise.all(owned)
        await remove('tasks', task.id)
      }),
    onLog: (task, f) =>
      attempt(async () => {
        const body = { taskId: task.id, date: new Date(`${f.date}T00:00`).toISOString(), hoursWorked: Number(f.hours), workDone: f.workDone, nextSteps: f.nextSteps }
        put('progress', await api('/progress', { method: 'POST', body }))
      }),
    onSchedule: (task, f) =>
      attempt(async () => {
        const body = { taskId: task.id, part: f.part, eventDate: new Date(`${f.date}T${f.time}`).toISOString(), hoursRequired: Number(f.hours) }
        put('assignments', await api('/assignments', { method: 'POST', body }))
      }),
  }

  const hide = (kind) =>
    (filter === 'pending' && (kind === 'done' || kind === 'doneToday')) ||
    (filter === 'done' && kind === 'pending')

  const [start, end] = periodRange(view, cursor)
  const visible = toItems(data, start, end)
  const renderItem = (item) => {
    const cell = cellFor(item, now)
    if (hide(cell.kind)) return null
    const isEvent = item.source === 'events'
    return (
      <div key={item.key} className="chip-wrap" style={item.color ? { '--chip-color': item.color } : undefined}>
        <Chip cell={cell} onToggle={(v) => patch(item.source, item.doc, completePatch(item, v), item.title)} />
        <button
          type="button"
          className="chip-edit"
          aria-label={isEvent ? `Edit ${item.title}` : `Unschedule ${item.title}`}
          onClick={() => (isEvent ? setModal({ event: item.doc }) : attempt(() => remove('assignments', item.id)))}
        >
          <Icon name={isEvent ? 'edit' : 'event_busy'} size={12} />
        </button>
      </div>
    )
  }
  const viewProps = { items: visible, now, renderItem }

  const shown = { done: visible.filter((i) => i.done).length, total: visible.length }
  const filterButtons = [
    { id: 'all', label: 'All Activities' },
    { id: 'pending', label: `Pending (${shown.total - shown.done})` },
    { id: 'done', label: `Done (${shown.done})` },
  ]

  // shortcut: re-expands a year of items each render, memoize if it gets slow
  const today = startOfDay(now)
  const history = toItems(data, addDays(today, -365), addDays(today, 1))
  const todayStats = dayProgress(history, now)
  const todayPct = pct(todayStats)
  const missedToday = history.some((i) => sameDay(i.start, now) && i.start < now && !i.done)
  const streakDays = streak(history, now)
  const month = completion(history.filter((i) => i.start >= addDays(today, -29)), now)
  const tomorrowRoutines = toItems(data, addDays(today, 1), addDays(today, 2)).filter((i) => i.routine).length
  const insights = [
    {
      icon: 'inventory_2',
      title: 'Non-destructive Completed State',
      text: 'Finished routines fade and show a strikethrough cut-off instead of disappearing, preserving your full historical rhythm without visual clutter.',
    },
    {
      icon: 'published_with_changes',
      title: 'Auto-Roll Routine Engine',
      text: `${tomorrowRoutines} recurring ${tomorrowRoutines === 1 ? 'habit' : 'habits'} scheduled for tomorrow. Each day of a routine is tracked on its own.`,
    },
    {
      icon: 'military_tech',
      title: `30-Day Completion: ${pct(month)}%`,
      text: `${month.done} of ${month.total} activities that have started in the last 30 days are done.`,
    },
  ]

  return (
    <div className="dash">
      <header className="topbar">
        <div className="row gap-md">
          <div className="row gap-xs">
            <span className="headline-sm brand">Calendar-count</span>
            <span className="brand-dot" />
          </div>
          <div className="vdivider hide-md" />
          <div className="row gap-xs">
            <button type="button" className="btn-today" onClick={() => setCursor(new Date())}>Today</button>
            <div className="row nav-arrows">
              <button type="button" className="icon-btn" aria-label="Previous period" onClick={() => setCursor(shift(view, cursor, -1))}>
                <Icon name="chevron_left" size={20} />
              </button>
              <button type="button" className="icon-btn" aria-label="Next period" onClick={() => setCursor(shift(view, cursor, 1))}>
                <Icon name="chevron_right" size={20} />
              </button>
            </div>
            <span className="headline-sm hide-sm period">{monthLabel(cursor)}</span>
          </div>
        </div>

        <div className="search hide-lg">
          <Icon name="search" size={18} />
          <input type="search" placeholder="Search activities, tags, schedules..." />
        </div>

        <div className="row gap-md">
          <nav className="view-tabs hide-xl">
            {NAV_VIEWS.map((v) => (
              <a
                key={v}
                href="#"
                className={view === v ? 'on' : ''}
                aria-current={view === v ? 'page' : undefined}
                onClick={(e) => {
                  e.preventDefault()
                  setView(v)
                }}
              >
                {v}
              </a>
            ))}
          </nav>
          <div className="row gap-xs">
            <button type="button" className="icon-btn pad" title="Help & documentation" aria-label="Help">
              <Icon name="help" size={20} />
            </button>
            <button type="button" className="icon-btn pad" title="Settings" aria-label="Settings">
              <Icon name="settings" size={20} />
            </button>
            <button type="button" className="icon-btn pad" title="Sign out" aria-label="Sign out" onClick={onSignOut}>
              <Icon name="logout" size={20} />
            </button>
            <div className="avatar">
              <Icon name="person" size={18} />
            </div>
          </div>
        </div>
      </header>

      <aside className="sidebar">
        <div className="col gap-md">
          <button type="button" className="btn btn-primary full" onClick={() => setModal({})}>
            <Icon name="add" size={18} />
            <span>Create Activity</span>
          </button>

          <div className="mini-cal">
            <div className="row between mini-head">
              <span className="label-md">{monthLabel(cursor)}</span>
              <div className="row nav-arrows">
                <button type="button" className="icon-btn" aria-label="Previous month" onClick={() => setCursor(shift('Month', cursor, -1))}>
                  <Icon name="chevron_left" size={16} />
                </button>
                <button type="button" className="icon-btn" aria-label="Next month" onClick={() => setCursor(shift('Month', cursor, 1))}>
                  <Icon name="chevron_right" size={16} />
                </button>
              </div>
            </div>
            <div className="grid-7 label-sm dow">
              {['M', 'T', 'W', 'T', 'F', 'S', 'S'].map((d, i) => (
                <span key={i}>{d}</span>
              ))}
            </div>
            <div className="grid-7 days">
              {monthGrid(cursor).map((d) => (
                <button
                  key={d.getTime()}
                  type="button"
                  aria-label={dayLabel(d)}
                  className={sameDay(d, now) ? 'is-today' : d.getMonth() === cursor.getMonth() ? 'day' : 'out'}
                  onClick={() => setCursor(d)}
                >
                  {d.getDate()}
                </button>
              ))}
            </div>
          </div>

          <div className="col gap-xs">
            <span className="label-sm upper pad-x">Filters</span>
            <nav className="col side-nav">
              {FILTERS.map((f) => (
                <a
                  key={f.label}
                  href="#"
                  className={f.active ? 'on' : ''}
                  aria-current={f.active ? 'page' : undefined}
                  onClick={(e) => e.preventDefault()}
                >
                  <Icon name={f.icon} size={18} />
                  <span>{f.label}</span>
                </a>
              ))}
            </nav>
          </div>
        </div>

        <div className="rhythm col gap-xs">
          <div className="row between">
            <span className="label-md">Daily Rhythm</span>
            <span className="label-sm primary bold">{todayStats.done}/{todayStats.total} done</span>
          </div>
          <div className="bar">
            <div style={{ width: `${todayPct}%` }} />
          </div>
          <span className="body-sm muted">{todayStats.total ? `${todayPct}% completed for today` : 'Nothing scheduled today'}</span>
        </div>
      </aside>

      <main className="main">
        <section className="summary">
          <div className="row gap-lg wrap">
            <div className="card row gap-md">
              <div className="ring">
                <svg viewBox="0 0 36 36">
                  <path
                    className="ring-bg"
                    d="M18 2.0845 a 15.9155 15.9155 0 0 1 0 31.831 a 15.9155 15.9155 0 0 1 0 -31.831"
                  />
                  <path
                    className="ring-fg"
                    strokeDasharray={`${todayPct}, 100`}
                    d="M18 2.0845 a 15.9155 15.9155 0 0 1 0 31.831 a 15.9155 15.9155 0 0 1 0 -31.831"
                  />
                </svg>
                <span className="ring-label">{todayPct}%</span>
              </div>
              <div className="col">
                <div className="row gap-xs">
                  <span className="headline-sm">Today: {todayStats.done} of {todayStats.total} Activities Done</span>
                  <span className="pill">{missedToday ? 'Catch Up' : 'On Track'}</span>
                </div>
                <div className="bar bar-wide">
                  <div style={{ width: `${todayPct}%` }} />
                </div>
              </div>
            </div>

            <div className="card row gap-md">
              <div className="flame">
                <Icon name="local_fire_department" size={22} />
              </div>
              <div className="col">
                <span className="label-sm upper muted">Consistency Rhythm</span>
                <div className="row gap-xs baseline">
                  <span className="numeric">{streakDays}</span>
                  <span className="body-md-medium muted">{streakDays === 1 ? 'Day' : 'Days'} Streak</span>
                </div>
              </div>
            </div>
          </div>

          <div className="row gap-sm controls">
            <div className="seg-filter">
              {filterButtons.map((b) => (
                <button
                  key={b.id}
                  type="button"
                  className={filter === b.id ? 'on' : ''}
                  onClick={() => setFilter(b.id)}
                >
                  {b.label}
                </button>
              ))}
            </div>
            <button type="button" className="btn btn-primary" onClick={() => setModal({})}>
              <Icon name="add_task" size={18} />
              <span>+ Quick Add Activity</span>
            </button>
          </div>
        </section>

        <div className="workspace">
          <div className="row between wrap gap-md">
            <div className="row gap-sm">
              <span className="headline-md">{view}</span>
              <span className="muted">·</span>
              <span className="body-md-medium muted">{periodLabel(view, cursor)}</span>
            </div>
            <div className="row gap-md label-sm muted hide-md-down">
              <div className="row gap-1h"><span className="dot d-primary" /><span>Repeating Routines</span></div>
              <div className="row gap-1h"><span className="dot d-secondary" /><span>One-Time Tasks</span></div>
              <div className="row gap-1h"><span className="dot d-outline" /><span>Completed &amp; Cut-Off</span></div>
            </div>
          </div>

          {error && <p className="cal-error" role="alert">{error}</p>}
          {view === 'Month' ? (
            <MonthView cursor={cursor} {...viewProps} />
          ) : view === 'Agenda' ? (
            <AgendaView {...viewProps} />
          ) : (
            <div className="calendar-scroll">
              <TimeGrid days={view === 'Day' ? [startOfDay(cursor)] : daysIn(start, end)} {...viewProps} />
            </div>
          )}
          {!visible.length && !error && <p className="body-sm muted">No activities in this period.</p>}

          <TasksPanel tasks={data.tasks} progress={data.progress} {...tasks} />

          <div className="insights">
            {insights.map((i) => (
              <div key={i.title} className="card row gap-sm start">
                <span className="material-symbols-outlined insight-icon">{i.icon}</span>
                <div className="col">
                  <span className="label-md">{i.title}</span>
                  <p className="body-sm muted">{i.text}</p>
                </div>
              </div>
            ))}
          </div>
        </div>
      </main>

      {modal && (
        <ActivityModal
          event={modal.event}
          day={cursor}
          onClose={() => setModal(null)}
          onSave={saveEvent}
          onDelete={() => remove('events', modal.event.id)}
        />
      )}
    </div>
  )
}
