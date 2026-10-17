import { useState } from 'react'
import SignIn from './SignIn.jsx'
import SignUp from './SignUp.jsx'
import Dashboard from './Dashboard.jsx'

function App() {
  const [page, setPage] = useState('signin')

  if (page === 'dashboard') return <Dashboard />
  if (page === 'signup') return <SignUp onSignIn={() => setPage('signin')} />
  return <SignIn onSuccess={() => setPage('dashboard')} onSignUp={() => setPage('signup')} />
}

export default App
