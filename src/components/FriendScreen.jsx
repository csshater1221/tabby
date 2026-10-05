import { useRef } from 'react'
import { formatMoney, friendStatement, sumOf } from '../lib/split'
import { shareAsImage } from '../lib/shareImage'
import StatementCard from './StatementCard'

export default function FriendScreen({ friend, hangouts, user, saveHangout, goBack }) {
  const statementRef = useRef()
  const rows = friendStatement(hangouts, friend.id)
  const unpaidRows = rows.filter(row => !row.isPaid)
  const hostName = (user.displayName || 'me').split(' ')[0]

  const setPaid = (hangoutId, isPaid) => {
    const hangout = hangouts.find(candidate => candidate.id === hangoutId)
    saveHangout({ ...hangout, paid: { ...hangout.paid, [friend.id]: isPaid } })
  }

  return (
    <>
      <button className="g" onClick={goBack}>Back</button>
      <h1>{friend.name}</h1>
      <div className="hero">
        <span className="mut">Owes you</span>
        <b>{formatMoney(sumOf(unpaidRows.map(row => row.cents)))}</b>
        <span className="mut">across {unpaidRows.length} hangout{unpaidRows.length === 1 ? '' : 's'}</span>
      </div>

      <div className="row">
        <h2>Hangouts</h2>
        {unpaidRows.length > 1 && <button className="s" onClick={() => unpaidRows.forEach(row => setPaid(row.hangoutId, true))}>Mark all paid</button>}
      </div>
      <div className="card">
        {rows.map(row => (
          <div key={row.hangoutId} className="row" style={{ padding: '6px 0' }}>
            <span>{row.name}<div className="mut">{row.date}</div></span>
            <span className="row">
              <b className={row.isPaid ? 'paid' : ''}>{formatMoney(row.cents)}</b>
              <button className={'s' + (row.isPaid ? ' ok' : '')} onClick={() => setPaid(row.hangoutId, !row.isPaid)}>
                {row.isPaid ? 'Paid' : 'Mark paid'}
              </button>
            </span>
          </div>
        ))}
        {!rows.length && <span className="mut">Nothing owed yet.</span>}
      </div>

      {!!unpaidRows.length && (
        <>
          <h2>Send {friend.name} their tab</h2>
          <StatementCard ref={statementRef} friendName={friend.name} hostName={hostName} rows={unpaidRows} />
          <button className="k" style={{ width: '100%' }} onClick={() => shareAsImage(statementRef.current, friend.name + '-tab')}>
            Share image
          </button>
        </>
      )}
    </>
  )
}
