import { initializeApp } from 'firebase/app'
import { initializeAppCheck, ReCaptchaEnterpriseProvider } from 'firebase/app-check'
import { browserLocalPersistence, getAuth, indexedDBLocalPersistence, initializeAuth } from 'firebase/auth'
import { initializeFirestore, persistentLocalCache, persistentMultipleTabManager } from 'firebase/firestore'

const env = import.meta.env
const app = initializeApp({
  apiKey: env.VITE_FIREBASE_API_KEY,
  authDomain: env.VITE_FIREBASE_AUTH_DOMAIN,
  projectId: env.VITE_FIREBASE_PROJECT_ID,
  appId: env.VITE_FIREBASE_APP_ID
})

// App Check proves requests come from this app. Required for Firebase AI Logic from Nov 2, 2026.
// In dev, the browser console prints a debug token to register in the Firebase console.
if (env.DEV) self.FIREBASE_APPCHECK_DEBUG_TOKEN = true
if (env.VITE_RECAPTCHA_SITE_KEY) {
  initializeAppCheck(app, {
    provider: new ReCaptchaEnterpriseProvider(env.VITE_RECAPTCHA_SITE_KEY),
    isTokenAutoRefreshEnabled: true
  })
}

// getAuth() bundles the popup/redirect resolver, which makes startup wait on a hidden iframe from the auth domain.
// Initializing without it keeps startup local; the resolver is passed to signInWithPopup only when signing in.
function createAuth() {
  try {
    return initializeAuth(app, { persistence: [indexedDBLocalPersistence, browserLocalPersistence] })
  } catch {
    return getAuth(app) // already initialized (dev hot reload)
  }
}
export const auth = createAuth()

// Offline support: data is cached in IndexedDB and shared across tabs.
// Writes made offline are queued and sync automatically when the connection returns.
export const db = initializeFirestore(app, {
  localCache: persistentLocalCache({ tabManager: persistentMultipleTabManager() })
})

// Set VITE_GEMINI_MODEL in .env to change the receipt-scanning model without touching code.
const DEFAULT_GEMINI_MODEL = 'gemini-3.5-flash-lite'

const RECEIPT_PROMPT =
  'Read this receipt. Return JSON only: {"items":[{"name":string,"cents":integer line total}],' +
  '"subtotalCents":integer,"taxCents":integer,"tipCents":integer}. Use 0 when a value is absent.'

// The AI library is large, so it only loads the first time someone scans a receipt.
let receiptModel
async function getReceiptModel() {
  if (!receiptModel) {
    const { getAI, getGenerativeModel, GoogleAIBackend } = await import('firebase/ai')
    const ai = getAI(app, { backend: new GoogleAIBackend(), useLimitedUseAppCheckTokens: true })
    receiptModel = getGenerativeModel(ai, {
      model: env.VITE_GEMINI_MODEL || DEFAULT_GEMINI_MODEL,
      generationConfig: { responseMimeType: 'application/json' }
    })
  }
  return receiptModel
}

export async function scanReceipt(imageFile) {
  const base64Image = await new Promise(resolve => {
    const reader = new FileReader()
    reader.onload = () => resolve(reader.result.split(',')[1])
    reader.readAsDataURL(imageFile)
  })
  const model = await getReceiptModel()
  const response = await model.generateContent([
    RECEIPT_PROMPT,
    { inlineData: { data: base64Image, mimeType: imageFile.type || 'image/jpeg' } }
  ])
  return JSON.parse(response.response.text())
}
