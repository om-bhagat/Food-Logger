// script.js — Food & Outcome Log (Firestore adapter version)

// main.js will call this AFTER Firebase auth is ready
window.bootFoodApp = function bootFoodApp() {runFoodApp();};

async function runFoodApp() {
  // --- helpers ---
  const $  = sel => document.querySelector(sel);
  const $$ = sel => Array.from(document.querySelectorAll(sel));
  const fmt = (d) => new Date(d).toLocaleString([], {
    year:'numeric', month:'short', day:'2-digit', hour:'2-digit', minute:'2-digit'
  });
  const deepCopy = (v) => JSON.parse(JSON.stringify(v));
  const uid = () => Math.random().toString(36).slice(2) + Date.now().toString(36);

  if (!window.__storage || !window.__storage.listAll) {
    console.error("Storage adapter missing. Did main.js set window.__storage?");
    return;
  }

  // --- state ---
  const state = { items: [], sortDesc: true };

  // --- elements ---
  const form   = $('#entry-form');
  const fId    = $('#id');
  const fFood  = $('#food');
  const fWhen  = $('#when');
  const fNotes = $('#notes');
  const outRadios = $$('input[name="outcome"]');

  const ingName  = $('#ing-name');
  const ingQty   = $('#ing-qty');
  const ingUnit  = $('#ing-unit');
  const ingTbody = $('#ing-tbody');
  let ing = []; // [{name, qty, unit}]

  // ---------- Outcome chips ----------
  function refreshOutcomeChips(){
    const val = (outRadios.find(r=>r.checked)||{}).value;
    $$('.chip').forEach(ch => ch.classList.toggle('sel', ch.dataset.val===val));
  }
  outRadios.forEach(r => r.addEventListener('change', refreshOutcomeChips));

  // ---------- Date default ----------
  function defaultWhen(){
    const now = new Date();
    const isoLocal = new Date(now.getTime() - now.getTimezoneOffset()*60000)
      .toISOString().slice(0,16);
    fWhen.value = isoLocal;
  }

  // ---------- Ingredients helpers ----------
  function clearIngInputs(){
    ingName.value = ''; ingQty.value = ''; ingUnit.value = ''; ingName.focus();
  }
  function addIngredientFromInputs(){
    const name = ingName.value.trim();
    const qty  = ingQty.value.trim();
    const unit = ingUnit.value.trim();
    if(!name) return;
    ing.push({ name, qty, unit });
    renderIngredients();
    clearIngInputs();
  }
  function renderIngredients(){
    ingTbody.innerHTML = '';
    ing.forEach((row, i) => {
      const tr = document.createElement('tr');

      const tdName = document.createElement('td');
      const iName = document.createElement('input');
      iName.value = row.name; iName.placeholder = 'Item';
      iName.addEventListener('input', e => { ing[i].name = e.target.value; });
      tdName.appendChild(iName);

      const tdQty = document.createElement('td');
      const iQty = document.createElement('input');
      iQty.value = row.qty || ''; iQty.placeholder = 'Qty';
      iQty.addEventListener('input', e => { ing[i].qty = e.target.value; });
      tdQty.appendChild(iQty);

      const tdUnit = document.createElement('td');
      const iUnit = document.createElement('input');
      iUnit.value = row.unit || ''; iUnit.placeholder = 'Unit';
      iUnit.addEventListener('input', e => { ing[i].unit = e.target.value; });
      tdUnit.appendChild(iUnit);

      const tdAct = document.createElement('td');
      const del = document.createElement('button');
      del.type='button'; del.className='btn'; del.textContent='Remove';
      del.addEventListener('click', () => { ing.splice(i,1); renderIngredients(); });
      tdAct.appendChild(del);

      tr.append(tdName, tdQty, tdUnit, tdAct);
      ingTbody.appendChild(tr);
    });
  }

  // Add/clear buttons + Enter key on ingredient name
  $('#btn-ing-add').addEventListener('click', addIngredientFromInputs);
  $('#btn-ing-clear').addEventListener('click', () => {
    if(confirm('Clear all ingredients?')){ ing = []; renderIngredients(); }
  });
  ingName.addEventListener('keydown', (e)=>{
    if(e.key === 'Enter'){ e.preventDefault(); addIngredientFromInputs(); }
  });

  // ---------- Form reset ----------
  function resetForm(){
    fId.value = ''; fFood.value = ''; fNotes.value = '';
    outRadios.forEach(r=> r.checked=false);
    refreshOutcomeChips();
    defaultWhen();
    ing = []; renderIngredients();
    fFood.focus();
    $('#btn-save').textContent = 'Save';
  }

  // ---------- Save / Update (Firestore adapter) ----------
  form.addEventListener('submit', async (e)=>{
    e.preventDefault();
    const food = fFood.value.trim();
    if(!food){ fFood.focus(); return; }
    const when = fWhen.value ? new Date(fWhen.value).toISOString() : new Date().toISOString();
    const outcome = (outRadios.find(r=>r.checked)||{}).value || '';
    const notes = fNotes.value.trim();
    const ingredients = ing.filter(x => x.name && x.name.trim() !== '');

    const entry = { id: fId.value || null, when, food, outcome, notes, ingredients };

    if (entry.id) {
      await window.__storage.update(entry.id, entry);
    } else {
      const saved = await window.__storage.create(entry);
      entry.id = saved.id;
    }

    state.items = await window.__storage.listAll();
    render();
    resetForm();
  });

  // Keyboard shortcut Ctrl/Cmd+Enter to save
  form.addEventListener('keydown', (e)=>{
    if((e.ctrlKey || e.metaKey) && e.key==='Enter'){
      e.preventDefault();
      $('#btn-save').click();
    }
  });

  // Clear form
  $('#btn-clear').addEventListener('click', resetForm);

  // Same as last (including ingredients)
  $('#btn-last').addEventListener('click', ()=>{
    const last = [...state.items].sort((a,b)=> new Date(b.when)-new Date(a.when))[0];
    if(!last) return;
    fFood.value = last.food;
    fNotes.value = last.notes || '';
    const r = outRadios.find(r=>r.value===last.outcome);
    if(r){ r.checked = true; refreshOutcomeChips(); }
    ing = deepCopy(last.ingredients || []); renderIngredients();
    defaultWhen(); fFood.focus();
  });

  // Nuke all (danger)
  $('#btn-nuke').addEventListener('click', async ()=>{
    if(!confirm('Delete ALL entries? This cannot be undone.')) return;
    // Delete each entry via adapter
    for (const it of state.items) {
      try { await window.__storage.remove(it.id); } catch {}
    }
    state.items = await window.__storage.listAll();
    render(); resetForm();
  });

  // ---------- Filters ----------
  const q = $('#q');
  const fOutcome = $('#f-outcome');
  const fRange = $('#f-range');
  q.addEventListener('input', render);
  fOutcome.addEventListener('change', render);
  fRange.addEventListener('change', render);

  // Sort toggle
  $('#btn-sort').addEventListener('click', ()=>{
    state.sortDesc = !state.sortDesc;
    $('#btn-sort').textContent = state.sortDesc? 'Sort: New → Old' : 'Sort: Old → New';
    render();
  });

  // Share last (from filtered set)
  $('#btn-share').addEventListener('click', async ()=>{
    const last = [...filtered()].sort((a,b)=> new Date(b.when)-new Date(a.when))[0];
    if(!last){ alert('Nothing to share.'); return; }
    const ingStr = ingredientsToString(last.ingredients);
    const text = `Food: ${last.food}\nOutcome: ${labelFor(last.outcome)}\nWhen: ${fmt(last.when)}\nIngredients: ${ingStr || '-'}\nNotes: ${last.notes||'-'}`;
    if(navigator.share){
      try{ await navigator.share({ title:'Food log', text }); }catch{}
    } else {
      try{ await navigator.clipboard.writeText(text); alert('Copied to clipboard!'); }
      catch{ alert(text); }
    }
  });

  // ---------- Export / Import ----------
  const stamp = new Date().toISOString().slice(0,10);
  $('#btn-export-json').addEventListener('click', ()=>{
    download(`food-log-${stamp}.json`, JSON.stringify(state.items, null, 2));
  });
  $('#btn-export-csv').addEventListener('click', ()=>{
    download(`food-log-${stamp}.csv`, toCSV(state.items));
  });

  function download(name, text){
    const a = document.createElement('a');
    a.href = URL.createObjectURL(new Blob([text], {type:'text/plain'}));
    a.download = name; a.click(); URL.revokeObjectURL(a.href);
  }

  function ingredientsToString(arr){
    if(!arr || !arr.length) return '';
    return arr.map(x => {
      const q = (x.qty ? x.qty : '').toString().trim();
      const u = (x.unit ? x.unit : '').toString().trim();
      return (q || u) ? `${x.name} (${[q,u].filter(Boolean).join(' ')})` : x.name;
    }).join('; ');
  }

  function toCSV(rows){
    const esc = v => '"' + String(v??'').replaceAll('"','""') + '"';
    const header = ['id','when','food','outcome','notes','ingredients'];
    const lines = [header.map(esc).join(',')];
    for(const r of rows){
      const ingStr = ingredientsToString(r.ingredients);
      lines.push([r.id, r.when, r.food, r.outcome, r.notes, ingStr].map(esc).join(','));
    }
    return lines.join('\n');
  }

  // Import (JSON) -> write each to Firestore
  $('#file-import').addEventListener('change', async (e)=>{
    const file = e.target.files[0]; if(!file) return;
    try{
      const text = await file.text();
      const arr = JSON.parse(text);
      if(!Array.isArray(arr)) throw new Error('Invalid JSON');
      for(const it of arr){
        const entry = {
          id: null,
          when: it.when || new Date().toISOString(),
          food: it.food || '',
          outcome: it.outcome || '',
          notes: it.notes || '',
          ingredients: Array.isArray(it.ingredients) ? it.ingredients : []
        };
        await window.__storage.create(entry);
      }
      state.items = await window.__storage.listAll();
      render(); alert('Imported!');
    } catch(err){
      alert('Import failed: ' + err.message);
    }
    e.target.value = '';
  });

  // ---------- Rendering ----------
  function labelFor(val){
    return val==='great'? 'Great' : val==='meh'? 'Meh' : val==='bad'? 'Not great' : '—';
  }

  function filtered(){
    const text = q.value.trim().toLowerCase();
    const o = fOutcome.value;
    const rng = fRange.value;
    const after = (rng==='all')? new Date(0) : new Date(Date.now() - Number(rng)*86400000);
    return state.items.filter(it => {
      const matchesText =
        !text ||
        it.food.toLowerCase().includes(text) ||
        (it.notes||'').toLowerCase().includes(text) ||
        (it.ingredients||[]).some(x => (x.name||'').toLowerCase().includes(text));
      const matchesOutcome = (!o || it.outcome===o);
      const inRange = (new Date(it.when) >= after);
      return matchesText && matchesOutcome && inRange;
    });
  }

  function render(){
    const items = filtered().sort((a,b)=>
      state.sortDesc ? (new Date(b.when)-new Date(a.when)) : (new Date(a.when)-new Date(b.when))
    );
    const list = $('#list'); list.innerHTML = '';
    $('#count').textContent = `${items.length} entr${items.length===1?'y':'ies'} shown`;

    for(const it of items){
      const wrap = document.createElement('div'); wrap.className='item'; wrap.dataset.id = it.id;
      const left = document.createElement('div');
      const right = document.createElement('div'); right.className='actions';

      const h = document.createElement('h3'); h.textContent = it.food;
      const meta = document.createElement('div'); meta.className='meta'; meta.textContent = fmt(it.when);
      left.appendChild(h); left.appendChild(meta);

      if((it.ingredients||[]).length){
        const ingLine = document.createElement('div'); ingLine.className='ing-line';
        const label = document.createElement('span'); label.className='muted'; label.textContent = 'Ingredients: ';
        ingLine.appendChild(label);
        for(const x of it.ingredients){
          const tag = document.createElement('span'); tag.className='tag';
          tag.textContent = x.name + (x.qty || x.unit ? ` (${[x.qty||'', x.unit||''].filter(Boolean).join(' ')})` : '');
          ingLine.appendChild(tag);
        }
        left.appendChild(ingLine);
      }

      if(it.notes){
        const notes = document.createElement('div'); notes.className='muted'; notes.textContent = it.notes;
        left.appendChild(notes);
      }

      const badge = document.createElement('span');
      badge.className = 'badge ' + (it.outcome==='great'?'ok': it.outcome==='meh'?'meh': it.outcome==='bad'?'bad':'');
      badge.textContent = labelFor(it.outcome);

      wrap.appendChild(left);
      wrap.appendChild(right);

      // actions
      const bEdit = btn('Edit', ()=> edit(it.id));
      const bDup  = btn('Duplicate', ()=> duplicate(it.id));
      const bDel  = btn('Delete', ()=> del(it.id));
      right.append(badge, bEdit, bDup, bDel);

      list.appendChild(wrap);
    }
    renderStats();
  }

  function btn(label, onClick){
    const b = document.createElement('button');
    b.type='button'; b.className='btn'; b.textContent = label; b.addEventListener('click', onClick);
    return b;
  }

  async function edit(id){
    const it = state.items.find(x=>x.id===id); if(!it) return;
    fId.value = it.id; fFood.value = it.food; fNotes.value = it.notes||'';
    const r = outRadios.find(r=>r.value===it.outcome);
    if(r){ r.checked=true; } else { outRadios.forEach(r=>r.checked=false); }
    refreshOutcomeChips();

    const d = new Date(it.when);
    const iso = new Date(d.getTime() - d.getTimezoneOffset()*60000).toISOString().slice(0,16);
    fWhen.value = iso;

    ing = deepCopy(it.ingredients || []); renderIngredients();
    $('#btn-save').textContent = 'Update';
    fFood.focus(); window.scrollTo({ top: 0, behavior: 'smooth' });
  }

  async function duplicate(id){
    const it = state.items.find(x=>x.id===id); if(!it) return;
    const copy = { ...it, id: null, when: new Date().toISOString() };
    await window.__storage.create(copy);
    state.items = await window.__storage.listAll();
    render();
  }

  async function del(id){
    if(!confirm('Delete this entry?')) return;
    await window.__storage.remove(id);
    state.items = await window.__storage.listAll();
    render();
  }

  // Stats
  function countWithin(days){
    const after = new Date(Date.now() - days*86400000);
    const rows = state.items.filter(x=> new Date(x.when) >= after);
    const t = rows.length;
    const g = rows.filter(x=>x.outcome==='great').length;
    const m = rows.filter(x=>x.outcome==='meh').length;
    const b = rows.filter(x=>x.outcome==='bad').length;
    return {t,g,m,b};
  }
  function renderStats(){
    const tb = $('#stats tbody'); tb.innerHTML = '';
    for(const [label,days] of [['7 days',7],['30 days',30],['90 days',90]]){
      const {t,g,m,b} = countWithin(days);
      const tr = document.createElement('tr');
      tr.innerHTML = `<td>${label}</td><td>${t}</td><td>${g}</td><td>${m}</td><td>${b}</td>`;
      tb.appendChild(tr);
    }
  }

  // ---------- init ----------
  resetForm();
  state.items = await window.__storage.listAll();  // initial fetch from Firestore
  render();
  refreshOutcomeChips();
}
// script.js — Food & Outcome Log (Firestore adapter version)

