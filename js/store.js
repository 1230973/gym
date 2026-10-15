import { SEED, SUPP_ITEMS, DEFAULT_HABITS } from "./data.js";

const LS_KEY = "tt3";
const LS_CLOUD_KEY = "tt3_cloud_cfg";
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
    habitsDone: {},
    weight: null
  };
}

export function freshNtDone() {
  return { date: isoToday(), tier: "", checked: {} };
}

export function generateSecureSyncId() {
  const chars = "abcdefghijklmnopqrstuvwxyz0123456789";
  const arr = new Uint8Array(32);
  if (window.crypto && window.crypto.getRandomValues) {
    window.crypto.getRandomValues(arr);
  } else {
    for (let i = 0; i < 32; i++) arr[i] = Math.floor(Math.random() * 256);
  }
  return "los_" + Array.from(arr, b => chars[b % chars.length]).join("");
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
  ts: 0,
  state: { day: "1", page: "page-treino" },
  log: seedLog(),
  hist: [],
  dayUI: freshToday(),
  ntState: { scenario: "", mode: "low", suppFilter: "auto" },
  ntDone: freshNtDone(),
  habits: [...DEFAULT_HABITS],
  tasks: [],
  dailyLogs: {},
  bodyWeight: {},
  editSession: null // { targetTs: number, draft: { day, date, log } }
};

/* CONFIGURAÇÃO CLOUD ISOLADA DO BLOB E DOS BACKUPS */
export const cloudConfig = { url: "", key: "", syncId: "" };

export function loadCloudConfig() {
  try {
    const raw = localStorage.getItem(LS_CLOUD_KEY);
    if (raw) {
      const parsed = JSON.parse(raw);
      cloudConfig.url = parsed.url || "";
      cloudConfig.key = parsed.key || "";
      cloudConfig.syncId = parsed.syncId || generateSecureSyncId();
    } else {
      cloudConfig.syncId = generateSecureSyncId();
    }
  } catch (e) {
    cloudConfig.syncId = generateSecureSyncId();
  }
}

export function saveCloudConfig(url, key, syncId) {
  cloudConfig.url = (url || "").trim();
  cloudConfig.key = (key || "").trim();
  cloudConfig.syncId = (syncId || "").trim() || generateSecureSyncId();
  try {
    localStorage.setItem(LS_CLOUD_KEY, JSON.stringify(cloudConfig));
  } catch (e) {}
}

const listeners = [];
export function onStoreChange(fn) {
  listeners.push(fn);
}

export function computeExpectedSuppCount(scenario, suppFilter) {
  const isWorkout = !scenario || scenario === "high-am" || scenario === "high-pm";
  const showAll = suppFilter === "all" || isWorkout;
  return showAll ? SUPP_ITEMS.length : SUPP_ITEMS.filter(i => !i.workoutOnly).length;
}

function snapshotDayUI(ui) {
  if (!ui || !ui.stamp) return;
  const cardioDone = Object.values(ui.cardio || {}).filter(c => c && c.done).length;
  const suppDone = Object.values(ui.supp || {}).filter(Boolean).length;
  const suppTarget = computeExpectedSuppCount(store.ntState?.scenario, store.ntState?.suppFilter);
  const habitsDone = Object.values(ui.habitsDone || {}).filter(Boolean).length;
  const habitsTarget = (store.habits || []).length;
  const water = ui.water || 0;

  store.dailyLogs[ui.stamp] = {
    water,
    cardioDone,
    suppDone,
    suppTarget,
    habitsDone,
    habitsTarget,
    sleepOk: ui.sleepOk,
    weight: ui.weight != null ? ui.weight : (store.bodyWeight[ui.stamp] ?? null)
  };

  if (ui.weight != null && !isNaN(ui.weight)) {
    store.bodyWeight[ui.stamp] = ui.weight;
  }
}

export function checkRolloverOnWake() {
  const today = isoToday();
  if ((store.dayUI.stamp || store.dayUI.date) !== today) {
    snapshotDayUI(store.dayUI);
    store.dayUI = freshToday();
    store.ntDone = freshNtDone();
    // Rollover automático não altera store.ts para não sobrescrever a cloud sem ação humana
    persist(false);
    return true;
  }
  return false;
}

export function computeSuggestedScenario() {
  const hour = new Date().getHours();
  if (!store.hist.length) {
    return hour < 14 ? "high-am" : "high-pm";
  }
  const last = store.hist[store.hist.length - 1];
  const hoursSince = (Date.now() - (last.ts || 0)) / (3600 * 1000);
  if (hoursSince < 20) return "rest-after-double";
  if (hoursSince >= 20 && hoursSince < 34) {
    return hour < 15 ? "rest-next-am" : "high-pm";
  }
  return hour < 14 ? "high-am" : "high-pm";
}

