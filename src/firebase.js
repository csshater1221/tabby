import { initializeApp } from 'firebase/app'
import { getAuth } from 'firebase/auth'
import { initializeFirestore, persistentLocalCache } from 'firebase/firestore'
import { getAI, getGenerativeModel, GoogleAIBackend } from 'firebase/ai'

const e = import.meta.env
const app = initializeApp({
  apiKey: e.VITE_FIREBASE_API_KEY,
  authDomain: e.VITE_FIREBASE_AUTH_DOMAIN,
  projectId: e.VITE_FIREBASE_PROJECT_ID,
  appId: e.VITE_FIREBASE_APP_ID
})

export const auth = getAuth(app)
export const db = initializeFirestore(app, { localCache: persistentLocalCache() })

const model = getGenerativeModel(getAI(app, { backend: new GoogleAIBackend() }), {
  model: 'gemini-2.5-flash',
  generationConfig: { responseMimeType: 'application/json' }
})

const PROMPT = 'Read this receipt. Return JSON only: {"items":[{"name":string,"cents":integer line total}],"subtotal":integer cents,"tax":integer cents,"tip":integer cents}. Use 0 when a value is absent.'

export async function scanReceipt(file) {
  const data = await new Promise(res => {
    const r = new FileReader()
    r.onload = () => res(r.result.split(',')[1])
    r.readAsDataURL(file)
  })
  const out = await model.generateContent([PROMPT, { inlineData: { data, mimeType: file.type || 'image/jpeg' } }])
  return JSON.parse(out.response.text())
}
