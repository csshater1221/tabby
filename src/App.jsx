import { useEffect, useRef, useState } from 'react'
import { GoogleAuthProvider, onAuthStateChanged, signInWithPopup, signOut } from 'firebase/auth'
import { collection, deleteDoc, doc, onSnapshot, setDoc } from 'firebase/firestore'
import { toPng } from 'html-to-image'
import { auth, db, scanReceipt } from './firebase'
import { dist, equal, f, itemized, outstanding, owed, sum, toC } from './lib'

const ini = n => n.slice(0, 2).toUpperCase()

export default function App() {
  const [u, setU] = useState(undefined)
  const [hs, setHs] = useState([])
  const [open, setOpen] = useState(null)

  useEffect(() => onAuthStateChanged(auth, setU), [])
  useEffect(() => {
    if (!u) return
    return onSnapshot(collection(db, 'users', u.uid, 'hangouts'), s =>
      setHs(s.docs.map(d => d.data()).sort((a, b) => b.date.localeCompare(a.date))))
  }, [u])

  if (u === undefined) return null
  if (!u) return (
    <main>
      <h1><span className="logo" />Tabby</h1>
      <p>Keep track of who owes you after a hangout.</p>
      <button className="p" onClick={() => signInWithPopup(auth, new GoogleAuthProvider())}>Sign in with Google</button>
    </main>
  )

  const save = h => setDoc(doc(db, 'users', u.uid, 'hangouts', h.id), h)
  const h = hs.find(x => x.id === open)
  return <main>{h
    ? <Hangout h={h} u={u} save={save} back={() => setOpen(null)}
        remove={() => { deleteDoc(doc(db, 'users', u.uid, 'hangouts', h.id)); setOpen(null) }} />
    : <Home hs={hs} save={save} open={setOpen} />}</main>
}

function Home({ hs, save, open }) {
  const [show, setShow] = useState(false)
  const [n, setN] = useState('')
  const [p, setP] = useState('')
  const total = sum(hs.map(outstanding))

  const create = () => {
    const people = p.split(',').map(s => s.trim()).filter(Boolean).map(name => ({ id: crypto.randomUUID(), name }))
    if (!n.trim() || !people.length) return
    const h = { id: crypto.randomUUID(), name: n.trim(), date: new Date().toISOString().slice(0, 10), people, paid: {}, expenses: [] }
    save(h)
    open(h.id)
  }

  return (<>
    <div className="row"><h1><span className="logo" />Tabby</h1><button className="g" onClick={() => signOut(auth)}>Sign out</button></div>
    <div className="hero"><span className="mut">You're owed</span><b>{f(total)}</b></div>
    <div className="row"><h2>Hangouts</h2><button className="p s" onClick={() => setShow(!show)}>New hangout</button></div>
    {show && <div className="card gap">
      <input placeholder="Karaoke night" value={n} onChange={e => setN(e.target.value)} />
      <textarea rows={2} placeholder="Who came? Alex, Kai, Sam" value={p} onChange={e => setP(e.target.value)} />
      <button className="p" onClick={create}>Create hangout</button>
    </div>}
    {!hs.length && !show && <p className="mut">Start your first hangout, then add expenses as you pay.</p>}
    {hs.map(h => {
      const out = outstanding(h)
      return (
        <div key={h.id} className="card" role="button" tabIndex={0} onClick={() => open(h.id)} onKeyDown={e => e.key === 'Enter' && open(h.id)}>
          <div className="row"><b>{h.name}</b><span className={'pill' + (out ? '' : ' ok')}>{out ? f(out) + ' owed' : 'Settled'}</span></div>
          <div className="mut">{h.date} · {h.people.length} people · {f(sum(h.expenses.map(e => e.cents)))} total</div>
        </div>)
    })}
  </>)
}

async function shareImage(el, name) {
  const url = await toPng(el, { pixelRatio: 2 })
  const blob = await (await fetch(url)).blob()
  const file = new File([blob], name + '.png', { type: 'image/png' })
  if (navigator.canShare?.({ files: [file] })) return navigator.share({ files: [file] }).catch(() => {})
  try {
    await navigator.clipboard.write([new ClipboardItem({ 'image/png': blob })])
    alert('Image copied. Paste it into Discord.')
  } catch {
    const a = document.createElement('a')
    a.href = url
    a.download = file.name
    a.click()
  }
}

