import { useEffect, useState } from 'react'
import { onAuthStateChanged } from 'firebase/auth'
import { deleteDoc, doc, setDoc } from 'firebase/firestore'
import { auth, db } from './firebase'
import { useOnlineStatus } from './lib/useOnlineStatus'
import { useUserCollection } from './lib/useUserCollection'
import FriendScreen from './components/FriendScreen'
import FriendsScreen from './components/FriendsScreen'
import HangoutScreen from './components/HangoutScreen'
import HomeScreen from './components/HomeScreen'
import LoginScreen from './components/LoginScreen'
import Splash from './components/Splash'

export default function App() {
  const [user, setUser] = useState(undefined) // undefined = still checking, null = signed out
  const [tab, setTab] = useState('hangouts')
  const [openHangoutId, setOpenHangoutId] = useState(null)
  const [openFriendId, setOpenFriendId] = useState(null)
  const isOnline = useOnlineStatus()

  const hangouts = [...useUserCollection(user, 'hangouts')].sort((first, second) => second.date.localeCompare(first.date))
  const friends = [...useUserCollection(user, 'friends')].sort((first, second) => first.name.localeCompare(second.name))

  useEffect(() => onAuthStateChanged(auth, setUser), [])

  if (user === undefined) return <Splash />
  if (!user) return <LoginScreen />

  const userDoc = (collectionName, documentId) => doc(db, 'users', user.uid, collectionName, documentId)
  const saveHangout = hangout => setDoc(userDoc('hangouts', hangout.id), hangout)
  const saveFriend = friend => setDoc(userDoc('friends', friend.id), friend)
  const openHangout = hangouts.find(hangout => hangout.id === openHangoutId)
  const openFriend = friends.find(friend => friend.id === openFriendId)

  let screen
  if (openHangout) {
    screen = (
      <HangoutScreen hangout={openHangout} user={user} saveHangout={saveHangout} goBack={() => setOpenHangoutId(null)}
        deleteHangout={() => { deleteDoc(userDoc('hangouts', openHangout.id)); setOpenHangoutId(null) }} />
    )
  } else if (openFriend) {
    screen = <FriendScreen friend={openFriend} hangouts={hangouts} user={user} saveHangout={saveHangout} goBack={() => setOpenFriendId(null)} />
  } else if (tab === 'friends') {
    screen = <FriendsScreen friends={friends} hangouts={hangouts} saveFriend={saveFriend} openFriend={setOpenFriendId} />
  } else {
    screen = <HomeScreen hangouts={hangouts} friends={friends} saveHangout={saveHangout} saveFriend={saveFriend} openHangout={setOpenHangoutId} />
  }

  return (
    <>
      {!isOnline && <div className="offline">You're offline. Changes will sync when you're back.</div>}
      <main>{screen}</main>
      {!openHangout && !openFriend && (
        <nav className="nav">
          <button className={tab === 'hangouts' ? 'on' : ''} onClick={() => setTab('hangouts')}>Hangouts</button>
          <button className={tab === 'friends' ? 'on' : ''} onClick={() => setTab('friends')}>Friends</button>
        </nav>
      )}
    </>
  )
}
