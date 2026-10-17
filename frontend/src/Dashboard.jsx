import { useState } from 'react'
import './Dashboard.css'

const DAYS = [
  { dow: 'MON', date: 14, stat: '100%', state: 'past' },
  { dow: 'TUE', date: 15, stat: '100%', state: 'past' },
  { dow: 'WED', date: 16, stat: '6/9 Done', state: 'today' },
  { dow: 'THU', date: 17, stat: '0/8', state: 'future' },
  { dow: 'FRI', date: 18, stat: '0/8', state: 'future' },
  { dow: 'SAT', date: 19, stat: '0/4', state: 'future' },
  { dow: 'SUN', date: 20, stat: '0/3', state: 'future' },
]

// Cell kinds:
//   done      – past day, completed
//   doneToday – today, completed (cut-off stripe)
//   routine   – scheduled repeating routine
//   onetime   – scheduled one-time task
//   pending   – today, awaiting completion (checkbox)
const done = (title, meta) => ({ kind: 'done', title, meta })
const doneToday = (title, meta, extra) => ({ kind: 'doneToday', title, meta, extra })
const routine = (title, meta, icon = true) => ({ kind: 'routine', title, meta, icon })

const ROWS = [
  {
    time: '07:00 AM',
    cells: [
      done('Morning Run 5K', 'Mon-Fri'),
      done('Morning Run 5K', 'Mon-Fri'),
      doneToday('Daily Morning Run', 'Mon-Fri · 45m', 'Done #14'),
      routine('Daily Morning Run', '7:00 - 7:45 AM'),
      routine('Daily Morning Run', '7:00 - 7:45 AM'),
      null,
      null,
    ],
  },
  {
    time: '08:30 AM',
    cells: [
      done('Hydration & Vitamins', 'Routine Daily'),
      done('Hydration & Vitamins', 'Routine Daily'),
      doneToday('Hydration & Vitamins', 'Everyday'),
      routine('Hydration & Vitamins', '8:30 AM · Daily', false),
      routine('Hydration & Vitamins', '8:30 AM · Daily', false),
      routine('Hydration & Vitamins', '8:30 AM · Daily', false),
      routine('Hydration & Vitamins', '8:30 AM · Daily', false),
    ],
  },
  {
    time: '10:00 AM',
    cells: [
      done('Team Rhythm Sync', 'Mon, Wed, Fri'),
      null,
      doneToday('Team Sync · Sprint Review', 'Weekly: Mon, Wed, Fri'),
      { kind: 'onetime', title: 'Design System QA', meta: '10:00 - 11:30 AM' },
      routine('Team Rhythm Sync', '10:00 AM · Weekly'),
      null,
      null,
    ],
  },
  {
    time: '02:30 PM',
    cells: [
      null,
      null,
      { kind: 'pending', title: 'Dentist Appointment', badge: 'tag', meta: '2:30 PM (45m)', note: 'Upcoming', now: true },
      null,
      null,
      null,
      null,
    ],
  },
  {
    time: '04:00 PM',
    cells: [
      null,
      null,
      { kind: 'pending', title: 'Client Proposal Review', badge: 'tag2', meta: '4:00 PM – 5:00 PM', note: 'Apex Dynamics' },
      null,
      null,
      null,
      null,
    ],
  },
  {
    time: '09:00 PM',
    cells: [
      done('Read 30 mins', 'Evening Daily'),
      done('Read 30 mins', 'Evening Daily'),
      { kind: 'pending', title: 'Read 30 mins', badge: 'repeat', meta: 'Tonight 9:00 PM', note: 'Daily Routine', primaryMeta: true },
      routine('Read 30 mins', '9:00 PM · Daily'),
      routine('Read 30 mins', '9:00 PM · Daily'),
      routine('Read 30 mins', '9:00 PM · Daily'),
      routine('Read 30 mins', '9:00 PM · Daily'),
    ],
  },
]

const NAV_VIEWS = ['Month', 'Week', 'Day', 'Agenda']

const FILTERS = [
  { icon: 'calendar_today', label: 'All Activities', active: true },
  { icon: 'repeat', label: 'Repeating Routines' },
  { icon: 'check_circle', label: 'One-time Tasks' },
  { icon: 'history', label: 'Completed History' },
]

