import { useState } from 'react'
import { scanReceipt } from '../firebase'
import { dollarsToCents, formatMoney, sumOf } from '../lib/split'

const initialsOf = name => name.slice(0, 2).toUpperCase()
const EMPTY_RECEIPT = { items: [], subtotalCents: 0, taxCents: 0, tipCents: 0 }

// receipt looks like { items: [{ name, cents, personIds }], subtotalCents, taxCents, tipCents }
export default function ReceiptScanner({ people, receipt, onReceiptChange, onError }) {
  const [isScanning, setIsScanning] = useState(false)

  async function scanFile(imageFile) {
    if (!imageFile) return
    setIsScanning(true)
    onError('')
    try {
      const scanned = await scanReceipt(imageFile)
      onReceiptChange({
        items: scanned.items.map(item => ({ name: item.name, cents: item.cents, personIds: [] })),
        subtotalCents: scanned.subtotalCents || 0,
        taxCents: scanned.taxCents || 0,
        tipCents: scanned.tipCents || 0
      })
    } catch {
      onError("Couldn't read that receipt. Retake the photo, or add the items yourself.")
      onReceiptChange(EMPTY_RECEIPT)
    }
    setIsScanning(false)
  }

  const updateItem = (itemIndex, changes) =>
    onReceiptChange({
      ...receipt,
      items: receipt.items.map((item, index) => (index === itemIndex ? { ...item, ...changes } : item))
    })

  const toggleItemPerson = (itemIndex, personId) => {
    const { personIds } = receipt.items[itemIndex]
    updateItem(itemIndex, {
      personIds: personIds.includes(personId) ? personIds.filter(id => id !== personId) : [...personIds, personId]
    })
  }

  if (!receipt) {
    return (
      <div className="card gap" style={{ textAlign: 'center' }}>
        <b>{isScanning ? 'Reading your receipt…' : 'Add your receipt'}</b>
        {!isScanning && (
          <>
            <label className="lb p">Take a photo
              <input type="file" accept="image/*" capture="environment" hidden onChange={event => scanFile(event.target.files[0])} />
            </label>
            <label className="lb">Upload a screenshot or photo
              <input type="file" accept="image/*" hidden onChange={event => scanFile(event.target.files[0])} />
            </label>
            <span className="mut">Bought it online? Screenshot the order page and upload it.</span>
          </>
        )}
      </div>
    )
  }

  const itemsTotalCents = sumOf(receipt.items.map(item => item.cents))
  const totalsMismatch = receipt.subtotalCents && itemsTotalCents !== receipt.subtotalCents

  return (
    <>
      {totalsMismatch && (
        <div className="warn">
          <b>Items add up to {formatMoney(itemsTotalCents)}, not {formatMoney(receipt.subtotalCents)}.</b> Check the prices below.
        </div>
      )}
      {!totalsMismatch && receipt.items.length > 0 && <div className="warn ok">Matches the receipt subtotal.</div>}

      {receipt.items.map((item, itemIndex) => (
        <div key={itemIndex} className="card">
          <div className="row">
            <input value={item.name} onChange={event => updateItem(itemIndex, { name: event.target.value })} />
            <input style={{ width: 90 }} inputMode="decimal" defaultValue={(item.cents / 100).toFixed(2)}
              onBlur={event => updateItem(itemIndex, { cents: dollarsToCents(event.target.value) })} />
          </div>
          <div className="chips">
            {people.map(person => (
              <button key={person.id} aria-label={person.name} aria-pressed={item.personIds.includes(person.id)}
                className={'chip' + (item.personIds.includes(person.id) ? ' on' : '')}
                onClick={() => toggleItemPerson(itemIndex, person.id)}>
                {initialsOf(person.name)}
              </button>
            ))}
          </div>
        </div>
      ))}

      <button className="s" onClick={() => onReceiptChange({ ...receipt, items: [...receipt.items, { name: '', cents: 0, personIds: [] }] })}>
        Add item
      </button>

      <div className="row gap" style={{ flexDirection: 'row' }}>
        {[['taxCents', 'Tax'], ['tipCents', 'Tip']].map(([field, label]) => (
          <label key={field} style={{ flex: 1 }}>
            <span className="mut">{label}</span>
            <input inputMode="decimal" defaultValue={(receipt[field] / 100).toFixed(2)}
              onBlur={event => onReceiptChange({ ...receipt, [field]: dollarsToCents(event.target.value) })} />
          </label>
        ))}
      </div>
      <p className="mut">Tax and tip are split by what each person ordered.</p>
    </>
  )
}
