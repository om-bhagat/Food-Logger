// Show/hide custom consent block
const radios = document.querySelectorAll('input[name="consent"]');
const customBlock = document.getElementById('customBlock');

function toggleCustom() {
  const val = document.querySelector('input[name="consent"]:checked').value;
  customBlock.style.display = val === 'custom' ? 'block' : 'none';
}

radios.forEach(r => r.addEventListener('change', toggleCustom));
toggleCustom();

// Save + redirect
document.getElementById("questionnaireForm").addEventListener("submit", (e) => {
  e.preventDefault();

  const allergies = document.getElementById("allergies").value.trim();

  if (!allergies) {
    alert("Please fill in your allergies (or type N/A if none).");
    return;
  }

  const payload = {
    allergies,
    consent: document.querySelector('input[name="consent"]:checked').value,
    share: {
      food:   document.querySelector('input[name="share_food"]')?.checked || false,
      time:   document.querySelector('input[name="share_time"]')?.checked || false,
      outcome:document.querySelector('input[name="share_outcome"]')?.checked || false,
      notes:  document.querySelector('input[name="share_notes"]')?.checked || false,
    }
  };

  localStorage.setItem("questionnaireCompleted", "true");
  localStorage.setItem("questionnaireData", JSON.stringify(payload));

  // Redirect to index
  window.location.href = "/Food-Logger/index.html";
});

// Skip keeps defaults
document.getElementById("skipBtn").addEventListener("click", () => {
  localStorage.setItem("questionnaireCompleted", "skipped");
  window.location.href = "../index.html";
});
