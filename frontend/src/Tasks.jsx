// Handlers resolve true on success; forms reset only then, so input survives errors.
const onForm = (handler) => async (e) => {
  e.preventDefault()
  const form = e.currentTarget
  if (await handler(Object.fromEntries(new FormData(form)))) form.reset()
}

function TaskCard({ task, onPatch, onDelete, onSchedule }) {
  const parts = task.subTasks ?? []
  const done = parts.filter((p) => p.done).length
  const setParts = (list) => onPatch(task, { subTasks: list })

  return (
    <div className="card col gap-xs">
      <div className="row between gap-sm">
        <div className="col">
          <span className="label-md">{task.title}</span>
          <span className="label-sm muted">
            {parts.length ? `${done}/${parts.length} parts done` : 'No parts yet'}
            {task.dueDate && ` · due ${new Date(task.dueDate).toLocaleDateString('en-US', { month: 'short', day: 'numeric' })}`}
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
