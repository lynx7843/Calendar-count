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
