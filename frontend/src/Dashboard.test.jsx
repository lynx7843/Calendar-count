import { act, cleanup, fireEvent, render, screen } from '@testing-library/react'
import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest'
import { api } from './api.js'
import Dashboard from './Dashboard.jsx'

vi.mock('./api.js', () => ({ api: vi.fn() }))

const NOW = new Date(2026, 10, 11, 9, 30) // Wed Nov 11 2026
const at = (h) => new Date(2026, 10, 11, h).toISOString()
const DATA = {
  '/events': [{ id: 'e1', title: 'Dentist', startTime: at(14), endTime: at(15), type: 'onetime' }],
  '/assignments': [],
  '/tasks': [],
  '/progress': [],
}

const setup = async () => {
  render(<Dashboard onSignOut={() => {}} />)
  await act(() => Promise.resolve())
}
const click = (name) => fireEvent.click(screen.getByRole('button', { name }))
const type = (label, value) => fireEvent.change(screen.getByLabelText(label), { target: { value } })
const flush = () => act(() => Promise.resolve())
// Echoes writes back as saved docs, like the API does.
const echo = (path, opts) => Promise.resolve(opts ? (opts.method === 'DELETE' ? null : { id: 'new', ...opts.body }) : DATA[path])

beforeEach(() => {
  vi.useFakeTimers({ now: NOW, toFake: ['Date'] })
  api.mockReset()
  api.mockImplementation((path, opts) => Promise.resolve(opts ? {} : DATA[path]))
})
afterEach(() => {
  cleanup()
  vi.useRealTimers()
})

describe('calendar', () => {
  it('loads events into the current week', async () => {
    await setup()
    expect(screen.getByText('Dentist')).toBeTruthy()
    expect(screen.getByText('Nov 9 – Nov 15, 2026')).toBeTruthy()
  })

  it('saves completion and can undo', async () => {
    await setup()
    fireEvent.click(screen.getByLabelText('Complete Dentist'))
    await act(() => Promise.resolve())
    expect(api).toHaveBeenCalledWith('/events/e1', { method: 'PATCH', body: { completed: true } })
    click('Mark Dentist incomplete')
    expect(api).toHaveBeenLastCalledWith('/events/e1', { method: 'PATCH', body: { completed: false } })
  })

  it('reverts and shows error when save fails', async () => {
    await setup()
    api.mockRejectedValueOnce(new Error('boom'))
    fireEvent.click(screen.getByLabelText('Complete Dentist'))
    await act(() => Promise.resolve())
    expect(screen.getByRole('alert').textContent).toContain('boom')
    expect(screen.getByLabelText('Complete Dentist')).toBeTruthy()
  })

  it('navigates periods and switches views', async () => {
    await setup()
    click('Next period')
    expect(screen.getByText('Nov 16 – Nov 22, 2026')).toBeTruthy()
    expect(screen.queryByText('Dentist')).toBeNull()
    click('Today')
    fireEvent.click(screen.getByText('Day'))
    expect(screen.getByText('Wednesday, Nov 11, 2026')).toBeTruthy()
    fireEvent.click(screen.getByText('Month'))
    expect(screen.getAllByText('November 2026').length).toBeGreaterThan(0)
    expect(screen.getByText('Dentist')).toBeTruthy()
    fireEvent.click(screen.getByText('Agenda'))
    expect(screen.getByText('Wednesday, Nov 11')).toBeTruthy()
  })

  it('shows load error', async () => {
    api.mockRejectedValue(new Error('offline'))
    await setup()
    expect(screen.getByRole('alert').textContent).toContain('offline')
  })
})

