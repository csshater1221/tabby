import { useEffect, useState } from 'react'
import { onAuthStateChanged } from 'firebase/auth'
import { collection, deleteDoc, doc, onSnapshot, setDoc } from 'firebase/firestore'
import { auth, db } from './firebase'
import HangoutScreen from './components/HangoutScreen'
import HomeScreen from './components/HomeScreen'
import LoginScreen from './components/LoginScreen'

export default function App() {
  const [user, setUser] = useState(undefined) // undefined = still checking, null = signed out
  const [hangouts, setHangouts] = useState([])
  const [openHangoutId, setOpenHangoutId] = useState(null)

  useEffect(() => onAuthStateChanged(auth, setUser), [])

  useEffect(() => {
    if (!user) return
    return onSnapshot(collection(db, 'users', user.uid, 'hangouts'), snapshot =>
      setHangouts(
        snapshot.docs
          .map(document => document.data())
          .sort((first, second) => second.date.localeCompare(first.date))
      )
    )
  }, [user])

  if (user === undefined) return null
  if (!user) return <LoginScreen />

  const hangoutDoc = hangoutId => doc(db, 'users', user.uid, 'hangouts', hangoutId)
  const saveHangout = hangout => setDoc(hangoutDoc(hangout.id), hangout)
  const openHangout = hangouts.find(hangout => hangout.id === openHangoutId)

  return (
    <main>
      {openHangout ? (
        <HangoutScreen
          hangout={openHangout}
          user={user}
          saveHangout={saveHangout}
          goBack={() => setOpenHangoutId(null)}
          deleteHangout={() => {
            deleteDoc(hangoutDoc(openHangout.id))
            setOpenHangoutId(null)
          }}
        />
      ) : (
        <HomeScreen hangouts={hangouts} saveHangout={saveHangout} openHangout={setOpenHangoutId} />
      )}
    </main>
  )
}
