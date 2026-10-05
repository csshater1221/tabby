import { useState } from 'react'
import { signOut } from 'firebase/auth'
import { auth } from '../firebase'
import { formatMoney, outstandingCents, sumOf } from '../lib/split'
import FriendPicker from './FriendPicker'
import Logo from './Logo'

export default function HomeScreen({ hangouts, friends, saveHangout, saveFriend, openHangout }) {
  const [isFormOpen, setIsFormOpen] = useState(false)
  const [hangoutName, setHangoutName] = useState('')
  const [selectedFriendIds, setSelectedFriendIds] = useState([])
  const totalOwed = sumOf(hangouts.map(outstandingCents))

  const toggleFriend = friendId =>
    setSelectedFriendIds(current => (current.includes(friendId) ? current.filter(id => id !== friendId) : [...current, friendId]))

  function createHangout() {
    const people = friends
      .filter(friend => selectedFriendIds.includes(friend.id))
      .map(friend => ({ id: friend.id, name: friend.name }))
    if (!hangoutName.trim() || !people.length) return

    const hangout = {
      id: crypto.randomUUID(),
      name: hangoutName.trim(),
      date: new Date().toISOString().slice(0, 10),
      people,
      paid: {},
      expenses: []
    }
    saveHangout(hangout)
    openHangout(hangout.id)
  }

  return (
    <>
      <div className="row">
        <h1><Logo />Tabby</h1>
        <button className="g" onClick={() => signOut(auth)}>Sign out</button>
      </div>
      <div className="hero"><span className="mut">You're owed</span><b>{formatMoney(totalOwed)}</b></div>

      <div className="row">
        <h2>Hangouts</h2>
        <button className="p s" onClick={() => setIsFormOpen(!isFormOpen)}>New hangout</button>
      </div>

      {isFormOpen && (
        <div className="card gap">
          <input placeholder="Karaoke night" value={hangoutName} onChange={event => setHangoutName(event.target.value)} />
          <b>Who came?</b>
          <FriendPicker friends={friends} selectedIds={selectedFriendIds} onToggle={toggleFriend} saveFriend={saveFriend} />
          <button className="p" onClick={createHangout}>Create hangout</button>
        </div>
      )}
      {!hangouts.length && !isFormOpen && <p className="mut">Start your first hangout, then add expenses as you pay.</p>}

      {hangouts.map(hangout => {
        const owedCents = outstandingCents(hangout)
        return (
          <div key={hangout.id} className="card" role="button" tabIndex={0}
            onClick={() => openHangout(hangout.id)}
            onKeyDown={event => event.key === 'Enter' && openHangout(hangout.id)}>
            <div className="row">
              <b>{hangout.name}</b>
              <span className={'pill' + (owedCents ? '' : ' ok')}>{owedCents ? formatMoney(owedCents) + ' owed' : 'Settled'}</span>
            </div>
            <div className="mut">
              {hangout.date} · {hangout.people.length} people · {formatMoney(sumOf(hangout.expenses.map(expense => expense.cents)))} total
            </div>
          </div>
        )
      })}
    </>
  )
}
