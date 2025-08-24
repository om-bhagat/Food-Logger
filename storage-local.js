// storage-local.js (ES module) — optional
const KEY = (user) => `food_outcome_log_v1:${user}`;

export function LocalStorageAdapter(currentUser) {
  const load = () => {
    try { return JSON.parse(localStorage.getItem(KEY(currentUser))) || []; }
    catch { return []; }
  };
  const save = (rows) => localStorage.setItem(KEY(currentUser), JSON.stringify(rows));

  return {
    async listAll() { return load(); },
    async create(entry) {
      const rows = load();
      const id = entry.id || (Math.random().toString(36).slice(2) + Date.now().toString(36));
      const copy = { ...entry, id };
      rows.push(copy); save(rows); return copy;
    },
    async update(id, entry) {
      const rows = load();
      const i = rows.findIndex(r => r.id === id);
      if (i >= 0) { rows[i] = { ...entry, id }; save(rows); }
      return { ...entry, id };
    },
    async remove(id) {
      let rows = load().filter(r => r.id !== id);
      save(rows);
    }
  };
}
