import { Fragment, useEffect, useState } from 'react'
import { api } from './api.js'
import {
  addDays, completePatch, dayLabel, monthGrid, monthLabel, periodLabel, periodRange,
  daysIn, sameDay, shift, startOfDay, timeLabel, toItems,
} from './calendar.js'
import './Dashboard.css'

const NAV_VIEWS = ['Month', 'Week', 'Day', 'Agenda']

const FILTERS = [
  { icon: 'calendar_today', label: 'All Activities', active: true },
  { icon: 'repeat', label: 'Repeating Routines' },
  { icon: 'check_circle', label: 'One-time Tasks' },
  { icon: 'history', label: 'Completed History' },
]

const INSIGHTS = [
  {
    icon: 'inventory_2',
    title: 'Non-destructive Completed State',
    text: 'Finished routines fade and show a strikethrough cut-off instead of disappearing, preserving your full historical rhythm without visual clutter.',
  },
  {
    icon: 'published_with_changes',
    title: 'Auto-Roll Routine Engine',
    text: '5 recurring habits auto-populated for tomorrow. Missed activities do not break your streak if marked completed before midnight.',
  },
  {
    icon: 'military_tech',
    title: 'Milestone Count: 250 Total',
    text: 'Only 3 more activities needed today to cross the 250 lifetime completed items milestone badge.',
  },
]

const REPEAT_OPTIONS = ['Daily', 'Weekly', 'Monthly', 'Custom']
const WEEKDAYS = [
  { l: 'M', on: true },
  { l: 'T', on: true },
  { l: 'W', on: true },
  { l: 'T', on: true },
  { l: 'F', on: true },
  { l: 'S', on: false },
  { l: 'S', on: false },
]

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
  const meta = item.end ? `${time} – ${timeLabel(item.end)}` : item.hours ? `${time} · ${item.hours}h` : time
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

function QuickAddModal({ onClose }) {
  const [repeating, setRepeating] = useState(false)
  const [freq, setFreq] = useState('Daily')

  return (
    <div className="modal">
      <div className="modal-backdrop" onClick={onClose} />
      <div className="modal-panel" role="dialog" aria-label="Quick Add Activity">
        <div className="col gap-lg">
          <div className="row between">
            <div className="row gap-xs">
              <Icon name="post_add" size={24} className="primary" />
              <span className="headline-sm">Quick Add Activity</span>
            </div>
            <button type="button" className="icon-btn round" aria-label="Close" onClick={onClose}>
              <Icon name="close" size={20} />
            </button>
          </div>

          <div className="col gap-md">
            <div className="col gap-xs">
              <label className="label-sm upper">Activity Frequency</label>
              <div className="seg">
                <button
                  type="button"
                  className={!repeating ? 'seg-on' : ''}
                  onClick={() => setRepeating(false)}
                >
                  One-Time
                </button>
                <button
                  type="button"
                  className={`row center gap-1 ${repeating ? 'seg-on' : ''}`}
                  onClick={() => setRepeating(true)}
                >
                  <Icon name="repeat" size={15} />
                  Repeating Routine
                </button>
              </div>
            </div>

            <div className="col gap-xs">
              <label className="label-sm">Activity Name</label>
              <input
                className="field"
                type="text"
                placeholder="e.g. Core Strength Workout, Review Pitch"
              />
            </div>

            <div className="grid-2 gap-sm">
              <div className="col gap-xs">
                <label className="label-sm">Date</label>
                <input className="field" type="date" defaultValue="2024-10-16" />
              </div>
              <div className="col gap-xs">
                <label className="label-sm">Time</label>
                <input className="field" type="time" defaultValue="14:30" />
              </div>
            </div>

            {repeating && (
              <div className="col gap-sm repeat-box">
                <div className="row between">
                  <span className="label-md">Repeat Rhythm</span>
                  <span className="label-sm primary semibold">Active Engine</span>
                </div>
                <div className="grid-4 label-sm">
                  {REPEAT_OPTIONS.map((o) => (
                    <button
                      key={o}
                      type="button"
                      className={`freq ${freq === o ? 'freq-on' : ''}`}
                      onClick={() => setFreq(o)}
                    >
                      {o}
                    </button>
                  ))}
                </div>
                <div className="row between weekdays">
                  {WEEKDAYS.map((w, i) => (
                    <button key={i} type="button" className={`wd ${w.on ? 'wd-on' : ''}`}>
                      {w.l}
                    </button>
                  ))}
                </div>
              </div>
            )}

            <div className="col gap-xs">
              <label className="label-sm">Tag &amp; Color Anchor</label>
              <div className="row gap-sm">
                <button type="button" className="swatch sw-primary selected" aria-label="Purple" />
                <button type="button" className="swatch sw-secondary" aria-label="Violet" />
                <button type="button" className="swatch sw-highest" aria-label="Grey" />
                <button type="button" className="swatch sw-inverse" aria-label="Dark" />
                <input className="field small grow" type="text" placeholder="Tag: #health, #work, #focus" />
              </div>
            </div>
          </div>
        </div>

        <div className="row gap-sm modal-footer">
          <button type="button" className="btn btn-soft grow" onClick={onClose}>
            Cancel
          </button>
          <button type="button" className="btn btn-primary grow" onClick={onClose}>
            <Icon name="check" size={16} />
            <span>Schedule Activity</span>
          </button>
        </div>
      </div>
    </div>
  )
}