function Hangout({ h, u, save, back, remove }) {
  const [adding, setAdding] = useState(false)
  const [only, setOnly] = useState(false)
  const ref = useRef()
  const o = owed(h)
  const rows = h.people.filter(p => o[p.id])
  const shown = only ? rows.filter(p => !h.paid[p.id]) : rows
  const togglePaid = id => save({ ...h, paid: { ...h.paid, [id]: !h.paid[id] } })
  const delExpense = id => save({ ...h, expenses: h.expenses.filter(e => e.id !== id) })
  const host = (u.displayName || 'me').split(' ')[0]

  return (<>
    <div className="row"><button className="g" onClick={back}>Back</button><button className="g" onClick={() => confirm('Delete this hangout?') && remove()}>Delete</button></div>
    <h1>{h.name}</h1>
    <div className="mut">{h.date} · {f(sum(h.expenses.map(e => e.cents)))} total</div>

    <div className="row" style={{ marginTop: 14 }}><h2>Expenses</h2><button className="p s" onClick={() => setAdding(true)}>Add expense</button></div>
    {!h.expenses.length && <p className="mut">Add what you paid for. Split it equally or by person.</p>}
    {h.expenses.map(e => (
      <div key={e.id} className="card row">
        <div><b>{e.title}</b><div className="mut">{Object.keys(e.split).length} people</div></div>
        <div className="row"><b>{f(e.cents)}</b><button className="g" aria-label={'Remove ' + e.title} onClick={() => delExpense(e.id)}>×</button></div>
      </div>))}

    <h2 style={{ marginTop: 18 }}>Who owes you</h2>
    <div className="card">
      {rows.map(p => (
        <div key={p.id} className="row" style={{ padding: '6px 0' }}>
          <span>{p.name}</span>
          <span className="row">
            <b className={h.paid[p.id] ? 'paid' : ''}>{f(o[p.id])}</b>
            <button className={'s' + (h.paid[p.id] ? ' ok' : '')} onClick={() => togglePaid(p.id)}>{h.paid[p.id] ? 'Paid' : 'Mark paid'}</button>
          </span>
        </div>))}
      {!rows.length && <span className="mut">Nobody owes anything yet.</span>}
    </div>

    {!!rows.length && <>
      <div className="row"><h2>Share</h2>
        <span className="tab" style={{ margin: 0, width: 190 }}>
          <button className={only ? '' : 'on'} onClick={() => setOnly(false)}>Everyone</button>
          <button className={only ? 'on' : ''} onClick={() => setOnly(true)}>Unpaid</button>
        </span>
      </div>
      <div className="xcard" ref={ref}>
        <b style={{ fontSize: 18 }}>{h.name}</b>
        <div className="mut" style={{ marginBottom: 8 }}>{h.date} · pay {host}</div>
        {shown.map(p => (
          <div key={p.id} className="row">
            <span style={{ flex: 1 }}>{p.name}</span>
            <span>{f(o[p.id])}</span>
            <span style={{ width: 56, textAlign: 'right', color: h.paid[p.id] ? '#5FD9B3' : '#FFB48A' }}>{h.paid[p.id] ? 'Paid' : 'Owes'}</span>
          </div>))}
        <div className="mut" style={{ marginTop: 8 }}>Still owed: {f(sum(rows.filter(p => !h.paid[p.id]).map(p => o[p.id])))} · made with Tabby</div>
      </div>
      <button className="k" style={{ width: '100%' }} onClick={() => shareImage(ref.current, h.name)}>Share image</button>
    </>}

    {adding && <AddExpense h={h} close={() => setAdding(false)} onSave={e => { save({ ...h, expenses: [...h.expenses, e] }); setAdding(false) }} />}
  </>)
}

