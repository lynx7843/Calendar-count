import { useEffect, useState } from 'react'
import { onAuthStateChanged, signOut } from 'firebase/auth'
import { auth } from './auth.js'
import SignIn from './SignIn.jsx'
import SignUp from './SignUp.jsx'
import Dashboard from './Dashboard.jsx'
import Legal from './Legal.jsx'
import Settings from './Settings.jsx'

// Hash routes: '#/settings' -> 'settings', '' -> home.
const route = () => window.location.hash.replace(/^#\/?/, '')

function App() {
  const [user, setUser] = useState(undefined) // undefined = still checking session
  const [page, setPage] = useState(route)
  const go = (p) => {
    window.location.hash = `/${p}`
    setPage(p)
  }

  useEffect(() => onAuthStateChanged(auth, setUser), [])
  useEffect(() => {
    const sync = () => setPage(route())
    window.addEventListener('hashchange', sync)
    return () => window.removeEventListener('hashchange', sync)
  }, [])

  if (user === undefined) return null
  const home = () => go(user ? '' : 'signup')
  if (page === 'terms' || page === 'privacy' || (user && page === 'help')) return <Legal page={page} onBack={home} />
  if (user && page === 'settings') return <Settings onBack={home} />
  if (user) return <Dashboard onSignOut={() => signOut(auth)} />
  if (page === 'signup') return <SignUp onSignIn={() => go('signin')} onLegal={go} />
  return <SignIn onSignUp={() => go('signup')} />
}

export default App
