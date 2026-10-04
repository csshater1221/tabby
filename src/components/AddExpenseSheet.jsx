import { useState } from 'react'
import { dollarsToCents, formatMoney, splitEqually, splitItemized, sumOf } from '../lib/split'
import ReceiptScanner from './ReceiptScanner'

const MODES = [['equal', 'Equal'], ['custom', 'Custom'], ['receipt', 'Receipt']]

export default function AddExpenseSheet({ hangout, onClose, onSave }) {
  const allPersonIds = hangout.people.map(person => person.id)
  const [mode, setMode] = useState('equal')
  const [title, setTitle] = useState('')
  const [amountText, setAmountText] = useState('')
  const [selectedIds, setSelectedIds] = useState(allPersonIds)
  const [customAmounts, setCustomAmounts] = useState({})
  const [receipt, setReceipt] = useState(null)
  const [errorMessage, setErrorMessage] = useState('')

  const toggleSelected = personId =>
    setSelectedIds(current => (current.includes(personId) ? current.filter(id => id !== personId) : [...current, personId]))

  function handleSave() {
    setErrorMessage('')
    let split
    let totalCents

    if (mode === 'equal') {
      totalCents = dollarsToCents(amountText)
      if (!totalCents || !selectedIds.length) return setErrorMessage('Enter an amount and pick at least one person.')
      split = splitEqually(totalCents, selectedIds)
    } else if (mode === 'custom') {
      split = Object.fromEntries(selectedIds.map(personId => [personId, dollarsToCents(customAmounts[personId])]))
      totalCents = sumOf(Object.values(split))
      if (!totalCents) return setErrorMessage('Enter an amount for each person.')
      if (amountText && dollarsToCents(amountText) !== totalCents) {
        return setErrorMessage(`Amounts add up to ${formatMoney(totalCents)}, not ${formatMoney(dollarsToCents(amountText))}.`)
      }
    } else {
      if (!receipt || !receipt.items.length) return setErrorMessage('Scan a receipt or add items first.')
      if (receipt.items.some(item => !item.personIds.length)) return setErrorMessage('Pick who had each item.')
      split = splitItemized(receipt.items, receipt.taxCents, receipt.tipCents, allPersonIds)
      Object.keys(split).forEach(personId => { if (!split[personId]) delete split[personId] })
      totalCents = sumOf(Object.values(split))
    }

    onSave({
      id: crypto.randomUUID(),
      title: title.trim() || (mode === 'receipt' ? 'Receipt' : 'Expense'),
      cents: totalCents,
      split
    })
  }

  return (
    <div className="sheet">
      <main>
        <div className="row">
          <button className="g" onClick={onClose}>Cancel</button>
          <h2>Add expense</h2>
          <span style={{ width: 60 }} />
        </div>

        <div className="tab">
          {MODES.map(([modeKey, label]) => (
            <button key={modeKey} className={mode === modeKey ? 'on' : ''} onClick={() => { setMode(modeKey); setErrorMessage('') }}>
              {label}
            </button>
          ))}
        </div>

        <div className="gap">
          <input placeholder={mode === 'receipt' ? 'Dinner (optional)' : 'Room rental'} value={title} onChange={event => setTitle(event.target.value)} />
          {mode !== 'receipt' && (
            <input inputMode="decimal" placeholder="Amount, e.g. 36.00" value={amountText} onChange={event => setAmountText(event.target.value)} />
          )}
        </div>

        {mode !== 'receipt' && (
          <>
            <h2 style={{ marginTop: 16 }}>Who's in</h2>
            <div className="card">
              {hangout.people.map(person => (
                <div key={person.id} className="row" style={{ padding: '5px 0' }}>
                  <label>
                    <input type="checkbox" style={{ width: 'auto', marginRight: 8 }}
                      checked={selectedIds.includes(person.id)} onChange={() => toggleSelected(person.id)} />
                    {person.name}
                  </label>
                  {mode === 'custom' && selectedIds.includes(person.id) && (
                    <input style={{ width: 90 }} inputMode="decimal" placeholder="0.00" value={customAmounts[person.id] || ''}
                      onChange={event => setCustomAmounts({ ...customAmounts, [person.id]: event.target.value })} />
                  )}
                  {mode === 'equal' && selectedIds.includes(person.id) && dollarsToCents(amountText) > 0 && (
                    <span className="mut">{formatMoney(splitEqually(dollarsToCents(amountText), selectedIds)[person.id])}</span>
                  )}
                </div>
              ))}
            </div>
            {mode === 'custom' && (
              <p className="mut">Total: {formatMoney(sumOf(selectedIds.map(personId => dollarsToCents(customAmounts[personId]))))}</p>
            )}
          </>
        )}

        {mode === 'receipt' && (
          <div style={{ marginTop: 12 }}>
            <ReceiptScanner people={hangout.people} receipt={receipt} onReceiptChange={setReceipt} onError={setErrorMessage} />
          </div>
        )}

        {errorMessage && <div className="warn">{errorMessage}</div>}
        <button className="p" style={{ width: '100%', marginTop: 12 }} onClick={handleSave}>Save expense</button>
      </main>
    </div>
  )
}