// main.js will call this AFTER Firebase auth is ready
window.bootFoodApp = function bootFoodApp() {
  runFoodApp().catch(err => console.error(err));
};

async function runFoodApp() {
  const $  = sel => document.querySelector(sel);
  const $$ = sel => Array.from(document.querySelectorAll(sel));
  const fmt = (d) => new Date(d).toLocaleString([], {
    year:'numeric', month:'short', day:'2-digit', hour:'2-digit', minute:'2-digit'
  });
  const deepCopy = (v) => JSON.parse(JSON.stringify(v));

  if (!window.__storage || !window.__storage.listAll) {
    console.error("Storage adapter missing. Did main.js set window.__storage = FirestoreStorage?");
    return;
  }

  const state = { items: [], sortDesc: true };

  // Elements
  const form   = $('#entry-form');
  const fId    = $('#id');
  const fFood  = $('#food');
  const fWhen  = $('#when');
  const fNotes = $('#notes');
  const outRadios = $$('input[name="outcome"]');

  const ingName  = $('#ing-name');
  const ingQty   = $('#ing-qty');
  const ingUnit  = $('#ing-unit');
  const ingTbody = $('#ing-tbody');
  let ing = [];

  function refreshOutcomeChips(){
    const val = (outRadios.find(r=>r.checked)||{}).value;
    $$('.chip').forEach(ch => ch.classList.toggle('sel', ch.dataset.val===val));
  }
  outRadios.forEach(r => r.addEventListener('change', refreshOutcomeChips));

  function defaultWhen(){
    const now = new Date();
    const isoLocal = new Date(now.getTime() - now.getTimezoneOffset()*60000).toISOString().slice(0,16);
    fWhen.value = isoLocal;
  }

  function clearIngInputs(){ ingName.value=''; ingQty.value=''; ingUnit.value=''; ingName.focus(); }
  function addIngredientFromInputs(){
    const name = ingName.value.trim(); const qty = ingQty.value.trim(); const unit = ingUnit.value.trim();
    if(!name) return; ing.push({ name, qty, unit }); renderIngredients(); clearIngInputs();
  }
  function renderIngredients(){
    ingTbody.innerHTML = '';
    ing.forEach((row, i) => {
      const tr = document.createElement('tr');

      const tdName = document.createElement('td');
      const iName = document.createElement('input');
      iName.value = row.name; iName.placeholder = 'Item';
      iName.addEventListener('input', e => { ing[i].name = e.target.value; });
      tdName.appendChild(iName);

      const tdQty = document.createElement('td');
      const iQty = document.createElement('input');
      iQty.value = row.qty || ''; iQty.placeholder = 'Qty';
      iQty.addEventListener('input', e => { ing[i].qty = e.target.value; });
      tdQty.appendChild(iQty);

      const tdUnit = document.createElement('td');
      const iUnit = document.createElement('input');
      iUnit.value = row.unit || ''; iUnit.placeholder = 'Unit';
      iUnit.addEventListener('input', e => { ing[i].unit = e.target.value; });
      tdUnit.appendChild(iUnit);

      const tdAct = document.createElement('td');
      const del = document.createElement('button');
      del.type='button'; del.className='btn'; del.textContent='Remove';
      del.addEventListener('click', () => { ing.splice(i,1); renderIngredients(); });
      tdAct.appendChild(del);

      tr.append(tdName, tdQty, tdUnit, tdAct);
      ingTbody.appendChild(tr);
    });
  }

  $('#btn-ing-add').addEventListener('click', addIngredientFromInputs);
  $('#btn-ing-clear').addEventListener('click', () => { if(confirm('Clear all ingredients?')){ ing=[]; renderIngredients(); }});
  ingName.addEventListener('keydown', (e)=>{ if(e.key==='Enter'){ e.preventDefault(); addIngredientFromInputs(); }});

  function resetForm(){
    fId.value=''; fFood.value=''; fNotes.value='';
    outRadios.forEach(r=> r.checked=false); refreshOutcomeChips();
    defaultWhen(); ing=[]; renderIngredients();
    fFood.focus(); $('#btn-save').textContent = 'Save';
  }

  // Save / Update via Firestore adapter
  form.addEventListener('submit', async (e)=>{
    e.preventDefault();
    const food = fFood.value.trim(); if(!food){ fFood.focus(); return; }
    const when = fWhen.value ? new Date(fWhen.value).toISOString() : new Date().toISOString();
    const outcome = (outRadios.find(r=>r.checked)||{}).value || '';
    const notes = fNotes.value.trim();
    const ingredients = ing.filter(x => x.name && x.name.trim() !== '');

    const entry = { id: fId.value || null, when, food, outcome, notes, ingredients };

    try {
      if (entry.id) {
        await window.__storage.update(entry.id, entry);
      } else {
        const saved = await window.__storage.create(entry);
        entry.id = saved.id;
      }
      state.items = await window.__storage.listAll();
      render();
      resetForm();
    } catch (err) {
      console.error(err);
      alert((err && err.message) || String(err));
    }
  });

  // Shortcuts & actions
  form.addEventListener('keydown', (e)=>{ if((e.ctrlKey||e.metaKey) && e.key==='Enter'){ e.preventDefault(); $('#btn-save').click(); }});
  $('#btn-clear').addEventListener('click', resetForm);
  $('#btn-last').addEventListener('click', ()=>{
    const last = [...state.items].sort((a,b)=> new Date(b.when)-new Date(a.when))[0];
    if(!last) return;
    fFood.value = last.food; fNotes.value = last.notes || '';
    const r = outRadios.find(r=>r.value===last.outcome); if(r){ r.checked=true; refreshOutcomeChips(); }
    ing = deepCopy(last.ingredients || []); renderIngredients(); defaultWhen(); fFood.focus();
  });
  $('#btn-nuke').addEventListener('click', async ()=>{
    if(!confirm('Delete ALL entries? This cannot be undone.')) return;
    for (const it of state.items) { try { await window.__storage.remove(it.id); } catch {} }
    state.items = await window.__storage.listAll(); render(); resetForm();
  });

  // Filters
  const q = $('#q'); const fOutcome = $('#f-outcome'); const fRange = $('#f-range');
  q.addEventListener('input', render); fOutcome.addEventListener('change', render); fRange.addEventListener('change', render);

  $('#btn-sort').addEventListener('click', ()=>{
    state.sortDesc = !state.sortDesc;
    $('#btn-sort').textContent = state.sortDesc? 'Sort: New → Old' : 'Sort: Old → New';
    render();
  });

  $('#btn-share').addEventListener('click', async ()=>{
    const last = [...filtered()].sort((a,b)=> new Date(b.when)-new Date(a.when))[0];
    if(!last){ alert('Nothing to share.'); return; }
    const ingStr = ingredientsToString(last.ingredients);
    const text = `Food: ${last.food}\nOutcome: ${labelFor(last.outcome)}\nWhen: ${fmt(last.when)}\nIngredients: ${ingStr || '-'}\nNotes: ${last.notes||'-'}`;
    if(navigator.share){ try{ await navigator.share({ title:'Food log', text }); }catch{} }
    else { try{ await navigator.clipboard.writeText(text); alert('Copied to clipboard!'); } catch{ alert(text); } }
  });

  const stamp = new Date().toISOString().slice(0,10);
  $('#btn-export-json').addEventListener('click', ()=>{ download(`food-log-${stamp}.json`, JSON.stringify(state.items, null, 2)); });
  $('#btn-export-csv').addEventListener('click', ()=>{ download(`food-log-${stamp}.csv`, toCSV(state.items)); });

  function download(name, text){
    const a = document.createElement('a');
    a.href = URL.createObjectURL(new Blob([text], {type:'text/plain'}));
    a.download = name; a.click(); URL.revokeObjectURL(a.href);
  }
  function ingredientsToString(arr){
    if(!arr || !arr.length) return '';
    return arr.map(x => {
      const q = (x.qty ? x.qty : '').toString().trim();
      const u = (x.unit ? x.unit : '').toString().trim();
      return (q || u) ? `${x.name} (${[q,u].filter(Boolean).join(' ')})` : x.name;
    }).join('; ');
  }
  function toCSV(rows){
    const esc = v => '"' + String(v??'').replaceAll('"','""') + '"';
    const header = ['id','when','food','outcome','notes','ingredients'];
    const lines = [header.map(esc).join(',')];
    for(const r of rows){
      const ingStr = ingredientsToString(r.ingredients);
      lines.push([r.id, r.when, r.food, r.outcome, r.notes, ingStr].map(esc).join(','));
    }
    return lines.join('\n');
  }

  $('#file-import').addEventListener('change', async (e)=>{
    const file = e.target.files[0]; if(!file) return;
    try{
      const text = await file.text();
      const arr = JSON.parse(text);
      if(!Array.isArray(arr)) throw new Error('Invalid JSON');
      for(const it of arr){
        const entry = {
          id: null,
          when: it.when || new Date().toISOString(),
          food: it.food || '',
          outcome: it.outcome || '',
          notes: it.notes || '',
          ingredients: Array.isArray(it.ingredients) ? it.ingredients : []
        };
        await window.__storage.create(entry);
      }
      state.items = await window.__storage.listAll();
      render(); alert('Imported!');
    } catch(err){
      alert('Import failed: ' + err.message);
    }
    e.target.value = '';
  });

  function labelFor(val){ return val==='great'? 'Great' : val==='meh'? 'Meh' : val==='bad'? 'Not great' : '—'; }
  function filtered(){
    const text = q.value.trim().toLowerCase();
    const o = fOutcome.value;
    const rng = fRange.value;
    const after = (rng==='all')? new Date(0) : new Date(Date.now() - Number(rng)*86400000);
    return state.items.filter(it => {
      const matchesText =
        !text ||
        it.food.toLowerCase().includes(text) ||
        (it.notes||'').toLowerCase().includes(text) ||
        (it.ingredients||[]).some(x => (x.name||'').toLowerCase().includes(text));
      const matchesOutcome = (!o || it.outcome===o);
      const inRange = (new Date(it.when) >= after);
      return matchesText && matchesOutcome && inRange;
    });
  }
  function render(){
    const items = filtered().sort((a,b)=>
      state.sortDesc ? (new Date(b.when)-new Date(a.when)) : (new Date(a.when)-new Date(b.when))
    );
    const list = $('#list'); list.innerHTML = '';
    $('#count').textContent = `${items.length} entr${items.length===1?'y':'ies'} shown`;

    for(const it of items){
      const wrap = document.createElement('div'); wrap.className='item'; wrap.dataset.id = it.id;
      const left = document.createElement('div');
      const right = document.createElement('div'); right.className='actions';

      const h = document.createElement('h3'); h.textContent = it.food;
      const meta = document.createElement('div'); meta.className='meta'; meta.textContent = fmt(it.when);
      left.appendChild(h); left.appendChild(meta);

      if((it.ingredients||[]).length){
        const ingLine = document.createElement('div'); ingLine.className='ing-line';
        const label = document.createElement('span'); label.className='muted'; label.textContent = 'Ingredients: ';
        ingLine.appendChild(label);
        for(const x of it.ingredients){
          const tag = document.createElement('span'); tag.className='tag';
          tag.textContent = x.name + (x.qty || x.unit ? ` (${[x.qty||'', x.unit||''].filter(Boolean).join(' ')})` : '');
          ingLine.appendChild(tag);
        }
        left.appendChild(ingLine);
      }

      if(it.notes){
        const notes = document.createElement('div'); notes.className='muted'; notes.textContent = it.notes;
        left.appendChild(notes);
      }

      const badge = document.createElement('span');
      badge.className = 'badge ' + (it.outcome==='great'?'ok': it.outcome==='meh'?'meh': it.outcome==='bad'?'bad':'');
      badge.textContent = labelFor(it.outcome);

      wrap.appendChild(left);
      wrap.appendChild(right);

      const bEdit = btn('Edit', ()=> edit(it.id));
      const bDup  = btn('Duplicate', ()=> duplicate(it.id));
      const bDel  = btn('Delete', ()=> del(it.id));
      right.append(badge, bEdit, bDup, bDel);
      list.appendChild(wrap);
    }
    renderStats();
  }
  function btn(label, onClick){
    const b = document.createElement('button');
    b.type='button'; b.className='btn'; b.textContent = label; b.addEventListener('click', onClick);
    return b;
  }
  async function edit(id){
    const it = state.items.find(x=>x.id===id); if(!it) return;
    fId.value = it.id; fFood.value = it.food; fNotes.value = it.notes||'';
    const r = outRadios.find(r=>r.value===it.outcome);
    if(r){ r.checked=true; } else { outRadios.forEach(r=>r.checked=false); }
    refreshOutcomeChips();
    const d = new Date(it.when);
    const iso = new Date(d.getTime() - d.getTimezoneOffset()*60000).toISOString().slice(0,16);
    fWhen.value = iso;
    ing = deepCopy(it.ingredients || []); renderIngredients();
    $('#btn-save').textContent = 'Update';
    fFood.focus(); window.scrollTo({ top: 0, behavior: 'smooth' });
  }
  async function duplicate(id){
    const it = state.items.find(x=>x.id===id); if(!it) return;
    const copy = { ...it, id: null, when: new Date().toISOString() };
    await window.__storage.create(copy);
    state.items = await window.__storage.listAll();
    render();
  }
  async function del(id){
    if(!confirm('Delete this entry?')) return;
    await window.__storage.remove(id);
    state.items = await window.__storage.listAll();
    render();
  }

  function countWithin(days){
    const after = new Date(Date.now() - days*86400000);
    const rows = state.items.filter(x=> new Date(x.when) >= after);
    const t = rows.length;
    const g = rows.filter(x=>x.outcome==='great').length;
    const m = rows.filter(x=>x.outcome==='meh').length;
    const b = rows.filter(x=>x.outcome==='bad').length;
    return {t,g,m,b};
  }
  function renderStats(){
    const tb = $('#stats tbody'); tb.innerHTML = '';
    for(const [label,days] of [['7 days',7],['30 days',30],['90 days',90]]){
      const {t,g,m,b} = countWithin(days);
      const tr = document.createElement('tr');
      tr.innerHTML = `<td>${label}</td><td>${t}</td><td>${g}</td><td>${m}</td><td>${b}</td>`;
      tb.appendChild(tr);
    }
  }

  // init
  function defaultWhenIfEmpty(){ if(!fWhen.value) defaultWhen(); }
  resetForm(); defaultWhenIfEmpty();
  state.items = await window.__storage.listAll(); // initial cloud fetch
  render(); refreshOutcomeChips();
}
