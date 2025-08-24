import { initializeApp } from "https://www.gstatic.com/firebasejs/11.0.1/firebase-app.js";
import {
  getAuth,
  setPersistence,
  browserLocalPersistence,
  onAuthStateChanged,
  createUserWithEmailAndPassword,
  signInWithEmailAndPassword,
  sendEmailVerification,
  sendPasswordResetEmail,
  signOut
} from "https://www.gstatic.com/firebasejs/11.0.1/firebase-auth.js";
import { getAnalytics } from "https://www.gstatic.com/firebasejs/11.0.1/firebase-analytics.js";

const firebaseConfig = {
  apiKey: "AIzaSyC2PbOxfsBInS5WwBW02sChqaE1Rc_YRU4",
  authDomain: "food-logger-3947b.firebaseapp.com",
  projectId: "food-logger-3947b",
  storageBucket: "food-logger-3947b.appspot.com", // <-- FIXED
  messagingSenderId: "218654694965",
  appId: "1:218654694965:web:9c92f906d5d201c1b25b7c",
  measurementId: "G-FF9FER6NGH"
};

const app = initializeApp(firebaseConfig);
try { getAnalytics(app); } catch (_) {}

const auth = getAuth(app);
await setPersistence(auth, browserLocalPersistence);

onAuthStateChanged(auth, (user) => {
  console.log(user ? `Logged in: ${user.email}` : "Not signed in");
});

// wire these to your UI:
async function signUp(email, pass) {
  const { user } = await createUserWithEmailAndPassword(auth, email, pass);
  await sendEmailVerification(user);
  console.log("Verification email sent");
}
async function signIn(email, pass) {
  await signInWithEmailAndPassword(auth, email, pass);
  if (!auth.currentUser.emailVerified) console.warn("Email not verified");
}
async function resetPass(email) { await sendPasswordResetEmail(auth, email); }
async function logOut() { await signOut(auth); }
