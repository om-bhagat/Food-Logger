// storage-firestore.js
import {
  getFirestore, collection, query, orderBy, getDocs,
  addDoc, doc, updateDoc, deleteDoc, serverTimestamp
} from "https://www.gstatic.com/firebasejs/10.13.1/firebase-firestore.js";
import { app, auth } from "./auth.js";

const db = getFirestore(app);

// Normalizer between your local shape and Firestore
function toFirestoreEntry(entry, uid) {
  return {
    user_id: uid,
    when_ts: entry.when ? new Date(entry.when) : new Date(),
    food: entry.food,
    outcome: entry.outcome || "",
    notes: entry.notes || "",
    ingredients: Array.isArray(entry.ingredients) ? entry.ingredients : [],
    created_at: serverTimestamp()
  };
}
function fromFirestoreEntry(docSnap) {
  const d = docSnap.data();
  return {
    id: docSnap.id,
    when: d.when_ts?.toDate ? d.when_ts.toDate().toISOString() : d.when_ts,
    food: d.food,
    outcome: d.outcome || "",
    notes: d.notes || "",
    ingredients: d.ingredients || []
  };
}

export const FirestoreStorage = {
  async listAll() {
    const user = auth.currentUser;
    if (!user) return [];
    const qy = query(collection(db, "users", user.uid, "entries"), orderBy("when_ts", "desc"));
    const snap = await getDocs(qy);
    return snap.docs.map(fromFirestoreEntry);
  },

  async create(entry) {
    const user = auth.currentUser;
    if (!user) throw new Error("Not signed in.");
    const data = toFirestoreEntry(entry, user.uid);
    const ref = await addDoc(collection(db, "users", user.uid, "entries"), data);
    return { ...entry, id: ref.id };
  },

  async update(entryId, entry) {
    const user = auth.currentUser;
    if (!user) throw new Error("Not signed in.");
    const ref = doc(db, "users", user.uid, "entries", entryId);
    await updateDoc(ref, toFirestoreEntry(entry, user.uid));
    return { ...entry, id: entryId };
  },

  async remove(entryId) {
    const user = auth.currentUser;
    if (!user) throw new Error("Not signed in.");
    const ref = doc(db, "users", user.uid, "entries", entryId);
    await deleteDoc(ref);
  }
};
