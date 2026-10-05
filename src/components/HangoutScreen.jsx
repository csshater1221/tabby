import { lazy, Suspense, useRef, useState } from 'react'
import { amountsOwed, formatMoney, sumOf } from '../lib/split'
import { shareAsImage } from '../lib/shareImage'
import ShareCard from './ShareCard'

const AddExpenseSheet = lazy(() => import('./AddExpenseSheet'))

export default function HangoutScreen({ hangout, user, saveHangout, goBack, deleteHangout }) {
  const [isAddingExpense, setIsAddingExpense] = useState(false)
  const [showUnpaidOnly, setShowUnpaidOnly] = useState(false)
  const shareCardRef = useRef()

  const owed = amountsOwed(hangout)
  const peopleWhoOwe = hangout.people.filter(person => owed[person.id])
  const peopleOnCard = showUnpaidOnly ? peopleWhoOwe.filter(person => !hangout.paid[person.id]) : peopleWhoOwe
  const hostName = (user.displayName || 'me').split(' ')[0]

  const togglePaid = personId => saveHangout({ ...hangout, paid: { ...hangout.paid, [personId]: !hangout.paid[personId] } })
  const removeExpense = expenseId => saveHangout({ ...hangout, expenses: hangout.expenses.filter(expense => expense.id !== expenseId) })
  const addExpense = expense => {
    saveHangout({ ...hangout, expenses: [...hangout.expenses, expense] })
    setIsAddingExpense(false)
  }

  return (
    <>
      <div className="row">
        <button className="g" onClick={goBack}>Back</button>
        <button className="g" onClick={() => confirm('Delete this hangout?') && deleteHangout()}>Delete</button>
      </div>
      <h1>{hangout.name}</h1>
      <div className="mut">{hangout.date} · {formatMoney(sumOf(hangout.expenses.map(expense => expense.cents)))} total</div>

      <div className="row" style={{ marginTop: 14 }}>
        <h2>Expenses</h2>
        <button className="p s" onClick={() => setIsAddingExpense(true)}>Add expense</button>
      </div>
      {!hangout.expenses.length && <p className="mut">Add what you paid for. Split it equally or by person.</p>}
      {hangout.expenses.map(expense => (
        <div key={expense.id} className="card row">
          <div><b>{expense.title}</b><div className="mut">{Object.keys(expense.split).length} people</div></div>
          <div className="row">
            <b>{formatMoney(expense.cents)}</b>
            <button className="g" aria-label={'Remove ' + expense.title} onClick={() => removeExpense(expense.id)}>×</button>
          </div>
        </div>
      ))}

      <h2 style={{ marginTop: 18 }}>Who owes you</h2>
      <div className="card">
        {peopleWhoOwe.map(person => (
          <div key={person.id} className="row" style={{ padding: '6px 0' }}>
            <span>{person.name}</span>
            <span className="row">
              <b className={hangout.paid[person.id] ? 'paid' : ''}>{formatMoney(owed[person.id])}</b>
              <button className={'s' + (hangout.paid[person.id] ? ' ok' : '')} onClick={() => togglePaid(person.id)}>
                {hangout.paid[person.id] ? 'Paid' : 'Mark paid'}
              </button>
            </span>
          </div>
        ))}
        {!peopleWhoOwe.length && <span className="mut">Nobody owes anything yet.</span>}
      </div>

      {!!peopleWhoOwe.length && (
        <>
          <div className="row">
            <h2>Share</h2>
            <span className="tab" style={{ margin: 0, width: 190 }}>
              <button className={showUnpaidOnly ? '' : 'on'} onClick={() => setShowUnpaidOnly(false)}>Everyone</button>
              <button className={showUnpaidOnly ? 'on' : ''} onClick={() => setShowUnpaidOnly(true)}>Unpaid</button>
            </span>
          </div>
          <ShareCard ref={shareCardRef} hangout={hangout} people={peopleOnCard} owed={owed} hostName={hostName} />
          <button className="k" style={{ width: '100%' }} onClick={() => shareAsImage(shareCardRef.current, hangout.name)}>
            Share image
          </button>
        </>
      )}

      {isAddingExpense && <Suspense fallback={null}><AddExpenseSheet hangout={hangout} onClose={() => setIsAddingExpense(false)} onSave={addExpense} /></Suspense>}
    </>
  )
}
