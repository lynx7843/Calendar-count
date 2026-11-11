import './SignUp.css'

const PAGES = {
  terms: {
    title: 'Terms of Service',
    body: [
      'Calendar-count is provided as is, without warranties of any kind.',
      'You are responsible for the activities and data you add to your account.',
      'Do not use the service for unlawful purposes or to disrupt it for others.',
      'We may update these terms; continued use means you accept the changes.',
    ],
  },
  privacy: {
    title: 'Privacy Policy',
    body: [
      'We store your account email, name and the activities you create.',
      'Sign-in is handled by Firebase Authentication from Google.',
      'Your data is used only to run the app and is never sold.',
      'You can delete your account and profile data at any time.',
    ],
  },
  help: {
    title: 'Help & Documentation',
    body: [
      'Activities: use Create Activity to add a one-time event or a repeating routine (daily, weekly or monthly). Click the pencil on a chip to edit or delete it.',
      'Completion: tick the checkbox on a started activity to mark it done. Routines are tracked per day, so finishing today leaves other days untouched.',
      'Views: switch between Month, Week, Day and Agenda in the top bar; Today and the arrows move between periods.',
      'Filters: the sidebar narrows the calendar to repeating routines or one-time tasks. Completed History lists everything done in the last 12 months.',
      'Search: type in the top bar to match titles, #tags, weekdays, dates or times in the current period.',
      'Tasks: break long-term tasks into parts, schedule a part on a day with the hours it needs, and log progress (hours, work done, next steps).',
      'Settings: set your display name and the calendar view that opens by default.',
    ],
  },
}

export default function Legal({ page, onBack }) {
  const { title, body } = PAGES[page]
  return (
    <main className="signup">
      <div className="signup-wrap">
        <div className="card legal">
          <h1>{title}</h1>
          {body.map((p) => (
            <p key={p}>{p}</p>
          ))}
          <button type="button" className="submit-btn" onClick={onBack}>
            <span>Back</span>
          </button>
        </div>
      </div>
    </main>
  )
}
