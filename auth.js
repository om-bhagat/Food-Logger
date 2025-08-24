// auth.js (root)
import { initializeApp } from "https://www.gstatic.com/firebasejs/10.13.1/firebase-app.js";
import {
  getAuth, onAuthStateChanged, GoogleAuthProvider,
  signInWithPopup, signInWithRedirect, getRedirectResult, signOut
} from "https://www.gstatic.com/firebasejs/10.13.1/firebase-auth.js";
import { firebaseConfig } from "./firebase-config.js";

const app  = initializeApp(firebaseConfig);
export { app };

export const auth = getAuth(app);
const provider = new GoogleAuthProvider();

export const waitForUser = () =>
  new Promise(resolve => onAuthStateChanged(auth, u => resolve(u || null)));

export const signInWithGoogle = () => signInWithPopup(auth, provider);

export const signInWithRedirectSafe = async () => {
  await signInWithRedirect(auth, provider);
  try { await getRedirectResult(auth); } catch {}
};

export const signOutNow = () => signOut(auth);
