# Tabby

A small installable web app (PWA) for splitting the bill after you hang out with friends. You usually pay for everyone up front; Tabby keeps track of who owes you what, across every hangout, and makes a shareable picture of the tab to send on Discord.

## What it does

- **Hangouts:** one tab per outing. Add expenses as you pay for them.
- **Saved friends:** keep your usual group under your account, then pick who came to each hangout.
- **Three ways to split an expense**
  - *Equal* (default), among whoever was part of it.
  - *Custom*, with an amount per person.
  - *Receipt*, where you take a photo or upload a screenshot, the items are read for you, and you tap who had what. Tax and tip are shared in proportion to each person's items.
- **Paid tracking:** mark each friend as paid per hangout.
- **Totals across hangouts:** the Friends tab shows what each friend owes you overall, with a breakdown per hangout, so someone waiting on a paycheck can settle several hangouts at once.
- **Shareable images:** export a hangout's table, or one friend's personal tab, as an image. On a phone it opens the share sheet (Discord appears there); on desktop it copies the image to paste into Discord.
- **Works offline:** data is cached on the device and changes sync when you reconnect.

## How it works

### Data (Firestore)

Everything lives under the signed-in user, so each account only sees its own data.

```
users/{uid}/friends/{friendId}    { id, name }
users/{uid}/hangouts/{hangoutId}  {
  id, name, date,
  people:   [{ id, name }],             // friend ids and a copy of their names
  paid:     { [friendId]: true|false }, // who has paid for this hangout
  expenses: [{ id, title, cents, split: { [friendId]: cents } }]
}
```

Every expense is saved as a final per-person amount (`split`), whichever way it was split. A friend's balance is just the sum of their amounts, and the same friend id links their amounts across hangouts.

### Money

All amounts are whole **cents**, never decimals, so nothing drifts. `distributeCents` in `src/lib/split.js` divides an amount by weights and hands leftover cents to the largest remainders, so a split always adds up exactly. Receipt splits work in two steps: each item is divided among the people who had it, then tax and tip are divided in proportion to each person's item subtotal.

### Receipt scanning

The photo goes straight from the browser to Gemini through Firebase AI Logic. It returns items, subtotal, tax, and tip as JSON. The review screen compares the item total to the receipt subtotal and warns on a mismatch, since a misread digit is the most likely error. The model name is set by `VITE_GEMINI_MODEL`. Scanning needs an internet connection; entering items by hand works offline.

### Security

- Google sign-in through Firebase Auth.
- `firestore.rules` only lets a signed-in user read and write their own `users/{uid}` data.
- **App Check** (reCAPTCHA Enterprise) confirms requests come from this app. Firebase AI Logic requires it from November 2, 2026.

### Speed and offline

- Firestore's local cache (IndexedDB, shared across tabs) serves data when offline and queues writes.
- The service worker (`vite-plugin-pwa`) caches the app shell so repeat opens are fast.
- `firebase.json` caches built assets for a year and always revalidates `index.html` and the service worker.
- The AI and image-export libraries, and the add-expense screen, load only when first needed.
- Auth starts without the popup helper (loaded only on sign-in), and a splash screen paints immediately.

## Project layout

```
src/
  App.jsx                    sign-in check, tabs, which screen shows
  firebase.js                Firebase setup, App Check, offline cache, receipt scan
  lib/
    split.js                 money and splitting math, per-friend statements
    shareImage.js            card -> image -> share / copy / download
    useUserCollection.js     live Firestore list for the signed-in user
    useOnlineStatus.js       online/offline flag for the banner
  components/
    HomeScreen, HangoutScreen, FriendsScreen, FriendScreen
    AddExpenseSheet, ReceiptScanner, FriendPicker, AddFriendInput
    ShareCard, StatementCard, LoginScreen, Splash, Logo
```

## Setup

You need a Firebase project on the free **Spark** plan.

1. In the Firebase console, add a **Web app** and copy its config.
2. Turn on **Authentication → Google**, create a **Firestore** database, and turn on **AI Logic** with the Gemini Developer API.
3. Create a reCAPTCHA Enterprise **score-based Web** key in Google Cloud (same project, with your hosting domains), then register it under **App Check → Apps**.
4. Copy `.env.example` to `.env` and fill it in:

| Variable | What it is |
| --- | --- |
| `VITE_FIREBASE_API_KEY`, `VITE_FIREBASE_AUTH_DOMAIN`, `VITE_FIREBASE_PROJECT_ID`, `VITE_FIREBASE_APP_ID` | From your Firebase web app config |
| `VITE_RECAPTCHA_SITE_KEY` | The reCAPTCHA Enterprise site key |
| `VITE_GEMINI_MODEL` | Receipt-scanning model, e.g. `gemini-3.5-flash-lite` |

5. Install and run:

```
npm install
npm run dev        # local development
npm run build      # production build into dist/
```

In dev, the browser console prints an App Check debug token. Add it under **App Check → Apps → Manage debug tokens**.

## Deploy

```
npm i -g firebase-tools
firebase login
firebase init        # Hosting + Firestore, reuse your project, keep existing files
npm run build
firebase deploy
```

Open the hosted URL on your phone and choose **Add to Home Screen**. Once App Check metrics show verified requests, switch on enforcement for AI Logic and Firestore.

## Known limitations

- Each hangout keeps a copy of its friends' names, so renaming a friend doesn't update past hangouts.
- Expenses can be added and removed but not edited.
- Every expense assumes you paid for it.
- Receipt scanning depends on the free Gemini tier's rate limits, which can change.
