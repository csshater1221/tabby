import { initializeApp } from 'firebase/app'
import { getAuth } from 'firebase/auth'
import { initializeFirestore, persistentLocalCache } from 'firebase/firestore'
import { getAI, getGenerativeModel, GoogleAIBackend } from 'firebase/ai'

const env = import.meta.env
const app = initializeApp({
  apiKey: env.VITE_FIREBASE_API_KEY,
  authDomain: env.VITE_FIREBASE_AUTH_DOMAIN,
  projectId: env.VITE_FIREBASE_PROJECT_ID,
  appId: env.VITE_FIREBASE_APP_ID
})

export const auth = getAuth(app)
export const db = initializeFirestore(app, { localCache: persistentLocalCache() })

const receiptModel = getGenerativeModel(getAI(app, { backend: new GoogleAIBackend() }), {
  model: 'gemini-3.8-flash',
  generationConfig: { responseMimeType: 'application/json' }
})

const RECEIPT_PROMPT =
  'Read this receipt. Return JSON only: {"items":[{"name":string,"cents":integer line total}],' +
  '"subtotalCents":integer,"taxCents":integer,"tipCents":integer}. Use 0 when a value is absent.'

export async function scanReceipt(imageFile) {
  const base64Image = await new Promise(resolve => {
    const reader = new FileReader()
    reader.onload = () => resolve(reader.result.split(',')[1])
    reader.readAsDataURL(imageFile)
  })
  const response = await receiptModel.generateContent([
    RECEIPT_PROMPT,
    { inlineData: { data: base64Image, mimeType: imageFile.type || 'image/jpeg' } }
  ])
  return JSON.parse(response.response.text())
}
