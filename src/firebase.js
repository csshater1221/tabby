import { initializeApp } from 'firebase/app'
import { initializeAppCheck, ReCaptchaEnterpriseProvider } from 'firebase/app-check'
import { getAuth } from 'firebase/auth'
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

export const auth = getAuth(app)

// Offline support: data is cached in IndexedDB and shared across tabs.
// Writes made offline are queued and sync automatically when the connection returns.
export const db = initializeFirestore(app, {
  localCache: persistentLocalCache({ tabManager: persistentMultipleTabManager() })
})

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
      model: 'gemini-3.8-flash',
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
