import { useState } from 'react'

export default function AddFriendInput({ onAdd }) {
  const [name, setName] = useState('')

  function submit() {
    if (!name.trim()) return
    onAdd(name.trim())
    setName('')
  }

  return (
    <div className="row" style={{ marginTop: 8 }}>
      <input placeholder="Add a friend" value={name} onChange={event => setName(event.target.value)}
        onKeyDown={event => event.key === 'Enter' && submit()} />
      <button className="s" onClick={submit}>Add</button>
    </div>
  )
}
