import { GoogleAuthProvider, signInWithPopup } from 'firebase/auth'
import { auth } from '../firebase'
import Logo from './Logo'

export default function LoginScreen() {
  return (
    <main>
      <h1><Logo />Tabby</h1>
      <p>Keep track of who owes you after a hangout.</p>
      <button className="p" onClick={() => signInWithPopup(auth, new GoogleAuthProvider())}>
        Sign in with Google
      </button>
    </main>
  )
}
