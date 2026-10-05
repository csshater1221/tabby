import { formatMoney, friendOutstandingCents } from '../lib/split'
import AddFriendInput from './AddFriendInput'

export default function FriendsScreen({ friends, hangouts, saveFriend, openFriend }) {
  const addFriend = name => saveFriend({ id: crypto.randomUUID(), name })

  return (
    <>
      <h1>Friends</h1>
      <p className="mut">Tap a friend to see what they owe across every hangout.</p>
      <AddFriendInput onAdd={addFriend} />
      {friends.map(friend => {
        const owedCents = friendOutstandingCents(hangouts, friend.id)
        return (
          <div key={friend.id} className="card row" role="button" tabIndex={0}
            onClick={() => openFriend(friend.id)} onKeyDown={event => event.key === 'Enter' && openFriend(friend.id)}>
            <b>{friend.name}</b>
            <span className={'pill' + (owedCents ? '' : ' ok')}>{owedCents ? formatMoney(owedCents) + ' owed' : 'All paid'}</span>
          </div>
        )
      })}
    </>
  )
}
