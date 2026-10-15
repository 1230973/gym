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
  t._timer = setTimeout(() => t.classList.remove("show"), 2100);
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

export function beepAndVibrate(type = "switch") {
  try {
    if (navigator.vibrate) {
      navigator.vibrate(type === "finish" ? [250, 100, 250, 100, 350] : [180, 80, 180]);
    }
  } catch (e) {}
  try {
    const Ctx = window.AudioContext || window.webkitAudioContext;
    if (!Ctx) return;
    const ctx = new Ctx();
    const osc = ctx.createOscillator();
    const gain = ctx.createGain();
    osc.type = "sine";
    osc.frequency.value = type === "finish" ? 880 : 620;
    gain.gain.setValueAtTime(0.18, ctx.currentTime);
    gain.gain.exponentialRampToValueAtTime(0.001, ctx.currentTime + 0.35);
    osc.connect(gain);
    gain.connect(ctx.destination);
    osc.start();
    osc.stop(ctx.currentTime + 0.35);
  } catch (e) {}
}