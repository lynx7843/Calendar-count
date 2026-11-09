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
}

const setup = async () => {
  render(<Dashboard onSignOut={() => {}} />)
  await act(() => Promise.resolve())
}
const click = (name) => fireEvent.click(screen.getByRole('button', { name }))

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