export function validateAndApplyBlob(b) {
  if (!b || typeof b !== "object") throw new Error("Ficheiro JSON inválido.");
  if (typeof b.v !== "number" || b.v < 1 || b.v > 10) {
    throw new Error("Versão do backup incompatível.");
  }
  if (!b.state || typeof b.state !== "object" || !b.log || typeof b.log !== "object") {
    throw new Error("Estrutura de dados corrompida.");
  }

  store.ts = typeof b.ts === "number" ? b.ts : 0;
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
  store.bodyWeight = (b.bodyWeight && typeof b.bodyWeight === "object") ? b.bodyWeight : {};
  store.habits = Array.isArray(b.habits) ? b.habits : [...DEFAULT_HABITS];
  store.tasks = Array.isArray(b.tasks) ? b.tasks : [];
  store.editSession = (b.editSession && typeof b.editSession === "object") ? b.editSession : null;

  store.ntState = {
    scenario: b.ntState?.scenario || "",
    mode: b.ntState?.mode || "low",
    suppFilter: b.ntState?.suppFilter || "auto"
  };

  const incomingUI = b.dayUI || freshToday();
  if ((incomingUI.stamp || incomingUI.date) !== isoToday()) {
    snapshotDayUI(incomingUI);
    store.dayUI = freshToday();
  } else {
    store.dayUI = {
      ...freshToday(),
      ...incomingUI,
      habitsDone: incomingUI.habitsDone || {},
      weight: incomingUI.weight ?? store.bodyWeight[isoToday()] ?? null
    };
  }

  const incomingNtDone = b.ntDone || freshNtDone();
  store.ntDone = incomingNtDone.date === isoToday() ? incomingNtDone : freshNtDone();
}

/* FUSÃO INTELIGENTE (SMART MERGE) ENTRE LOCAL E CLOUD */
function mergeRemoteAndLocal(remoteBlob, localBlob) {
  const remoteWinsTop = (Number(remoteBlob.ts) || 0) >= (Number(localBlob.ts) || 0);
  const base = JSON.parse(JSON.stringify(remoteWinsTop ? remoteBlob : localBlob));

  // 1. Fundir histórico de sessões por ts único (ordenado cronologicamente)
  const histMap = new Map();
  (localBlob.hist || []).forEach(h => { if (h && h.ts) histMap.set(Number(h.ts), h); });
  (remoteBlob.hist || []).forEach(h => { if (h && h.ts) histMap.set(Number(h.ts), h); });
  base.hist = Array.from(histMap.values()).sort((a, b) => a.ts - b.ts).slice(-150);

  // 2. Fundir dailyLogs por data (mantendo o mais completo)
  base.dailyLogs = { ...(localBlob.dailyLogs || {}), ...(remoteBlob.dailyLogs || {}) };
  if (!remoteWinsTop) {
    base.dailyLogs = { ...(remoteBlob.dailyLogs || {}), ...(localBlob.dailyLogs || {}) };
  }

  // 3. Fundir bodyWeight por data
  base.bodyWeight = { ...(localBlob.bodyWeight || {}), ...(remoteBlob.bodyWeight || {}) };
  if (!remoteWinsTop) {
    base.bodyWeight = { ...(remoteBlob.bodyWeight || {}), ...(localBlob.bodyWeight || {}) };
  }

  base.ts = Math.max(Number(remoteBlob.ts) || 0, Number(localBlob.ts) || 0);
  return base;
}

/* buildBlob NUNCA altera store.ts sozinho */
export function buildBlob() {
  snapshotDayUI(store.dayUI);
  return {
    v: 6,
    ts: store.ts,
    state: store.state,
    log: store.log,
    hist: store.hist.slice(-150),
    dayUI: store.dayUI,
    ntState: store.ntState,
    ntDone: store.ntDone,
    habits: store.habits,
    tasks: store.tasks,
    dailyLogs: store.dailyLogs,
    bodyWeight: store.bodyWeight,
    editSession: store.editSession
  };
}

/* LIGAÇÃO SINGLETON AO INDEXEDDB */
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
let reconcileRetryTimer = null;
let hasPendingWrite = false;
let cloudAutoSyncReady = false;

function setSyncDot(saving) {
  const dot = document.getElementById("sync-dot");
  if (dot) dot.classList.toggle("saving", saving);
}

