const form = document.getElementById('askForm');
const statusEl = document.getElementById('status');
const answerBox = document.getElementById('answerBox');
const answerEl = document.getElementById('answer');
const ctxEl = document.getElementById('ctx');

document.getElementById('clearBtn').addEventListener('click', () => {
  document.getElementById('question').value = '';
  answerBox.hidden = true;
  statusEl.textContent = '';
});

form.addEventListener('submit', async (e) => {
  e.preventDefault();
  const question = document.getElementById('question').value.trim();
  if (!question) return;

  // Pull user context from previous questionnaire if present
  let qdata = {};
  try {
    qdata = JSON.parse(localStorage.getItem('questionnaireData') || '{}');
  } catch {}

  const payload = {
    question,
    userContext: {
      allergies: qdata.allergies || null,
      consent: qdata.consent || 'unknown',
      share: qdata.share || {}
    }
  };

  statusEl.textContent = 'Thinking…';
  answerBox.hidden = true;
  answerEl.textContent = '';
  ctxEl.textContent = JSON.stringify(payload.userContext, null, 2);

  try {
    const res = await fetch('/api/ask', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify(payload)
    });

    if (!res.ok) {
      const msg = await res.text();
      throw new Error(msg || `HTTP ${res.status}`);
    }
    const data = await res.json();
    answerEl.textContent = data.answer || '(no answer)';
    answerBox.hidden = false;
    statusEl.textContent = '';
  } catch (err) {
    statusEl.textContent = 'Error: ' + err.message;
  }
});
