export const formatMoney = cents => '$' + (cents / 100).toFixed(2)
export const dollarsToCents = text => Math.round((parseFloat(text) || 0) * 100)
export const sumOf = numbers => numbers.reduce((total, number) => total + number, 0)

// Splits totalCents by weight. Leftover cents go to the largest remainders,
// so the shares always add up to exactly totalCents.
export function distributeCents(totalCents, weights) {
  const weightTotal = sumOf(weights)
  if (!weightTotal) return weights.map(() => 0)

  const exactShares = weights.map(weight => (totalCents * weight) / weightTotal)
  const shares = exactShares.map(Math.floor)
  let centsLeftOver = totalCents - sumOf(shares)

  exactShares
    .map((exactShare, index) => ({ remainder: exactShare - shares[index], index }))
    .sort((first, second) => second.remainder - first.remainder)
    .forEach(({ index }) => {
      if (centsLeftOver-- > 0) shares[index]++
    })
  return shares
}

export function splitEqually(totalCents, personIds) {
  const shares = distributeCents(totalCents, personIds.map(() => 1))
  return Object.fromEntries(personIds.map((personId, index) => [personId, shares[index]]))
}

// items look like { cents, personIds }. Tax and tip follow each person's item subtotal.
export function splitItemized(items, taxCents, tipCents, personIds) {
  const subtotals = Object.fromEntries(personIds.map(personId => [personId, 0]))
  items.forEach(item => {
    const shares = distributeCents(item.cents, item.personIds.map(() => 1))
    item.personIds.forEach((personId, index) => { subtotals[personId] += shares[index] })
  })

  const weights = personIds.map(personId => subtotals[personId])
  const taxShares = distributeCents(taxCents, weights)
  const tipShares = distributeCents(tipCents, weights)
  return Object.fromEntries(
    personIds.map((personId, index) => [personId, subtotals[personId] + taxShares[index] + tipShares[index]])
  )
}

export function amountsOwed(hangout) {
  const owed = {}
  hangout.expenses.forEach(expense => {
    Object.entries(expense.split).forEach(([personId, cents]) => {
      owed[personId] = (owed[personId] || 0) + cents
    })
  })
  return owed
}

export function outstandingCents(hangout) {
  const owed = amountsOwed(hangout)
  return sumOf(Object.entries(owed).filter(([personId]) => !hangout.paid[personId]).map(([, cents]) => cents))
}