/* touchTs = true APENAS quando chamado por ação real do utilizador */
export function persist(touchTs = true) {
  clearTimeout(debounceTimer);
  hasPendingWrite = false;
  if (touchTs) {
    store.ts = Date.now();
  }
  const blob = buildBlob();
  try { localStorage.setItem(LS_KEY, JSON.stringify(blob)); } catch (e) {}
  idbSave(blob);
  setSyncDot(false);
  listeners.forEach(fn => fn());

  if (touchTs && cloudConfig.url && cloudConfig.key) {
    if (cloudAutoSyncReady) {
      clearTimeout(cloudTimer);
      cloudTimer = setTimeout(() => cloudPush(blob), 1500);
    } else {
      // Se ainda não reconciliou (ex: estava offline no arranque), tenta reconciliar primeiro
      scheduleReconcileRetry(5000);
    }
  }
}

export function persistDebounced(ms = 300) {
  hasPendingWrite = true;
  setSyncDot(true);
  clearTimeout(debounceTimer);
  debounceTimer = setTimeout(() => persist(true), ms);
}

export function flushPendingPersist() {
  if (hasPendingWrite) {
    persist(true);
  }
}

export function loadStore() {
  loadCloudConfig();
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
        persist(false); // Não toca em store.ts no carregamento inicial!
        resolve();
      };
      getReq.onerror = () => { persist(false); resolve(); };
    }).catch(() => {
      persist(false);
      resolve();
    });
  });
}

/* SUPABASE CLOUD SYNC SEGURO (NUNCA DESBLOQUEIA SE O GET FALHAR) */
export async function cloudPush(blob = buildBlob()) {
  const { url, key, syncId } = cloudConfig;
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
      body: JSON.stringify({
        id: syncId || "tomas-main",
        payload: blob,
        updated_at: new Date(blob.ts || Date.now()).toISOString()
      })
    });
    return res.ok;
  } catch (e) {
    return false;
  }
}

export async function cloudPull() {
  const { url, key, syncId } = cloudConfig;
  if (!url || !key) return false;
  const endpoint = `${url.replace(/\/$/, "")}/rest/v1/life_os_sync?id=eq.${encodeURIComponent(syncId)}&select=payload,updated_at`;
  try {
    const res = await fetch(endpoint, {
      headers: { "apikey": key, "Authorization": `Bearer ${key}` }
    });
    if (!res.ok) return false;
    const rows = await res.json();
    if (rows && rows[0] && rows[0].payload) {
      validateAndApplyBlob(rows[0].payload);
      persist(false);
      cloudAutoSyncReady = true;
      return true;
    }
    return false;
  } catch (e) {
    return false;
  }
}

function scheduleReconcileRetry(ms = 30000) {
  clearTimeout(reconcileRetryTimer);
  reconcileRetryTimer = setTimeout(() => {
    cloudSyncReconcile();
  }, ms);
}

export async function cloudSyncReconcile(onPulledCallback) {
  const { url, key, syncId } = cloudConfig;
  if (!url || !key) {
    cloudAutoSyncReady = false;
    return { action: "unconfigured" };
  }
  const endpoint = `${url.replace(/\/$/, "")}/rest/v1/life_os_sync?id=eq.${encodeURIComponent(syncId)}&select=payload,updated_at`;
  try {
    const res = await fetch(endpoint, {
      headers: { "apikey": key, "Authorization": `Bearer ${key}` }
    });
    if (!res.ok) {
      // FALHOU (401/500): Mantém cloudAutoSyncReady = false para NUNCA sobrescrever a cloud
      cloudAutoSyncReady = false;
      scheduleReconcileRetry(30000);
      return { action: "error" };
    }
    const rows = await res.json();
    if (rows && rows[0] && rows[0].payload) {
      const remotePayload = rows[0].payload;
      const remoteTs = Number(remotePayload.ts) || Date.parse(rows[0].updated_at || "") || 0;
      const localTs = Number(store.ts) || 0;

      const merged = mergeRemoteAndLocal(remotePayload, buildBlob());
      validateAndApplyBlob(merged);
      persist(false);
      cloudAutoSyncReady = true;

      if (remoteTs > localTs) {
        if (onPulledCallback) onPulledCallback();
        return { action: "pulled" };
      } else if (localTs > remoteTs) {
        await cloudPush(buildBlob());
        return { action: "pushed" };
      }
      return { action: "equal" };
    } else {
      // Tabela vazia para este syncId: seguro desbloquear e enviar estado inicial se existir
      cloudAutoSyncReady = true;
      if (store.ts > 0) {
        await cloudPush(buildBlob());
        return { action: "pushed" };
      }
      return { action: "empty" };
    }
  } catch (e) {
    // OFFLINE: Mantém cloudAutoSyncReady = false e tenta mais tarde
    cloudAutoSyncReady = false;
    scheduleReconcileRetry(30000);
    return { action: "offline" };
  }
}

export function wipeAllData() {
  try { localStorage.removeItem(LS_KEY); } catch (e) {}
  try { indexedDB.deleteDatabase(IDB_NAME); } catch (e) {}
  window.location.reload();
}