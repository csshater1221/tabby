import { formatMoney, sumOf } from '../lib/split'

// This is the card that gets exported as an image.
export default function ShareCard({ hangout, people, owed, hostName, ref }) {
  const stillOwedCents = sumOf(people.filter(person => !hangout.paid[person.id]).map(person => owed[person.id]))
  return (
    <div className="xcard" ref={ref}>
      <b style={{ fontSize: 18 }}>{hangout.name}</b>
      <div className="mut" style={{ marginBottom: 8 }}>{hangout.date} · pay {hostName}</div>
      {people.map(person => (
        <div key={person.id} className="row">
          <span style={{ flex: 1 }}>{person.name}</span>
          <span>{formatMoney(owed[person.id])}</span>
          <span style={{ width: 56, textAlign: 'right', color: hangout.paid[person.id] ? '#5FD9B3' : '#FFB48A' }}>
            {hangout.paid[person.id] ? 'Paid' : 'Owes'}
          </span>
        </div>
      ))}
      <div className="mut" style={{ marginTop: 8 }}>Still owed: {formatMoney(stillOwedCents)} · made with Tabby</div>
    </div>
  )
}
