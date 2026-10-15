import { SEED, DEFAULT_HABITS } from "./data.js";

const LS_KEY = "tt3";
const IDB_NAME = "FullbodyHIT_DB";

export function isoToday() {
  const d = new Date();
  return `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, "0")}-${String(d.getDate()).padStart(2, "0")}`;
}

export function freshToday() {
  return {
    stamp: isoToday(),
    date: isoToday(),
    ex: {},
    cardio: {},
    sleepOk: null,
    supp: {},
    water: 0,
    habitsDone: {}
  };
}

export function freshNtDone() {
  return { date: isoToday(), tier: "", checked: {} };
}

export function normalizeEntry(e) {
  if (!e || typeof e !== "object") return { kg: null, reps: null, note: "" };
  let kg = e.kg;
  let reps = e.reps;
  let note = typeof e.note === "string" ? e.note : "";

  if (typeof kg === "string") {
    const clean = kg.trim().replace(",", ".");
    const m = clean.match(/^(\d+(?:\.\d+)?)\s*(?:kg)?$/i);
    if (m) kg = parseFloat(m[1]);
    else if (clean) { note = note ? `${clean} · ${note}` : clean; kg = null; }
    else kg = null;
  }
  if (typeof reps === "string") {
    const clean = reps.trim();
    const m = clean.match(/^(\d+)$/);
    if (m) reps = parseInt(m[1], 10);
    else if (clean) { note = note ? `${note} (${clean})` : clean; reps = null; }
    else reps = null;
  }
  return {
    kg: typeof kg === "number" && !isNaN(kg) ? kg : null,
    reps: typeof reps === "number" && !isNaN(reps) ? reps : null,
    note: note.trim()
  };
}

function seedLog() {
  const l = { "1": {}, "2": {}, "3": {} };
  Object.keys(SEED).forEach(d => {
    Object.keys(SEED[d]).forEach(n => { l[d][n] = normalizeEntry(SEED[d][n]); });
  });
  return l;
}

export const store = {
  state: { day: "1", page: "page-treino" },
  log: seedLog(),
  hist: [],
  dayUI: freshToday(),
  ntState: { scenario: "", mode: "low", suppFilter: "auto" },
  ntDone: freshNtDone(),
  habits: [...DEFAULT_HABITS],
  tasks: [],
  dailyLogs: {},
  cloud: { url: "", key: "", syncId: "tomas-main" }
};

const listeners = [];
export function onStoreChange(fn) {
  listeners.push(fn);
}

function archiveDayIfNeeded(oldUI) {
  if (!oldUI || !oldUI.stamp) return;
  const cardioDone = Object.values(oldUI.cardio || {}).filter(c => c && c.done).length;
  const suppDone = Object.values(oldUI.supp || {}).filter(Boolean).length;
  const habitsDone = Object.values(oldUI.habitsDone || {}).filter(Boolean).length;
  const water = oldUI.water || 0;
  if (water > 0 || cardioDone > 0 || suppDone > 0 || habitsDone > 0) {
    store.dailyLogs[oldUI.stamp] = {
      water,
      cardioDone,
      suppDone,
      habitsDone,
      sleepOk: oldUI.sleepOk
    };
  }
}

export function saveTodaySnapshot() {
  archiveDayIfNeeded(store.dayUI);
}

export function validateAndApplyBlob(b) {
  if (!b || typeof b !== "object") throw new Error("Ficheiro JSON inválido.");
  if (typeof b.v !== "number" || b.v < 1 || b.v > 10) {
    throw new Error("Versão do backup incompatível.");
  }
  if (!b.state || typeof b.state !== "object" || !b.log || typeof b.log !== "object") {
    throw new Error("Estrutura de dados corrompida.");
  }

  store.state = {
    day: ["1", "2", "3"].includes(String(b.state.day)) ? String(b.state.day) : "1",
    page: typeof b.state.page === "string" ? b.state.page : "page-treino"
  };

  store.log = { "1": {}, "2": {}, "3": {} };
  ["1", "2", "3"].forEach(d => {
    const src = b.log[d] || {};
    Object.keys(src).forEach(exName => {
      store.log[d][exName] = normalizeEntry(src[exName]);
    });
  });

  store.hist = Array.isArray(b.hist) ? b.hist.map(h => {
    const entries = {};
    Object.keys(h.entries || {}).forEach(exName => {
      entries[exName] = normalizeEntry(h.entries[exName]);
    });
    return {
      day: String(h.day || "1"),
      focus: String(h.focus || ""),
      date: String(h.date || isoToday()),
      entries,
      ts: Number(h.ts) || Date.now()
    };
  }) : [];

  store.dailyLogs = (b.dailyLogs && typeof b.dailyLogs === "object") ? b.dailyLogs : {};

  const incomingUI = b.dayUI || freshToday();
  if ((incomingUI.stamp || incomingUI.date) !== isoToday()) {
    archiveDayIfNeeded(incomingUI);
    store.dayUI = freshToday();
  } else {
    store.dayUI = {
      ...freshToday(),
      ...incomingUI,
      habitsDone: incomingUI.habitsDone || {}
    };
  }

  store.ntState = {
    scenario: b.ntState?.scenario || "",
    mode: b.ntState?.mode || "low",
    suppFilter: b.ntState?.suppFilter || "auto"
  };

  const incomingNtDone = b.ntDone || freshNtDone();
  store.ntDone = incomingNtDone.date === isoToday() ? incomingNtDone : freshNtDone();

  store.habits = Array.isArray(b.habits) ? b.habits : [...DEFAULT_HABITS];
  store.tasks = Array.isArray(b.tasks) ? b.tasks : [];
  store.cloud = (b.cloud && typeof b.cloud === "object") ? {
    url: b.cloud.url || "",
    key: b.cloud.key || "",
    syncId: b.cloud.syncId || "tomas-main"
  } : { url: "", key: "", syncId: "tomas-main" };
}