describe('activities', () => {
  beforeEach(() => {
    api.mockImplementation(echo)
    vi.spyOn(window, 'confirm').mockReturnValue(true)
  })

  it('creates a weekly routine with color and tags', async () => {
    await setup()
    click(/Quick Add Activity/)
    type('Activity Name', 'Yoga')
    fireEvent.change(screen.getByLabelText('Date'), { target: { value: '2026-11-09' } })
    type('From', '07:00')
    type('To', '08:00')
    click(/Repeating Routine/)
    click('Weekly')
    ;['Tuesday', 'Thursday', 'Friday'].forEach(click) // leaves Mon + Wed on
    click('Dark')
    type('Tags', '#health, focus')
    click(/Schedule Activity/)
    await flush()
    expect(api).toHaveBeenCalledWith('/events', {
      method: 'POST',
      body: expect.objectContaining({ title: 'Yoga', type: 'routine', frequency: 'weekly', weekdays: [0, 2], color: '#293040', tags: ['health', 'focus'] }),
    })
    expect(screen.queryByRole('dialog')).toBeNull()
    expect(screen.getAllByText('Yoga').length).toBe(2) // Mon 9 and Wed 11
  })

  it('rejects end before start', async () => {
    await setup()
    click(/Quick Add Activity/)
    type('Activity Name', 'X')
    type('From', '10:00')
    type('To', '09:00')
    click(/Schedule Activity/)
    expect(screen.getByRole('alert').textContent).toContain('End time')
    expect(api).toHaveBeenCalledTimes(5) // only the initial loads + profile
  })

  it('edits and deletes an event', async () => {
    await setup()
    click('Edit Dentist')
    type('Activity Name', 'Dentist checkup')
    click(/Save Changes/)
    await flush()
    expect(api).toHaveBeenCalledWith('/events/e1', { method: 'PATCH', body: expect.objectContaining({ title: 'Dentist checkup' }) })
    expect(screen.getByText('Dentist checkup')).toBeTruthy()
    click('Edit Dentist checkup')
    click(/^delete ?Delete$/)
    await flush()
    expect(api).toHaveBeenLastCalledWith('/events/new', { method: 'DELETE' })
    expect(screen.queryByText('Dentist checkup')).toBeNull()
  })

  it('completes one routine day without touching others', async () => {
    const run = { id: 'r1', title: 'Run', startTime: at(7), endTime: at(8), type: 'routine', frequency: 'daily', completedDates: [] }
    api.mockImplementation((path, opts) => (path === '/events' && !opts ? Promise.resolve([run]) : echo(path, opts)))
    await setup()
    fireEvent.click(screen.getAllByLabelText('Complete Run')[0])
    await flush()
    expect(api).toHaveBeenCalledWith('/events/r1', { method: 'PATCH', body: { completedDates: ['2026-11-11'] } })
    expect(screen.queryAllByLabelText('Complete Run')).toHaveLength(0) // Wed done; Thu-Sun are future
  })
})

describe('tasks', () => {
  beforeEach(() => {
    api.mockImplementation(echo)
    vi.spyOn(window, 'confirm').mockReturnValue(true)
  })

  it('creates a task, adds a part and schedules it on the calendar', async () => {
    await setup()
    type('New task title', 'Thesis')
    click('Add task')
    await flush()
    expect(api).toHaveBeenCalledWith('/tasks', { method: 'POST', body: { title: 'Thesis' } })

    type('New part for Thesis', 'Outline')
    click('Add part')
    await flush()
    expect(api).toHaveBeenCalledWith('/tasks/new', { method: 'PATCH', body: { subTasks: [{ title: 'Outline', done: false }] } })
    expect(screen.getByText('0/1 parts done')).toBeTruthy()

    fireEvent.change(screen.getByLabelText('Part'), { target: { value: 'Outline' } })
    type('Day', '2026-11-12')
    type('Hours', '2')
    click('Schedule')
    await flush()
    expect(api).toHaveBeenCalledWith('/assignments', {
      method: 'POST',
      body: { taskId: 'new', part: 'Outline', eventDate: new Date(2026, 10, 12, 9).toISOString(), hoursRequired: 2 },
    })
    expect(screen.getByText('Thesis · Outline')).toBeTruthy()

    fireEvent.click(screen.getByLabelText('Outline'))
    await flush()
    expect(screen.getByText('1/1 parts done')).toBeTruthy()
  })

  it('deleting a task removes its scheduled parts', async () => {
    DATA['/tasks'] = [{ id: 't1', title: 'Thesis', subTasks: [] }]
    DATA['/assignments'] = [{ id: 'a1', taskId: 't1', eventDate: at(16), hoursRequired: 1, status: 'pending' }]
    await setup()
    expect(screen.getByText('Thesis', { selector: '.chip-title' })).toBeTruthy()
    click('Delete Thesis')
    await flush()
    expect(api).toHaveBeenCalledWith('/assignments/a1', { method: 'DELETE' })
    expect(api).toHaveBeenLastCalledWith('/tasks/t1', { method: 'DELETE' })
    expect(screen.queryByText('Thesis')).toBeNull()
    DATA['/tasks'] = []
    DATA['/assignments'] = []
  })

  it('keeps form input when the save fails', async () => {
    await setup()
    api.mockRejectedValueOnce(new Error('offline'))
    type('New task title', 'Thesis')
    click('Add task')
    await flush()
    expect(screen.getByRole('alert').textContent).toContain('offline')
    expect(screen.getByLabelText('New task title').value).toBe('Thesis')
  })
})

