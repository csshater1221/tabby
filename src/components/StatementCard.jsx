import { formatMoney, sumOf } from '../lib/split'

// The per-friend card that gets exported as an image: every hangout they still owe for.
export default function StatementCard({ friendName, hostName, rows, ref }) {
  return (
    <div className="xcard" ref={ref}>
      <b style={{ fontSize: 18 }}>{friendName}, here's your tab</b>
      <div className="mut" style={{ marginBottom: 8 }}>Pay {hostName}</div>
      {rows.map(row => (
        <div key={row.hangoutId} className="row">
          <span style={{ flex: 1 }}>{row.name} <span className="mut">{row.date}</span></span>
          <span>{formatMoney(row.cents)}</span>
        </div>
      ))}
      <div className="row"><b>Total owed</b><b>{formatMoney(sumOf(rows.map(row => row.cents)))}</b></div>
      <div className="mut" style={{ marginTop: 8 }}>made with Tabby</div>
    </div>
  )
}
