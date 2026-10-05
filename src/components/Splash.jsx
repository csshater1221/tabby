import Logo from './Logo'

// Shown while Firebase checks who's signed in, so the screen is never blank.
export default function Splash() {
  return <div className="splash"><Logo size={64} /></div>
}
