import { dateKey } from './calendar.js'

// Handlers resolve true on success; forms reset only then, so input survives errors.
const onForm = (handler) => async (e) => {
  e.preventDefault()
  const form = e.currentTarget
  if (await handler(Object.fromEntries(new FormData(form)))) form.reset()
}

const shortDate = (d) => new Date(d).toLocaleDateString('en-US', { month: 'short', day: 'numeric' })

function ProgressLog({ task, entries, onLog }) {
  const hours = entries.reduce((sum, p) => sum + p.hoursWorked, 0)
  return (
    <details className="col gap-xs">
      <summary className="label-sm semibold">Progress · {hours}h logged</summary>
      {entries.slice(0, 3).map((p) => (
        <p key={p.id} className="body-sm">
          <span className="semibold">{shortDate(p.date)} · {p.hoursWorked}h</span> {p.workDone}
          {p.nextSteps && <span className="muted"> Next: {p.nextSteps}</span>}
        </p>
      ))}
      <form className="col gap-xs" onSubmit={onForm((f) => onLog(task, f))} aria-label={`Log progress for ${task.title}`}>
        <div className="row gap-xs">
          <input className="field small" name="date" type="date" required defaultValue={dateKey(new Date())} aria-label="Worked on" />
          <input className="field small" name="hours" type="number" min="0" step="1" defaultValue="1" required aria-label="Hours worked" />
        </div>
        <input className="field small" name="workDone" required placeholder="What did you get done?" aria-label="Work done" />
        <input className="field small" name="nextSteps" placeholder="Next steps (optional)" aria-label="Next steps" />
        <button type="submit" className="btn btn-soft">Log progress</button>
      </form>
    </details>
  )
}

function TaskCard({ task, progress, onPatch, onDelete, onSchedule, onLog }) {
  const parts = task.subTasks ?? []
  const entries = progress.filter((p) => p.taskId === task.id).sort((a, b) => new Date(b.date) - new Date(a.date))
  const done = parts.filter((p) => p.done).length
  const setParts = (list) => onPatch(task, { subTasks: list })

  return (
    <div className="card col gap-xs">
      <div className="row between gap-sm">
        <div className="col">
          <span className="label-md">{task.title}</span>
          <span className="label-sm muted">
            {parts.length ? `${done}/${parts.length} parts done` : 'No parts yet'}
            {task.dueDate && ` · due ${shortDate(task.dueDate)}`}
          </span>
        </div>
        <button
          type="button"
          className="icon-btn"
          aria-label={`Delete ${task.title}`}
          onClick={() => window.confirm(`Delete "${task.title}" and its scheduled parts?`) && onDelete(task)}
        >
          <span className="material-symbols-outlined">delete</span>
        </button>
      </div>

      {parts.map((p, i) => (
        <label key={i} className="row gap-1h body-sm">
          <input type="checkbox" checked={p.done} onChange={() => setParts(parts.with(i, { ...p, done: !p.done }))} />
          <span className={p.done ? 'struck' : ''}>{p.title}</span>
        </label>
      ))}

      <form className="row gap-xs" onSubmit={onForm(({ title }) => setParts([...parts, { title, done: false }]))}>
        <input className="field small grow" name="title" required placeholder="Break into a part…" aria-label={`New part for ${task.title}`} />
        <button type="submit" className="btn btn-soft">Add part</button>
      </form>

      <form className="row gap-xs wrap" onSubmit={onForm((f) => onSchedule(task, f))} aria-label={`Schedule ${task.title}`}>
        <select className="field small" name="part" aria-label="Part">
          <option value="">Whole task</option>
          {parts.filter((p) => !p.done).map((p, i) => (
            <option key={i}>{p.title}</option>
          ))}
        </select>
        <input className="field small" name="date" type="date" required aria-label="Day" />
        <input className="field small" name="time" type="time" required defaultValue="09:00" aria-label="Start time" />
        <input className="field small" name="hours" type="number" min="1" step="1" defaultValue="1" required aria-label="Hours" />
        <button type="submit" className="btn btn-soft">Schedule</button>
      </form>

      <ProgressLog task={task} entries={entries} onLog={onLog} />
    </div>
  )
}

export default function TasksPanel({ tasks, onCreate, ...handlers }) {
  return (
    <section className="col gap-sm" aria-label="Tasks">
      <div className="row between wrap gap-sm">
        <span className="headline-sm">Long-term Tasks</span>
        <form className="row gap-xs wrap" onSubmit={onForm(onCreate)}>
          <input className="field small" name="title" required placeholder="New task" aria-label="New task title" />
          <input className="field small" name="dueDate" type="date" aria-label="Due date" />
          <button type="submit" className="btn btn-primary">Add task</button>
        </form>
      </div>
      {!tasks.length && <p className="body-sm muted">No tasks yet. Add one, break it into parts, then schedule parts onto days.</p>}
      <div className="task-grid">
        {tasks.map((t) => (
          <TaskCard key={t.id} task={t} {...handlers} />
        ))}
      </div>
    </section>
  )
}