function AddExpense({ h, close, onSave }) {
  const ids = h.people.map(p => p.id)
  const [mode, setMode] = useState('equal')
  const [title, setTitle] = useState('')
  const [amt, setAmt] = useState('')
  const [sel, setSel] = useState(ids)
  const [cust, setCust] = useState({})
  const [rc, setRc] = useState(null)
  const [busy, setBusy] = useState(false)
  const [err, setErr] = useState('')

  const pick = id => setSel(s => s.includes(id) ? s.filter(x => x !== id) : [...s, id])

  async function scan(file) {
    if (!file) return
    setBusy(true); setErr('')
    try {
      const r = await scanReceipt(file)
      setRc({ items: r.items.map(i => ({ n: i.name, c: i.cents, w: [] })), subtotal: r.subtotal, tax: r.tax, tip: r.tip })
    } catch {
      setErr("Couldn't read that receipt. Retake the photo, or add the items yourself.")
      setRc({ items: [], subtotal: 0, tax: 0, tip: 0 })
    }
    setBusy(false)
  }
  const setItem = (i, patch) => setRc(r => ({ ...r, items: r.items.map((x, j) => j === i ? { ...x, ...patch } : x) }))
  const togItem = (i, id) => setItem(i, { w: rc.items[i].w.includes(id) ? rc.items[i].w.filter(x => x !== id) : [...rc.items[i].w, id] })

  const itemsSum = rc ? sum(rc.items.map(i => i.c)) : 0
  const mismatch = rc && rc.subtotal && itemsSum !== rc.subtotal

  function save() {
    setErr('')
    let split, cents
    if (mode === 'equal') {
      cents = toC(amt)
      if (!cents || !sel.length) return setErr('Enter an amount and pick at least one person.')
      split = equal(cents, sel)
    } else if (mode === 'custom') {
      split = Object.fromEntries(sel.map(id => [id, toC(cust[id])]))
      cents = sum(Object.values(split))
      if (!cents) return setErr('Enter an amount for each person.')
      if (amt && toC(amt) !== cents) return setErr('Amounts add up to ' + f(cents) + ', not ' + f(toC(amt)) + '.')
    } else {
      if (!rc || !rc.items.length) return setErr('Scan a receipt or add items first.')
      if (rc.items.some(i => !i.w.length)) return setErr('Pick who had each item.')
      split = itemized(rc.items, rc.tax, rc.tip, ids)
      Object.keys(split).forEach(k => { if (!split[k]) delete split[k] })
      cents = sum(Object.values(split))
    }
    onSave({ id: crypto.randomUUID(), title: title.trim() || (mode === 'receipt' ? 'Receipt' : 'Expense'), cents, split })
  }

  return (
    <div className="sheet"><main>
      <div className="row"><button className="g" onClick={close}>Cancel</button><h2>Add expense</h2><span style={{ width: 60 }} /></div>
      <div className="tab">{[['equal', 'Equal'], ['custom', 'Custom'], ['receipt', 'Receipt']].map(([k, l]) =>
        <button key={k} className={mode === k ? 'on' : ''} onClick={() => { setMode(k); setErr('') }}>{l}</button>)}</div>
      <div className="gap">
        <input placeholder={mode === 'receipt' ? 'Dinner (optional)' : 'Room rental'} value={title} onChange={e => setTitle(e.target.value)} />
        {mode !== 'receipt' && <input inputMode="decimal" placeholder="Amount, e.g. 36.00" value={amt} onChange={e => setAmt(e.target.value)} />}
      </div>

      {mode !== 'receipt' && <>
        <h2 style={{ marginTop: 16 }}>Who's in</h2>
        <div className="card">
          {h.people.map(p => (
            <div key={p.id} className="row" style={{ padding: '5px 0' }}>
              <label><input type="checkbox" style={{ width: 'auto', marginRight: 8 }} checked={sel.includes(p.id)} onChange={() => pick(p.id)} />{p.name}</label>
              {mode === 'custom' && sel.includes(p.id) && <input style={{ width: 90 }} inputMode="decimal" placeholder="0.00" value={cust[p.id] || ''} onChange={e => setCust({ ...cust, [p.id]: e.target.value })} />}
              {mode === 'equal' && sel.includes(p.id) && toC(amt) > 0 && <span className="mut">{f(equal(toC(amt), sel)[p.id])}</span>}
            </div>))}
        </div>
        {mode === 'custom' && <p className="mut">Total: {f(sum(sel.map(id => toC(cust[id]))))}</p>}
      </>}

      {mode === 'receipt' && <div style={{ marginTop: 12 }}>
        {!rc && <div className="card gap" style={{ textAlign: 'center' }}>
          <b>{busy ? 'Reading your receipt…' : 'Add your receipt'}</b>
          {!busy && <>
            <label className="lb p">Take a photo<input type="file" accept="image/*" capture="environment" hidden onChange={e => scan(e.target.files[0])} /></label>
            <label className="lb">Upload a screenshot or photo<input type="file" accept="image/*" hidden onChange={e => scan(e.target.files[0])} /></label>
            <span className="mut">Bought it online? Screenshot the order page and upload it.</span>
          </>}
        </div>}
        {rc && <>
          {mismatch && <div className="warn"><b>Items add up to {f(itemsSum)}, not {f(rc.subtotal)}.</b> Check the prices below.</div>}
          {!mismatch && rc.items.length > 0 && <div className="warn ok">Matches the receipt subtotal.</div>}
          {rc.items.map((it, i) => (
            <div key={i} className="card">
              <div className="row">
                <input value={it.n} onChange={e => setItem(i, { n: e.target.value })} />
                <input style={{ width: 90 }} inputMode="decimal" defaultValue={(it.c / 100).toFixed(2)} onBlur={e => setItem(i, { c: toC(e.target.value) })} />
              </div>
              <div className="chips">{h.people.map(p =>
                <button key={p.id} aria-label={p.name} aria-pressed={it.w.includes(p.id)} className={'chip' + (it.w.includes(p.id) ? ' on' : '')} onClick={() => togItem(i, p.id)}>{ini(p.name)}</button>)}</div>
            </div>))}
          <button className="s" onClick={() => setRc({ ...rc, items: [...rc.items, { n: '', c: 0, w: [] }] })}>Add item</button>
          <div className="row gap" style={{ flexDirection: 'row' }}>
            {['tax', 'tip'].map(k => <label key={k} style={{ flex: 1 }}><span className="mut">{k === 'tax' ? 'Tax' : 'Tip'}</span>
              <input inputMode="decimal" defaultValue={(rc[k] / 100).toFixed(2)} onBlur={e => setRc({ ...rc, [k]: toC(e.target.value) })} /></label>)}
          </div>
          <p className="mut">Tax and tip are split by what each person ordered.</p>
        </>}
      </div>}

      {err && <div className="warn">{err}</div>}
      <button className="p" style={{ width: '100%', marginTop: 12 }} onClick={save}>Save expense</button>
    </main></div>
  )
}