describe('progress', () => {
  beforeEach(() => api.mockImplementation(echo))

  it('shows real today, streak, completion and filter counts', async () => {
    const run = { id: 'r1', title: 'Run', type: 'routine', frequency: 'daily', completedDates: ['2026-11-09', '2026-11-10', '2026-11-11'],
      startTime: new Date(2026, 10, 9, 7).toISOString(), endTime: new Date(2026, 10, 9, 8).toISOString() }
    api.mockImplementation((path, opts) => (path === '/events' && !opts ? Promise.resolve([...DATA['/events'], run]) : echo(path, opts)))
    await setup()
    // Today: Run done at 7, Dentist pending at 14; Mon+Tue fully done.
    expect(screen.getByText('Today: 1 of 2 Activities Done')).toBeTruthy()
    expect(screen.getByText('1/2 done')).toBeTruthy()
    expect(screen.getByText('50%')).toBeTruthy()
    expect(screen.getByText('On Track')).toBeTruthy()
    expect(screen.getByText('2', { selector: '.numeric' })).toBeTruthy() // Mon + Tue; unfinished today is skipped
    expect(screen.getByText('30-Day Completion: 100%')).toBeTruthy()
    expect(screen.getByText('1 recurring habit scheduled for tomorrow. Each day of a routine is tracked on its own.')).toBeTruthy()
    expect(screen.getByRole('button', { name: 'Pending (5)' })).toBeTruthy() // Dentist + Run Thu-Sun
    expect(screen.getByRole('button', { name: 'Done (3)' })).toBeTruthy()
  })

  it('logs hours, work done and next steps on a task', async () => {
    DATA['/tasks'] = [{ id: 't1', title: 'Thesis', subTasks: [] }]
    await setup()
    expect(screen.getByText('Progress · 0h logged')).toBeTruthy()
    type('Hours worked', '3')
    type('Work done', 'Drafted intro')
    type('Next steps', 'Find sources')
    click('Log progress')
    await flush()
    expect(api).toHaveBeenCalledWith('/progress', {
      method: 'POST',
      body: { taskId: 't1', date: new Date(2026, 10, 11).toISOString(), hoursWorked: 3, workDone: 'Drafted intro', nextSteps: 'Find sources' },
    })
    expect(screen.getByText('Progress · 3h logged')).toBeTruthy()
    expect(screen.getByText('Next: Find sources', { exact: false })).toBeTruthy()
    DATA['/tasks'] = []
  })
})

describe('navigation and filters', () => {
  const run = { id: 'r1', title: 'Run', type: 'routine', frequency: 'daily', tags: ['health'], completedDates: ['2026-11-10'],
    startTime: new Date(2026, 10, 9, 7).toISOString(), endTime: new Date(2026, 10, 9, 8).toISOString() }
  beforeEach(() => api.mockImplementation((path) => Promise.resolve(path === '/events' ? [...DATA['/events'], run] : DATA[path])))
  const side = (name) => fireEvent.click(screen.getByRole('link', { name: new RegExp(`${name}$`) }))

  it('filters by routine, one-time and completed history', async () => {
    await setup()
    side('Repeating Routines')
    expect(screen.queryByText('Dentist')).toBeNull()
    expect(screen.getAllByText('Run').length).toBe(7)
    side('One-time Tasks')
    expect(screen.getByText('Dentist')).toBeTruthy()
    expect(screen.queryByText('Run')).toBeNull()
    side('Completed History')
    expect(screen.getByText('Last 12 months')).toBeTruthy()
    expect(screen.getAllByText('Run').length).toBe(1) // only Tue 10 is done
    expect(screen.getByText('Tuesday, Nov 10')).toBeTruthy()
  })

  it('searches titles, tags and weekdays', async () => {
    await setup()
    type('Search activities', 'dent')
    expect(screen.getByText('Dentist')).toBeTruthy()
    expect(screen.queryByText('Run')).toBeNull()
    type('Search activities', '#health')
    expect(screen.getAllByText('Run').length).toBe(7)
    type('Search activities', 'friday')
    expect(screen.getAllByText('Run').length).toBe(1)
    expect(screen.getByRole('button', { name: 'Pending (1)' })).toBeTruthy()
  })

  it('opens the saved default view', async () => {
    api.mockImplementation((path) => Promise.resolve(path === '/users/me' ? { preferences: { defaultView: 'Agenda' } } : DATA[path]))
    await setup()
    expect(screen.getByText('Agenda', { selector: '.headline-md' })).toBeTruthy()
  })

  it('links to help and settings', async () => {
    await setup()
    expect(screen.getByRole('link', { name: 'Help' }).getAttribute('href')).toBe('#/help')
    expect(screen.getByRole('link', { name: 'Settings' }).getAttribute('href')).toBe('#/settings')
  })
})
