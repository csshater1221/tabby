import { useEffect, useState } from 'react'
import { collection, onSnapshot } from 'firebase/firestore'
import { db } from '../firebase'

// Live list of documents under users/{uid}/{collectionName}. Served from the local cache when offline.
export function useUserCollection(user, collectionName) {
  const [documents, setDocuments] = useState([])
  useEffect(() => {
    if (!user) return
    return onSnapshot(collection(db, 'users', user.uid, collectionName), snapshot =>
      setDocuments(snapshot.docs.map(document => document.data()))
    )
  }, [user, collectionName])
  return documents
}
