import AddFriendInput from './AddFriendInput'

export default function FriendPicker({ friends, selectedIds, onToggle, saveFriend }) {
  function addFriend(name) {
    const friend = { id: crypto.randomUUID(), name }
    saveFriend(friend)
    onToggle(friend.id)
  }

  return (
    <div>
      {!friends.length && <p className="mut">Add the friends you hang out with. They're saved for next time.</p>}
      {friends.map(friend => (
        <label key={friend.id} className="row" style={{ justifyContent: 'flex-start', padding: '5px 0' }}>
          <input type="checkbox" style={{ width: 'auto' }} checked={selectedIds.includes(friend.id)} onChange={() => onToggle(friend.id)} />
          {friend.name}
        </label>
      ))}
      <AddFriendInput onAdd={addFriend} />
    </div>
  )
}