const MINI_CAL = [
  ...[29, 30].map((d) => ({ d, out: true })),
  ...Array.from({ length: 31 }, (_, i) => ({ d: i + 1, today: i + 1 === 16 })),
  ...[1, 2].map((d) => ({ d, out: true })),
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

function Chip({ cell }) {
  switch (cell.kind) {
    case 'done':
      return (
        <div className="chip chip-done">
          <span className="chip-title struck">{cell.title}</span>
          <span className="chip-sub muted-outline">{cell.meta}</span>
        </div>
      )
    case 'doneToday':
      return (
        <div className="chip chip-done chip-done-today">
          <div className="cutoff" />
          <div className="row gap-1 rel">
            <span className="check-box">
              <Icon name="check" size={11} />
            </span>
            <span className="chip-title struck">{cell.title}</span>
          </div>
          <div className="row between chip-sub rel">
            <span className="row gap-1 pill-mini">
              <Icon name="repeat" size={11} className="primary" />
              {cell.meta}
            </span>
            {cell.extra && <span className="primary bold">{cell.extra}</span>}
          </div>
        </div>
      )
    case 'routine':
      return (
        <div className="chip chip-routine">
          <div className="row between">
            <span className="chip-title strong">{cell.title}</span>
            {cell.icon && <Icon name="repeat" size={13} className="primary" />}
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
              <input type="checkbox" aria-label={`Complete ${cell.title}`} />
              <span className="chip-title strong dark">{cell.title}</span>
            </div>
            {cell.badge === 'repeat' ? (
              <span className="badge-repeat">
                <Icon name="repeat" size={13} />
              </span>
            ) : (
              <span className={`badge-tag ${cell.badge === 'tag2' ? 'tag2' : ''}`}>One-time</span>
            )}
          </div>
          <div className="row between pending-meta">
            <span className={cell.primaryMeta ? 'primary medium' : ''}>{cell.meta}</span>
            <span
              className={
                cell.note === 'Upcoming'
                  ? 'primary bold small'
                  : cell.note === 'Daily Routine'
                    ? 'badge-note'
                    : 'note'
              }
            >
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

function RowCells({ row, hide }) {
  return (
    <>
      <div className="time-cell">{row.time}</div>
      {row.cells.map((cell, i) => (
        <div key={i} className={`slot bg-${DAYS[i].state}`}>
          {cell?.now && (
            <div className="now-line">
              <span />
              <div />
            </div>
          )}
          {cell && !hide(cell.kind) && <Chip cell={cell} />}
        </div>
      ))}
    </>
  )
}

export default function Dashboard() {
  const [filter, setFilter] = useState('all')
  const [modalOpen, setModalOpen] = useState(false)

  const hide = (kind) =>
    (filter === 'pending' && (kind === 'done' || kind === 'doneToday')) ||
    (filter === 'done' && kind === 'pending')

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
            <button type="button" className="btn-today">Today</button>
            <div className="row nav-arrows">
              <button type="button" className="icon-btn" aria-label="Previous period">
                <Icon name="chevron_left" size={20} />
              </button>
              <button type="button" className="icon-btn" aria-label="Next period">
                <Icon name="chevron_right" size={20} />
              </button>
            </div>
            <span className="headline-sm hide-sm period">October 2024</span>
          </div>
        </div>

        <div className="search hide-lg">
          <Icon name="search" size={18} />
          <input type="search" placeholder="Search activities, tags, schedules..." />
        </div>

        <div className="row gap-md">
          <nav className="view-tabs hide-xl">
            {NAV_VIEWS.map((v) => (
              <a key={v} href="#" onClick={(e) => e.preventDefault()}>
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
              <span className="label-md">October 2024</span>
              <div className="row nav-arrows">
                <Icon name="chevron_left" size={16} className="clickable" />
                <Icon name="chevron_right" size={16} className="clickable" />
              </div>
            </div>
            <div className="grid-7 label-sm dow">
              {['S', 'M', 'T', 'W', 'T', 'F', 'S'].map((d, i) => (
                <span key={i}>{d}</span>
              ))}
            </div>
            <div className="grid-7 days">
              {MINI_CAL.map((c, i) => (
                <span key={i} className={c.out ? 'out' : c.today ? 'is-today' : 'day'}>
                  {c.d}
                </span>
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
              <span className="headline-md">Week 42</span>
              <span className="muted">·</span>
              <span className="body-md-medium muted">Oct 14 – Oct 20, 2024</span>
              <span className="pill pill-grey">High Frequency Track</span>
            </div>
            <div className="row gap-md label-sm muted hide-md-down">
              <div className="row gap-1h"><span className="dot d-primary" /><span>Repeating Routines</span></div>
              <div className="row gap-1h"><span className="dot d-secondary" /><span>One-Time Tasks</span></div>
              <div className="row gap-1h"><span className="dot d-outline" /><span>Completed &amp; Cut-Off</span></div>
            </div>
          </div>

          <div className="calendar-scroll">
            <div className="calendar">
              <div className="col-head tz label-sm muted">GMT-4</div>
              {DAYS.map((d) => (
                <div key={d.date} className={`col-head ${d.state === 'today' ? 'head-today' : ''}`}>
                  {d.state === 'today' ? (
                    <>
                      <span className="label-sm primary bold">TODAY · WED</span>
                      <div className="today-badge">{d.date}</div>
                      <span className="label-sm primary bold mt-half">{d.stat}</span>
                    </>
                  ) : (
                    <>
                      <span className="label-sm muted">{d.dow}</span>
                      <span className="headline-sm">{d.date}</span>
                      <span className={`label-sm ${d.state === 'past' ? 'primary bold' : 'muted'}`}>{d.stat}</span>
                    </>
                  )}
                </div>
              ))}

              {ROWS.map((row) => (
                <RowCells key={row.time} row={row} hide={hide} />
              ))}
            </div>
          </div>

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
