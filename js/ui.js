export const $ = id => document.getElementById(id);

export function el(tag, cls, text) {
  const n = document.createElement(tag);
  if (cls) n.className = cls;
  if (text != null) n.textContent = text;
  return n;
}

export function toast(msg) {
  const t = $("toast");
  if (!t) return;
  t.textContent = msg;
  t.classList.add("show");
  clearTimeout(t._timer);
  t._timer = setTimeout(() => t.classList.remove("show"), 2200);
}

export function fmtDate(iso) {
  if (!iso) return "";
  const p = iso.split("-");
  return p.length === 3 ? `${p[2]}/${p[1]}` : iso;
}

export function fmtEntry(e) {
  if (!e) return "—";
  const parts = [];
  if (e.kg != null) parts.push(`${e.kg}kg`);
  if (e.reps != null) parts.push(`${e.reps}`);
  const main = parts.join(" × ");
  if (main && e.note) return `${main} (${e.note})`;
  if (main) return main;
  if (e.note) return e.note;
  return "—";
}

let sharedAudioCtx = null;

export function unlockAudioContext() {
  try {
    const Ctx = window.AudioContext || window.webkitAudioContext;
    if (!Ctx) return;
    if (!sharedAudioCtx) sharedAudioCtx = new Ctx();
    if (sharedAudioCtx.state === "suspended") {
      sharedAudioCtx.resume();
    }
    const osc = sharedAudioCtx.createOscillator();
    const gain = sharedAudioCtx.createGain();
    gain.gain.value = 0.0001;
    osc.connect(gain);
    gain.connect(sharedAudioCtx.destination);
    osc.start(0);
    osc.stop(sharedAudioCtx.currentTime + 0.02);
  } catch (e) {}
}

export function beepAndVibrate(type = "switch") {
  try {
    if (typeof navigator.vibrate === "function") {
      navigator.vibrate(type === "finish" ? [250, 100, 250, 100, 350] : [180, 80, 180]);
    }
  } catch (e) {}
  try {
    const Ctx = window.AudioContext || window.webkitAudioContext;
    if (!Ctx) return;
    if (!sharedAudioCtx) sharedAudioCtx = new Ctx();
    if (sharedAudioCtx.state === "suspended") sharedAudioCtx.resume();

    const osc = sharedAudioCtx.createOscillator();
    const gain = sharedAudioCtx.createGain();
    osc.type = "sine";
    osc.frequency.value = type === "finish" ? 880 : 620;
    gain.gain.setValueAtTime(0.22, sharedAudioCtx.currentTime);
    gain.gain.exponentialRampToValueAtTime(0.001, sharedAudioCtx.currentTime + 0.4);
    osc.connect(gain);
    gain.connect(sharedAudioCtx.destination);
    osc.start();
    osc.stop(sharedAudioCtx.currentTime + 0.4);
  } catch (e) {}
}