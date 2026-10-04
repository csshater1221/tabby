export const f = c => '$' + (c / 100).toFixed(2)
export const toC = s => Math.round((parseFloat(s) || 0) * 100)
export const sum = a => a.reduce((x, y) => x + y, 0)

// Split `a` cents by weights; leftover cents go to the largest remainders so the parts always sum to `a`.
export function dist(a, w) {
  const s = sum(w)
  if (!s) return w.map(() => 0)
  const raw = w.map(x => (a * x) / s)
  const out = raw.map(Math.floor)
  let left = a - sum(out)
  raw.map((x, i) => [x - out[i], i]).sort((p, q) => q[0] - p[0]).forEach(([, i]) => { if (left-- > 0) out[i]++ })
  return out
}

export function equal(cents, ids) {
  const d = dist(cents, ids.map(() => 1))
  return Object.fromEntries(ids.map((id, i) => [id, d[i]]))
}

// Items are { c: cents, w: [personIds] }. Tax and tip follow each person's item subtotal.
export function itemized(items, tax, tip, ids) {
  const sub = Object.fromEntries(ids.map(i => [i, 0]))
  items.forEach(it => { const d = dist(it.c, it.w.map(() => 1)); it.w.forEach((p, i) => { sub[p] += d[i] }) })
  const w = ids.map(i => sub[i])
  const t = dist(tax, w), p = dist(tip, w)
  return Object.fromEntries(ids.map((id, i) => [id, sub[id] + t[i] + p[i]]))
}

export function owed(h) {
  const o = {}
  h.expenses.forEach(e => Object.entries(e.split).forEach(([p, c]) => { o[p] = (o[p] || 0) + c }))
  return o
}

export const outstanding = h => {
  const o = owed(h)
  return sum(Object.entries(o).filter(([p]) => !h.paid[p]).map(([, c]) => c))
}