function dayStat(items, d, now) {
  const list = items.filter((i) => sameDay(i.start, d))
  const done = list.filter((i) => i.done).length
  if (!list.length) return ''
  if (sameDay(d, now)) return `${done}/${list.length} Done`
  return d < now ? `${Math.round((done / list.length) * 100)}%` : `${done}/${list.length}`
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
  const [modalOpen, setModalOpen] = useState(false)
  const [view, setView] = useState('Week')
  const [cursor, setCursor] = useState(() => new Date())
  const [items, setItems] = useState([])
  const [error, setError] = useState('')
  const now = new Date()

  useEffect(() => {
    // shortcut: loads all docs once and filters client-side, add range queries when data grows
    Promise.all(['/events', '/assignments', '/tasks'].map((p) => api(p)))
      .then(([events, assignments, tasks]) => setItems(toItems(events, assignments, tasks)))
      .catch((e) => setError(`Couldn't load your calendar: ${e.message}`))
  }, [])

  // Optimistic update, reverted if the save fails.
  const toggle = async (item, done) => {
    const set = (v) =>
      setItems((list) => list.map((i) => (i.id === item.id && i.source === item.source ? { ...i, done: v } : i)))
    set(done)
    try {
      await api(`/${item.source}/${item.id}`, { method: 'PATCH', body: completePatch(item, done) })
    } catch (e) {
      set(!done)
      setError(`Couldn't save "${item.title}": ${e.message}`)
    }
  }

  const hide = (kind) =>
    (filter === 'pending' && (kind === 'done' || kind === 'doneToday')) ||
    (filter === 'done' && kind === 'pending')

  const [start, end] = periodRange(view, cursor)
  const visible = items.filter((i) => i.start >= start && i.start < end)
  const renderItem = (item) => {
    const cell = cellFor(item, now)
    return hide(cell.kind) ? null : <Chip key={`${item.source}/${item.id}`} cell={cell} onToggle={(v) => toggle(item, v)} />
  }
  const viewProps = { items: visible, now, renderItem }

  const filterButtons = [
    { id: 'all', label: 'All Activities' },
    { id: 'pending', label: 'Pending (3)' },
    { id: 'done', label: 'Done (6)' },
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
          <button type="button" className="btn btn-primary full" onClick={() => setModalOpen(true)}>
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
            <span className="label-sm primary bold">12/15 done</span>
          </div>
          <div className="bar">
            <div style={{ width: '80%' }} />
          </div>
          <span className="body-sm muted">80% completed for today</span>
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
                    strokeDasharray="67, 100"
                    d="M18 2.0845 a 15.9155 15.9155 0 0 1 0 31.831 a 15.9155 15.9155 0 0 1 0 -31.831"
                  />
                </svg>
                <span className="ring-label">67%</span>
              </div>
              <div className="col">
                <div className="row gap-xs">
                  <span className="headline-sm">Today: 6 of 9 Activities Done</span>
                  <span className="pill">On Track</span>
                </div>
                <div className="bar bar-wide">
                  <div style={{ width: '67%' }} />
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
                  <span className="numeric">14</span>
                  <span className="body-md-medium muted">Days Streak</span>
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
            <button type="button" className="btn btn-primary" onClick={() => setModalOpen(true)}>
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

          <div className="insights">
            {INSIGHTS.map((i) => (
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

      {modalOpen && <QuickAddModal onClose={() => setModalOpen(false)} />}
    </div>
  )
}
