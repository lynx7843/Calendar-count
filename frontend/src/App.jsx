import { useEffect, useState } from 'react'
import { onAuthStateChanged, signOut } from 'firebase/auth'
import { auth } from './auth.js'
import SignIn from './SignIn.jsx'
import SignUp from './SignUp.jsx'
import Dashboard from './Dashboard.jsx'
import Legal from './Legal.jsx'

function App() {
  const [user, setUser] = useState(undefined) // undefined = still checking session
  const [page, setPage] = useState('signin')

  useEffect(() => onAuthStateChanged(auth, setUser), [])

  if (user === undefined) return null
  if (page === 'terms' || page === 'privacy') return <Legal page={page} onBack={() => setPage('signup')} />
  if (user) return <Dashboard onSignOut={() => signOut(auth)} />
  if (page === 'signup') return <SignUp onSignIn={() => setPage('signin')} onLegal={setPage} />
  return <SignIn onSignUp={() => setPage('signup')} />
}

export default App
