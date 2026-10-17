import { useState } from 'react'
import SignIn from './SignIn.jsx'
import Dashboard from './Dashboard.jsx'

function App() {
  const [signedIn, setSignedIn] = useState(false)

  return signedIn ? <Dashboard /> : <SignIn onSuccess={() => setSignedIn(true)} />
}

export default App
