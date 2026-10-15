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

function seedLog() {
  const l = { "1": {}, "2": {}, "3": {} };
  Object.keys(SEED).forEach(d => {
    Object.keys(SEED[d]).forEach(n => { l[d][n] = { ...SEED[d][n] }; });
  });
  return l;
}

export const store = {
  state: { day: "1", page: "page-treino" },
  log: seedLog(),
  hist: [],
  dayUI: freshToday(),
  ntState: { scenario: "", mode: "low" },
  ntDone: freshNtDone(),
  habits: [...DEFAULT_HABITS],
  tasks: []
};

const listeners = [];
export function onStoreChange(fn) {
  listeners.push(fn);
}

export function applyBlob(b) {
  if (!b) return;
  store.state = b.state || { day: "1", page: "page-treino" };
  if (!store.state.page) store.state.page = "page-treino";
  store.log = b.log || seedLog();
  ["1", "2", "3"].forEach(d => { store.log[d] = store.log[d] || {}; });
  store.hist = b.hist || [];
  store.dayUI = b.dayUI || freshToday();
  if ((store.dayUI.stamp || store.dayUI.date) !== isoToday()) {
    store.dayUI = freshToday();
  }
  store.dayUI.habitsDone = store.dayUI.habitsDone || {};
  store.ntState = b.ntState || { scenario: "", mode: "low" };
  store.ntDone = b.ntDone || freshNtDone();
  if (store.ntDone.date !== isoToday()) {
    store.ntDone = freshNtDone();
  }
  store.habits = b.habits || [...DEFAULT_HABITS];
  store.tasks = b.tasks || [];
}

export function buildBlob() {
  return {
    v: 3,
    ts: Date.now(),
    state: store.state,
    log: store.log,
    hist: store.hist.slice(-100),
    dayUI: store.dayUI,
    ntState: store.ntState,
    ntDone: store.ntDone,
    habits: store.habits,
    tasks: store.tasks
  };
}

function idbSave(blob) {
  try {
    const req = indexedDB.open(IDB_NAME, 1);
    req.onupgradeneeded = e => e.target.result.createObjectStore("store");
    req.onsuccess = e => {
      const db = e.target.result;
      db.transaction("store", "readwrite").objectStore("store").put(blob, "state");
    };
  } catch (e) {}
}

export function persist() {
  const blob = buildBlob();
  try { localStorage.setItem(LS_KEY, JSON.stringify(blob)); } catch (e) {}
  idbSave(blob);
  listeners.forEach(fn => fn());
}

export function loadStore() {
  return new Promise(resolve => {
    let raw = null;
    try { raw = localStorage.getItem(LS_KEY); } catch (e) {}
    if (raw) {
      try {
        applyBlob(JSON.parse(raw));
        resolve();
        return;
      } catch (e) {}
    }
    try {
      const req = indexedDB.open(IDB_NAME, 1);
      req.onupgradeneeded = e => e.target.result.createObjectStore("store");
      req.onsuccess = e => {
        const db = e.target.result;
        const getReq = db.transaction("store", "readonly").objectStore("store").get("state");
        getReq.onsuccess = () => {
          if (getReq.result) applyBlob(getReq.result);
          persist();
          resolve();
        };
        getReq.onerror = () => { persist(); resolve(); };
      };
      req.onerror = () => { persist(); resolve(); };
    } catch (e) {
      persist();
      resolve();
    }
  });
}

export function wipeAllData() {
  try { localStorage.removeItem(LS_KEY); } catch (e) {}
  try { indexedDB.deleteDatabase(IDB_NAME); } catch (e) {}
  window.location.reload();
}