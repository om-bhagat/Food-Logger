// main.js (ES module)
import { waitForUser, signOutNow } from "./auth.js";
import { FirestoreStorage } from "./storage-firestore.js";
window.__storage = FirestoreStorage;
// import { LocalStorageAdapter } from "./storage-local.js";

(async () => {
  const user = await waitForUser();
  if (!user) {
    // Not signed in; send to login
    window.location.href = "index.html";
    return;
  }

  // Put the signed-in name on the page
  const who = document.getElementById("who");
  if (who) who.textContent = `signed in as @${user.displayName || user.email || "user"}`;

  // Logout button
  document.getElementById("btn-logout")?.addEventListener("click", async () => {
    await signOutNow();
    window.location.href = "index.html";
  });

  // Pick storage
  window.__storage = FirestoreStorage; // or LocalStorageAdapter(user.uid)

  // Now run your existing app logic (script.js expects a global adapter)
  // tiny patch: we call an initializer your script exposes:
  if (typeof window.bootFoodApp === "function") {
    window.bootFoodApp();
  } else {
    console.error("bootFoodApp() not found. Make sure script.js defines it.");
  }
})();