export function buildBlob() {
  saveTodaySnapshot();
  return {
    v: 4,
    ts: Date.now(),
    state: store.state,
    log: store.log,
    hist: store.hist.slice(-120),
    dayUI: store.dayUI,
    ntState: store.ntState,
    ntDone: store.ntDone,
    habits: store.habits,
    tasks: store.tasks,
    dailyLogs: store.dailyLogs,
    cloud: store.cloud
  };
}

/* LIGAÇÃO SINGLETON AO INDEXEDDB (Sem fugas de ligações) */
let dbPromise = null;
function getDB() {
  if (!dbPromise) {
    dbPromise = new Promise((resolve, reject) => {
      try {
        const req = indexedDB.open(IDB_NAME, 1);
        req.onupgradeneeded = e => {
          const db = e.target.result;
          if (!db.objectStoreNames.contains("store")) db.createObjectStore("store");
        };
        req.onsuccess = e => {
          const db = e.target.result;
          db.onversionchange = () => { db.close(); dbPromise = null; };
          resolve(db);
        };
        req.onerror = e => { dbPromise = null; reject(e); };
      } catch (err) {
        dbPromise = null;
        reject(err);
      }
    });
  }
  return dbPromise;
}

function idbSave(blob) {
  getDB().then(db => {
    const tx = db.transaction("store", "readwrite");
    tx.objectStore("store").put(blob, "state");
  }).catch(() => {});
}

let debounceTimer = null;
let cloudTimer = null;

function setSyncDot(saving) {
  const dot = document.getElementById("sync-dot");
  if (dot) dot.classList.toggle("saving", saving);
}

export function persist() {
  clearTimeout(debounceTimer);
  const blob = buildBlob();
  try { localStorage.setItem(LS_KEY, JSON.stringify(blob)); } catch (e) {}
  idbSave(blob);
  setSyncDot(false);
  listeners.forEach(fn => fn());

  if (store.cloud.url && store.cloud.key) {
    clearTimeout(cloudTimer);
    cloudTimer = setTimeout(() => cloudPush(blob), 1500);
  }
}

export function persistDebounced(ms = 300) {
  setSyncDot(true);
  clearTimeout(debounceTimer);
  debounceTimer = setTimeout(() => persist(), ms);
}

export function loadStore() {
  return new Promise(resolve => {
    let raw = null;
    try { raw = localStorage.getItem(LS_KEY); } catch (e) {}
    if (raw) {
      try {
        validateAndApplyBlob(JSON.parse(raw));
        resolve();
        return;
      } catch (e) {}
    }
    getDB().then(db => {
      const getReq = db.transaction("store", "readonly").objectStore("store").get("state");
      getReq.onsuccess = () => {
        if (getReq.result) {
          try { validateAndApplyBlob(getReq.result); } catch (e) {}
        }
        persist();
        resolve();
      };
      getReq.onerror = () => { persist(); resolve(); };
    }).catch(() => {
      persist();
      resolve();
    });
  });
}

/* SUPABASE CLOUD SYNC OPCIONAL (REST API NATIVA) */
export async function cloudPush(blob = buildBlob()) {
  const { url, key, syncId } = store.cloud;
  if (!url || !key) return false;
  const endpoint = `${url.replace(/\/$/, "")}/rest/v1/life_os_sync`;
  try {
    const res = await fetch(endpoint, {
      method: "POST",
      headers: {
        "apikey": key,
        "Authorization": `Bearer ${key}`,
        "Content-Type": "application/json",
        "Prefer": "resolution=merge-duplicates"
      },
      body: JSON.stringify({ id: syncId || "tomas-main", payload: blob, updated_at: new Date().toISOString() })
    });
    return res.ok;
  } catch (e) {
    return false;
  }
}

export async function cloudPull() {
  const { url, key, syncId } = store.cloud;
  if (!url || !key) return false;
  const endpoint = `${url.replace(/\/$/, "")}/rest/v1/life_os_sync?id=eq.${encodeURIComponent(syncId || "tomas-main")}&select=payload`;
  try {
    const res = await fetch(endpoint, {
      headers: { "apikey": key, "Authorization": `Bearer ${key}` }
    });
    if (!res.ok) return false;
    const rows = await res.json();
    if (rows && rows[0] && rows[0].payload) {
      const cloudConfig = { ...store.cloud };
      validateAndApplyBlob(rows[0].payload);
      store.cloud = cloudConfig;
      persist();
      return true;
    }
    return false;
  } catch (e) {
    return false;
  }
}

export function wipeAllData() {
  try { localStorage.removeItem(LS_KEY); } catch (e) {}
  try { indexedDB.deleteDatabase(IDB_NAME); } catch (e) {}
  window.location.reload();
}