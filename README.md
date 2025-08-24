Food Logger — README

A small, fast, privacy-first Food & Outcome Logger that helps you connect what you ate to how you felt. Local-first by default; optional Google sign-in to sync to Firebase/Firestore. Deployable as a static site on Vercel.

Features

Blazing-fast logging: Food/meal, time, outcome (Great/Meh/Not great), notes, serving items (name/qty/unit).

Quick actions: “Same as last”, keyboard Ctrl/Cmd + Enter to save, duplicate/edit/delete entries.

Search & filters: Text search, outcome filter, time windows (7/30/90/all), sort toggle.

Stats: Totals and outcome counts for 7/30/90 days.

Import/Export: JSON and CSV export; JSON import with de-dup and normalization.

Local-first: Everything works with LocalStorage (no account required).

Optional sync: Sign in with Google and store under users/{uid}/entries in Firestore.

Per-user isolation: Firestore rules restrict reads/writes to the signed-in user.

Zero backend: Pure static files. Host anywhere. Vercel recommended.

Tech Stack

Frontend: Vanilla HTML/CSS/JS (no framework)

Auth: Firebase Authentication (Google provider)

Database (optional): Cloud Firestore

Hosting: Vercel (static)

Directory (suggested tidy layout)
.
├─ index.html              # App (logger)
├─ login.html              # Google sign-in
├─ register.html           # Simple local username flow (optional/local-only)
├─ motivation.html         # “Why I built this” page (optional)
├─ essay.html / essay.css  # Long-form rationale page (optional)
├─ style.css               # App styles
├─ auth.js                 # Initialize Firebase, auth helpers
├─ main.js                 # Wait for auth, boot app, logout
├─ script.js               # App UI + LocalStorage; works with/without Firestore
├─ firebase-config.js      # Exports your Firebase config object
├─ storage-firestore.js    # Firestore adapter (reuses app from auth.js)
├─ storage-local.js        # LocalStorage adapter (used internally)
└─ vercel.json             # (optional) routes like "/" -> /login.html


You may have extra folders (e.g., Food-Google, src/, test/) while iterating. For production, keep only what you need.

Setup (Local)

Clone and open the folder.

Create firebase-config.js with your project values:

// firebase-config.js
export const firebaseConfig = {
  apiKey: "YOUR_API_KEY",
  authDomain: "YOUR_PROJECT_ID.firebaseapp.com",
  projectId: "YOUR_PROJECT_ID",
  storageBucket: "YOUR_PROJECT_ID.appspot.com",
  messagingSenderId: "YOUR_SENDER_ID",
  appId: "YOUR_APP_ID",
  measurementId: "G-XXXXXXXXXX"
};


Run a static server (pick one):

# Node
npx serve .              # serves at http://localhost:3000 (default)
# or
npx http-server -p 3000


Open http://localhost:3000/login.html
 (sign-in) or index.html (local-only).

Firebase Configuration
Enable products

Authentication → Sign-in method: enable Google provider.

Authentication → Settings → Authorized domains: add

localhost

Your Vercel domain (e.g., your-app.vercel.app)

(Optional) your custom domain

Firestore

Create a database in production or test mode.

Use this security rules template:

// Firestore Rules
rules_version = '2';
service cloud.firestore {
  match /databases/{database}/documents {
    // user-private area
    match /users/{userId}/entries/{entryId} {
      allow read, write: if request.auth != null && request.auth.uid == userId;
    }
    // deny everything else
    match /{document=**} {
      allow read, write: if false;
    }
  }
}


The app writes under users/{uid}/entries with fields like when_ts (Timestamp), food, outcome, notes, ingredients[], created_at.

How it works

Local-first: script.js stores entries at food_outcome_log_v1:<user> in LocalStorage.

Auth flow (login.html):

auth.js initializes Firebase once and exposes helpers.

Popup sign-in with redirect fallback for browsers that block popups.

App boot (main.js):

Waits for auth; if not signed in, redirects to login.html.

Sets window.__storage = FirestoreStorage (cloud) and calls window.bootFoodApp().

If you want a pure local version, set window.__storage = LocalStorageAdapter(userId) and adapt.

Cloud adapter (storage-firestore.js):

CRUD under users/{uid}/entries, maps when (ISO string) ⇄ when_ts (Firestore Timestamp).

Export/Import:

JSON/CSV export; JSON import de-dups and normalizes ingredient rows.

Data Model
// In-app entry
Entry {
  id: string
  when: string            // ISO8601
  food: string
  outcome: 'great' | 'meh' | 'bad'
  notes?: string
  ingredients?: { name: string, qty?: string, unit?: string }[]
}

// Firestore document
users/{uid}/entries/{id} {
  user_id: string
  when_ts: timestamp
  food: string
  outcome: string
  notes: string
  ingredients: array<object>
  created_at: timestamp
}

Deployment (Vercel)

Install CLI and deploy:

npm i -g vercel
vercel         # first deploy (preview)
vercel --prod  # production


Use a stable domain (project’s production domain or your custom).
Add that host to Firebase Authorized domains.

(Optional) Make / go to login:

// vercel.json
{ "routes": [ { "src": "^/$", "dest": "/login.html" } ] }

Keyboard Shortcuts & UI Tips

Ctrl/Cmd + Enter — Save entry

Same as last — Prefill last meal, including ingredients

Share last — Copy latest filtered entry (or use Web Share on mobile)

Sort — Toggle New→Old / Old→New

Filters — Outcome, date range, text search (food, notes, ingredients)

Troubleshooting

Firebase: Error (auth/unauthorized-domain)

Add your exact host (e.g., your-app.vercel.app) in Firebase → Authentication → Settings → Authorized domains.

Test on your stable domain or localhost, not random preview links.

Hard refresh (Ctrl/Cmd-Shift-R). Clear site data if needed.

Popup blocked

The button automatically falls back to redirect sign-in.

Disable strict popup blockers for your domain.

Double initialization / app reload loops

Initialize Firebase once (in auth.js).

Other modules should import the same app or auth instance—do not call initializeApp again.

Can’t see entries after sign-in

Ensure Firestore Rules match the template above.

Confirm documents are under users/{uid}/entries.

Check browser console for permission errors.

Roadmap (nice-to-haves)

Ingredient correlation hints and lagged-time analysis

Voice / camera capture helpers

Wearables overlay (sleep/HRV)

Clinician/coach share links

Privacy-respecting cloud backup

Privacy & Disclaimer

Local by default. Sync is opt-in.

Export and delete are always available.

No medical claims—this is a personal research tool, not a diagnostic device.

Contributing

PRs welcome. Keep it small, readable, and dependency-light. Prefer progressive enhancement over heavy frameworks.

License

MIT — do whatever you want, just don’t blame me if your pasta diary becomes sentient.

Credits

Built to help people (including me) make decisions with evidence, not vibes.
