/* ============================================================
   DAX — local data layer
   Everything lives on-device in IndexedDB. No server, no login.
   A single key-value store keeps Phase 0 simple; later phases
   add typed records (workouts, sets, weigh-ins) on top of this.
   ============================================================ */

const DB_NAME = 'dax';
const DB_VERSION = 1;
const STORE = 'kv';

let _dbPromise = null;

function openDB() {
  if (_dbPromise) return _dbPromise;
  _dbPromise = new Promise((resolve, reject) => {
    const req = indexedDB.open(DB_NAME, DB_VERSION);
    req.onupgradeneeded = () => {
      const db = req.result;
      if (!db.objectStoreNames.contains(STORE)) {
        db.createObjectStore(STORE);
      }
    };
    req.onsuccess = () => resolve(req.result);
    req.onerror = () => reject(req.error);
  });
  return _dbPromise;
}

function tx(mode, fn) {
  return openDB().then(db => new Promise((resolve, reject) => {
    const t = db.transaction(STORE, mode);
    const store = t.objectStore(STORE);
    const result = fn(store);
    t.oncomplete = () => resolve(result && result.__req ? result.__req.result : result);
    t.onerror = () => reject(t.error);
    t.onabort = () => reject(t.error);
  }));
}

export const db = {
  async get(key, fallback = null) {
    const v = await tx('readonly', s => ({ __req: s.get(key) }));
    return v === undefined || v === null ? fallback : v;
  },
  async set(key, value) {
    await tx('readwrite', s => { s.put(value, key); });
    return value;
  },
  async del(key) {
    await tx('readwrite', s => { s.delete(key); });
  },
  async keys() {
    return tx('readonly', s => ({ __req: s.getAllKeys() }));
  },
  async dump() {
    const keys = await this.keys();
    const out = {};
    for (const k of keys) out[k] = await this.get(k);
    return out;
  },
};

/* ---------- backup / restore (the "data can't vanish" promise) ---------- */
export async function exportBackup() {
  const data = await db.dump();
  return JSON.stringify({ app: 'dax', version: DB_VERSION, exportedAt: new Date().toISOString(), data }, null, 2);
}

export async function importBackup(json) {
  const parsed = typeof json === 'string' ? JSON.parse(json) : json;
  if (!parsed || parsed.app !== 'dax') throw new Error('Not a DAX backup file');
  for (const [k, v] of Object.entries(parsed.data || {})) await db.set(k, v);
  return Object.keys(parsed.data || {}).length;
}

/* ---------- tiny settings helper ---------- */
export const settings = {
  async all() { return (await db.get('settings', {})) || {}; },
  async get(key, fallback = null) {
    const s = await this.all();
    return key in s ? s[key] : fallback;
  },
  async set(key, value) {
    const s = await this.all();
    s[key] = value;
    await db.set('settings', s);
    return value;
  },
};
