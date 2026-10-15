import { PLAN, EXERCISE_RANGE, SEED, CARDIO_SLOTS } from "../data.js";
import { store, persist, persistDebounced, isoToday, computeSuggestedScenario } from "../store.js";
import { $, el, toast, fmtDate, fmtEntry, unlockAudioContext, beepAndVibrate } from "../ui.js";

/* CRONÓMETRO + WAKE LOCK API (Mantém ecrã e áudio vivos na passadeira) */
let timerInterval = null;
let timerRunning = false;
let timerEndTime = 0;
let timerTotalSec = 15 * 60;
let timerRemSec = 15 * 60;
let timerLastBlockIdx = 0;
let wakeLockSentinel = null;

async function requestScreenWakeLock() {
  if (!("wakeLock" in navigator) || !timerRunning) return;
  try {
    if (!wakeLockSentinel || wakeLockSentinel.released) {
      wakeLockSentinel = await navigator.wakeLock.request("screen");
    }
  } catch (e) {}
}

async function releaseScreenWakeLock() {
  try {
    if (wakeLockSentinel) {
      await wakeLockSentinel.release();
      wakeLockSentinel = null;
    }
  } catch (e) {}
}

export function initTreinoModule() {
  const host = $("page-treino");
  host.innerHTML = `
    <div id="recovery-banner" class="rec-banner" hidden></div>
    <div id="edit-banner" class="edit-banner" hidden>
      <span id="edit-banner-text">A editar sessão do histórico</span>
      <button class="btn btn-sm" id="btn-cancel-edit" type="button">Cancelar edição</button>
    </div>

    <section class="section">
      <div class="section-head">
        <h2 class="section-title">Registo de treino</h2>
        <span class="section-meta" id="session-progress"></span>
      </div>
      <div class="day-chips" id="day-chips">
        <button class="day-chip" type="button" data-day="1">Dia 1<small>Back · Traps</small></button>
        <button class="day-chip" type="button" data-day="2">Dia 2<small>Chest · Delt</small></button>
        <button class="day-chip" type="button" data-day="3">Dia 3<small>Bi · Tri</small></button>
      </div>
      <div class="card sess-card">
        <div class="sess-accent"></div>
        <div class="sess-focus" id="sess-focus"></div>
        <div class="sess-row">
          <label for="sess-date">Data da sessão</label>
          <input class="date-input" type="date" id="sess-date">
        </div>
        <div class="sess-row">
          <label>Dormi ≥ 6h esta noite</label>
          <button class="sleep-toggle" id="sleep-toggle" type="button" role="switch" aria-checked="false" aria-label="Alternar confirmação de pelo menos 6 horas de sono">—</button>
        </div>
        <p class="sess-warn" id="sess-warn" hidden>Sono curto: pondera adiar a sessão 24h. Forçar em défice de recuperação é meio caminho andado para tendinite de cotovelo ou ombro.</p>
        <div class="sess-actions">
          <button class="btn btn-primary" id="btn-save" type="button">Guardar e avançar</button>
          <button class="btn btn-ghost" id="btn-copy" type="button">Copiar</button>
        </div>
      </div>
    </section>

    <section class="section" id="exercises"></section>

    <section class="section">
      <div class="section-head"><h2 class="section-title">Passadeira</h2><span class="section-meta" id="cardio-progress"></span></div>
      <div class="card">
        <div class="timer-box">
          <div class="timer-left">
            <span class="timer-phase" id="timer-phase">🚶 Passo Normal (3m)</span>
            <span class="timer-clock" id="timer-clock">15:00</span>
            <span class="timer-sub" id="timer-sub">Bloco 1/5 · alterna a cada 3 min</span>
          </div>
          <div class="timer-btns">
            <button class="btn btn-sm" id="timer-start" type="button">Iniciar</button>
            <button class="btn btn-sm btn-ghost" id="timer-reset" type="button">Reset</button>
          </div>
        </div>
        <div id="cardio-card"></div>
      </div>
      <p class="cardio-foot">3 min passo normal + 3 min passo acelerado. O cronómetro mantém o ecrã acordado (Wake Lock) para os beeps tocarem sempre e marca o slot no fim.</p>
    </section>

    <section class="section">
      <details class="drawer"><summary>Histórico de sessões</summary><div id="hist-list"></div></details>
      <details class="drawer">
        <summary>Regras do treino</summary>
        <ul class="hack-list">
          <li><strong>Volume:</strong> 1 série de trabalho efetiva por exercício, até à falha concêntrica pura.</li>
          <li><strong>Reps:</strong> compostos 6-8; isolamentos 8-12; gémeos e abs 10-15.</li>
          <li><strong>Cadência:</strong> excêntrica controlada 2-3s, pausa de 1s no estiramento/pico, concêntrica explosiva.</li>
          <li><strong>Critério de PR (🏆 PR):</strong> dispara quando superas a tua carga máxima histórica (kg) ou fazes mais repetições na tua carga máxima (ignora os valores iniciais de referência).</li>
          <li><strong>Recuperação:</strong> dia sim dia não, ou janelas de 36h (10h manhã / 22h noite).</li>
        </ul>
      </details>
    </section>
  `;

  $("day-chips").querySelectorAll(".day-chip").forEach(chip => {
    chip.addEventListener("click", () => {
      if (store.editSession) cancelHistEdit(false);
      store.state.day = chip.dataset.day;
      persist(true);
      renderTreinoModule();
    });
  });

  $("sess-date").addEventListener("change", e => {
    store.dayUI.date = e.target.value;
    persist(true);
  });

  $("sleep-toggle").addEventListener("click", () => {
    store.dayUI.sleepOk = !store.dayUI.sleepOk;
    renderSleepToggle();
    persist(true);
  });

  $("btn-save").addEventListener("click", saveSession);
  $("btn-copy").addEventListener("click", copySession);
  $("btn-cancel-edit").addEventListener("click", () => cancelHistEdit(true));

  $("timer-start").addEventListener("click", toggleCardioTimer);
  $("timer-reset").addEventListener("click", resetCardioTimer);

  document.addEventListener("visibilitychange", () => {
    if (document.visibilityState === "visible" && timerRunning) {
      requestScreenWakeLock();
      tickCardioTimer();
    }
  });

  syncTimerDurationFromNextSlot();
  renderTreinoModule();
}

function findEditingSessionIndex() {
  if (!store.editSession || !store.editSession.targetTs) return -1;
  return store.hist.findIndex(h => Number(h.ts) === Number(store.editSession.targetTs));
}

export function renderTreinoModule() {
  const editIdx = findEditingSessionIndex();
  if (store.editSession && editIdx === -1) {
    // Caso um sync remoto tenha removido a sessão que estava em edição, restaura o rascunho de forma segura
    cancelHistEdit(false);
  }

  const plan = PLAN[store.state.day];
  document.documentElement.style.setProperty("--day-color", plan.color);

  $("day-chips").querySelectorAll(".day-chip").forEach(chip => {
    chip.classList.toggle("sel", chip.dataset.day === store.state.day);
  });

  $("sess-focus").textContent = `Dia ${store.state.day} — ${plan.focus}`;
  $("sess-date").value = store.dayUI.date || isoToday();

  const editBanner = $("edit-banner");
  const saveBtn = $("btn-save");
  if (editIdx !== -1) {
    editBanner.hidden = false;
    const h = store.hist[editIdx];
    $("edit-banner-text").textContent = `A editar histórico: Dia ${h.day} (${fmtDate(h.date)})`;
    saveBtn.textContent = "Guardar alterações";
  } else {
    editBanner.hidden = true;
    saveBtn.textContent = "Guardar e avançar";
  }

  renderRecoveryBanner();
  renderSleepToggle();
  renderExercises();
  renderCardio();
  renderHistory();
}

function renderRecoveryBanner() {
  const banner = $("recovery-banner");
  if (!store.hist.length) {
    banner.hidden = true;
    return;
  }
  const last = store.hist[store.hist.length - 1];
  if (!last.ts) {
    banner.hidden = true;
    return;
  }
  const nextTs = last.ts + 36 * 3600 * 1000;
  const now = Date.now();
  const nextDate = new Date(nextTs);
  const timeStr = nextDate.toLocaleTimeString("pt-PT", { hour: "2-digit", minute: "2-digit" });
  const dayStr = nextDate.toLocaleDateString("pt-PT", { weekday: "short", day: "numeric" });

  banner.hidden = false;
  if (now < nextTs) {
    const remHours = Math.ceil((nextTs - now) / (3600 * 1000));
    banner.className = "rec-banner wait";
    banner.innerHTML = `<span>⏱ Janela 36h: próximo treino <b>${dayStr} às ${timeStr}</b> (faltam ~${remHours}h)</span>`;
  } else {
    banner.className = "rec-banner ready";
    banner.innerHTML = `<span>✓ Recuperação ≥36h concluída desde <b>${dayStr} às ${timeStr}</b></span>`;
  }
}

function renderSleepToggle() {
  const btn = $("sleep-toggle");
  const warn = $("sess-warn");
  if (store.dayUI.sleepOk === true) {
    btn.textContent = "Sim";
    btn.setAttribute("aria-checked", "true");
    btn.style.opacity = "1";
  } else if (store.dayUI.sleepOk === false) {
    btn.textContent = "Não";
    btn.setAttribute("aria-checked", "false");
    btn.style.opacity = "1";
  } else {
    btn.textContent = "—";
    btn.setAttribute("aria-checked", "false");
    btn.style.opacity = ".6";
  }
  warn.hidden = store.dayUI.sleepOk !== false;
}

function lastFromHistory(day, name) {
  const editIdx = findEditingSessionIndex();
  const maxIdx = editIdx !== -1 ? editIdx - 1 : store.hist.length - 1;
  let hasSavedDay = false;
  for (let i = maxIdx; i >= 0; i--) {
    const h = store.hist[i];
    if (h && h.day === day) {
      hasSavedDay = true;
      if (h.entries && h.entries[name]) {
        const e = h.entries[name];
        if (e.kg != null || e.reps != null || e.note) return e;
      }
    }
  }
  if (!hasSavedDay && SEED[day] && SEED[day][name]) {
    return SEED[day][name];
  }
  return null;
}

/* PR REAL: Ignora SEED. Compara apenas contra sessões reais gravadas no histórico (Carga Máxima ou +Reps na Carga Máxima) */
export function isPersonalRecord(day, name, kg, reps, upToIndex = null) {
  if (typeof kg !== "number" || typeof reps !== "number" || kg <= 0 || reps <= 0) return false;
  const editIdx = findEditingSessionIndex();
  const maxIdx = upToIndex !== null ? upToIndex : (editIdx !== -1 ? editIdx - 1 : store.hist.length - 1);

  let bestKg = -1;
  let bestRepsAtMaxKg = -1;

  for (let i = 0; i <= maxIdx; i++) {
    const h = store.hist[i];
    if (h && h.day === day && h.entries?.[name]) {
      const e = h.entries[name];
      if (typeof e.kg === "number" && typeof e.reps === "number" && e.kg > 0 && e.reps > 0) {
        if (e.kg > bestKg || (e.kg === bestKg && e.reps > bestRepsAtMaxKg)) {
          bestKg = e.kg;
          bestRepsAtMaxKg = e.reps;
        }
      }
    }
  }

  if (bestKg < 0) return false; // Só mostra PR quando já existe pelo menos 1 sessão real anterior para bater
  return kg > bestKg || (kg === bestKg && reps > bestRepsAtMaxKg);
}

function getExerciseSparklinePoints(day, name) {
  const pts = [];
  store.hist.forEach(h => {
    if (h.day === day && h.entries && h.entries[name] && typeof h.entries[name].kg === "number") {
      pts.push(h.entries[name].kg);
    }
  });
  return pts;
}

function createSparklineSVG(points) {
  if (points.length < 2) return null;
  const min = Math.min(...points);
  const max = Math.max(...points);
  const span = max - min || 1;
  const w = 54, h = 16;
  const coords = points.map((val, idx) => {
    const x = (idx / (points.length - 1)) * w;
    const y = h - ((val - min) / span) * (h - 4) - 2;
    return `${x.toFixed(1)},${y.toFixed(1)}`;
  }).join(" ");

  const wrap = el("span", "sparkline-wrap");
  wrap.innerHTML = `<svg class="sparkline-svg" viewBox="0 0 ${w} ${h}" aria-label="Gráfico de evolução de carga"><polyline fill="none" stroke="var(--day-color)" stroke-width="1.8" stroke-linecap="round" stroke-linejoin="round" points="${coords}"/></svg>`;
  return wrap;
}

function computeProgressionHint(lastEntry, rangeObj) {
  if (!lastEntry || !rangeObj || typeof lastEntry.reps !== "number") return null;
  if (lastEntry.reps >= rangeObj.max) {
    return { cls: "prog-badge prog-up", text: "↑ Subir carga" };
  }
  if (lastEntry.reps >= rangeObj.min) {
    return { cls: "prog-badge prog-keep", text: `= Manter (${rangeObj.max} alvo)` };
  }
  return { cls: "prog-badge prog-down", text: "↓ Consolidar carga" };
}

function updateExerciseProgress() {
  const items = PLAN[store.state.day].exercises;
  const done = items.filter(n => store.dayUI.ex[`${store.state.day}|${n}`]).length;
  $("session-progress").textContent = `${done}/${items.length}`;
}

function renderExercises() {
  const host = $("exercises");
  host.innerHTML = "";
  const day = store.state.day;
  store.log[day] = store.log[day] || {};
  const rec = store.log[day];

  PLAN[day].exercises.forEach((name, i) => {
    const key = `${day}|${name}`;
    const entry = rec[name] || { kg: null, reps: null, note: "" };
    rec[name] = entry;

    const card = el("article", `ex${store.dayUI.ex[key] ? " done" : ""}`);
    const top = el("div", "ex-top");
    top.appendChild(el("span", "ex-idx", String(i + 1).padStart(2, "0")));
    top.appendChild(el("span", "ex-name", name));

    const check = el("button", `check${store.dayUI.ex[key] ? " checked" : ""}`);
    check.type = "button";
    check.setAttribute("aria-label", `Marcar ${name} como concluído`);
    check.addEventListener("click", () => {
      store.dayUI.ex[key] = !store.dayUI.ex[key];
      card.classList.toggle("done", !!store.dayUI.ex[key]);
      check.classList.toggle("checked", !!store.dayUI.ex[key]);
      updateExerciseProgress();
      persist(true);
    });
    top.appendChild(check);
    card.appendChild(top);

    const range = EXERCISE_RANGE[name];
    const last = lastFromHistory(day, name);
    const subRow = el("div", "ex-sub");

    if (range) {
      const rangeLine = el("p", `ex-range${range.guess ? " guess" : ""}`);
      rangeLine.appendChild(el("b", null, `${range.range} reps`));
      rangeLine.appendChild(document.createTextNode(` · ${range.cat}${range.guess ? " · confirma" : ""}`));
      subRow.appendChild(rangeLine);
    }

    const hint = computeProgressionHint(last, range);
    if (hint) subRow.appendChild(el("span", hint.cls, hint.text));

    const prBadge = el("span", "pr-badge", "🏆 PR");
    prBadge.hidden = !isPersonalRecord(day, name, entry.kg, entry.reps);
    subRow.appendChild(prBadge);

    const spark = createSparklineSVG(getExerciseSparklinePoints(day, name));
    if (spark) subRow.appendChild(spark);

    card.appendChild(subRow);

    const row = el("div", "ex-load");
    const kg = document.createElement("input");
    kg.className = "load-input";
    kg.type = "number";
    kg.step = "0.5";
    kg.inputMode = "decimal";
    kg.placeholder = "kg";
    kg.setAttribute("aria-label", `Carga em kg para ${name}`);
    kg.value = entry.kg != null ? entry.kg : "";

    const reps = document.createElement("input");
    reps.className = "load-input";
    reps.type = "number";
    reps.step = "1";
    reps.inputMode = "numeric";
    reps.placeholder = "reps";
    reps.setAttribute("aria-label", `Repetições para ${name}`);
    reps.value = entry.reps != null ? entry.reps : "";

    const refreshPR = () => {
      prBadge.hidden = !isPersonalRecord(day, name, entry.kg, entry.reps);
    };

    kg.addEventListener("input", () => {
      entry.kg = kg.value !== "" ? parseFloat(kg.value) : null;
      refreshPR();
      persistDebounced(300);
    });
    row.appendChild(kg);

    row.appendChild(el("span", "load-x", "×"));

    reps.addEventListener("input", () => {
      entry.reps = reps.value !== "" ? parseInt(reps.value, 10) : null;
      refreshPR();
      persistDebounced(300);
    });
    row.appendChild(reps);

    const note = document.createElement("input");
    note.className = "note-input";
    note.type = "text";
    note.placeholder = "nota (FullStack, overshot...)";
    note.setAttribute("aria-label", `Nota para ${name}`);
    note.value = entry.note || "";
    note.addEventListener("input", () => {
      entry.note = note.value;
      persistDebounced(300);
    });
    row.appendChild(note);

    const prev = el("div", "load-prev");
    if (last) {
      prev.appendChild(document.createTextNode("anterior: "));
      prev.appendChild(el("b", null, fmtEntry(last)));
      prev.addEventListener("click", () => {
        kg.value = last.kg != null ? last.kg : "";
        reps.value = last.reps != null ? last.reps : "";
        note.value = last.note || "";
        entry.kg = last.kg;
        entry.reps = last.reps;
        entry.note = last.note || "";
        refreshPR();
        persist(true);
        toast("Valores anteriores copiados");
      });
    } else {
      prev.textContent = "sem registo anterior";
    }
    row.appendChild(prev);

    card.appendChild(row);
    host.appendChild(card);
  });

  updateExerciseProgress();
}

function cancelHistEdit(showNotification = true) {
  if (store.editSession && store.editSession.draft) {
    store.state.day = store.editSession.draft.day;
    store.dayUI.date = store.editSession.draft.date;
    store.log = store.editSession.draft.log;
  }
  store.editSession = null;
  persist(true);
  renderTreinoModule();
  if (showNotification) toast("Edição cancelada · rascunho restaurado");
}

function saveSession() {
  const day = store.state.day;
  const plan = PLAN[day];
  const rec = store.log[day] || {};
  const entries = {};
  let filled = 0;

  plan.exercises.forEach(name => {
    const e = rec[name] || { kg: null, reps: null, note: "" };
    entries[name] = { kg: e.kg, reps: e.reps, note: (e.note || "").trim() };
    if (e.kg != null || e.reps != null || entries[name].note) filled++;
  });

  if (!filled) {
    toast("Nada para guardar neste dia");
    return;
  }

  /* SE ESTIVER EM MODO DE EDIÇÃO: VALIDA O ÍNDICE PELO TS ÚNICO ANTES DE GRAVAR */
  if (store.editSession) {
    const editIdx = findEditingSessionIndex();
    if (editIdx === -1) {
      cancelHistEdit(false);
      toast("Erro: A sessão original já não existe no histórico.");
      return;
    }
    store.hist[editIdx] = {
      ...store.hist[editIdx],
      day,
      focus: plan.focus,
      date: store.dayUI.date || isoToday(),
      entries
    };
    if (store.editSession.draft) {
      store.state.day = store.editSession.draft.day;
      store.dayUI.date = store.editSession.draft.date;
      store.log = store.editSession.draft.log;
    } else {
      store.log[day] = {};
    }
    store.editSession = null;
    persist(true);
    renderTreinoModule();
    toast("Sessão do histórico atualizada");
    window.scrollTo({ top: 0, behavior: "smooth" });
    return;
  }

  store.hist.push({
    day,
    focus: plan.focus,
    date: store.dayUI.date || isoToday(),
    entries,
    ts: Date.now()
  });

  store.log[day] = {};
  store.dayUI.ex = {};
  store.state.day = day === "1" ? "2" : (day === "2" ? "3" : "1");
  store.ntState.scenario = computeSuggestedScenario();
  persist(true);

  renderTreinoModule();
  toast(`Sessão guardada · segue o Dia ${store.state.day}`);
  window.scrollTo({ top: 0, behavior: "smooth" });
}

function fallbackCopy(text) {
  const ta = document.createElement("textarea");
  ta.value = text;
  ta.style.position = "fixed";
  ta.style.opacity = "0";
  document.body.appendChild(ta);
  ta.select();
  try {
    document.execCommand("copy");
    toast("Registo copiado");
  } catch (e) {
    toast("Não deu para copiar");
  }
  document.body.removeChild(ta);
}

function copySession() {
  const day = store.state.day;
  const plan = PLAN[day];
  const rec = store.log[day] || {};
  const lines = [
    "Registo de Treino - Fullbody HIT",
    `Data: ${store.dayUI.date || isoToday()}`,
    `Dia ${day}: ${plan.focus}`,
    ""
  ];
  plan.exercises.forEach(name => {
    lines.push(`${name} — ${fmtEntry(rec[name])}`);
  });
  const text = lines.join("\n");
  if (navigator.clipboard && navigator.clipboard.writeText) {
    navigator.clipboard.writeText(text).then(() => toast("Registo copiado"), () => fallbackCopy(text));
  } else {
    fallbackCopy(text);
  }
}

/* CRONÓMETRO DA PASSADEIRA BASEADO EM ENDTIME + WAKE LOCK */
function getNextPendingCardioSlot() {
  for (const s of CARDIO_SLOTS) {
    const rec = store.dayUI.cardio[s.id];
    if (!rec || !rec.done) return s;
  }
  return CARDIO_SLOTS[0];
}

function syncTimerDurationFromNextSlot() {
  if (timerRunning) return;
  const nextSlot = getNextPendingCardioSlot();
  const rec = store.dayUI.cardio[nextSlot.id] || { min: "15" };
  const mins = Math.max(1, parseInt(rec.min, 10) || 15);
  timerTotalSec = mins * 60;
  timerRemSec = timerTotalSec;
  timerLastBlockIdx = 0;
  updateTimerUI();
}

function updateTimerUI() {
  const clockEl = $("timer-clock");
  if (!clockEl) return;
  const mins = Math.floor(timerRemSec / 60);
  const secs = timerRemSec % 60;
  clockEl.textContent = `${String(mins).padStart(2, "0")}:${String(secs).padStart(2, "0")}`;

  const totalBlocks = Math.max(1, Math.ceil(timerTotalSec / 180));
  const elapsed = Math.max(0, timerTotalSec - timerRemSec);
  const blockIdx = Math.floor(elapsed / 180);
  const isFast = blockIdx % 2 === 1;
  const phaseEl = $("timer-phase");
  phaseEl.textContent = isFast ? "🔥 Passo Acelerado (3m)" : "🚶 Passo Normal (3m)";
  phaseEl.classList.toggle("fast", isFast);
  $("timer-sub").textContent = `Bloco ${Math.min(blockIdx + 1, totalBlocks)}/${totalBlocks} · alterna a cada 3 min`;
}

function tickCardioTimer() {
  if (!timerRunning) return;
  const remMs = timerEndTime - Date.now();
  if (remMs <= 0) {
    clearInterval(timerInterval);
    timerRunning = false;
    timerRemSec = 0;
    releaseScreenWakeLock();
    $("timer-start").textContent = "Iniciar";
    updateTimerUI();
    beepAndVibrate("finish");

    const slotToMark = getNextPendingCardioSlot();
    if (slotToMark) {
      store.dayUI.cardio[slotToMark.id] = store.dayUI.cardio[slotToMark.id] || { done: false, min: "15" };
      store.dayUI.cardio[slotToMark.id].done = true;
      persist(true);
      renderCardio();
      toast(`Concluído! "${slotToMark.name}" marcado como feito.`);
    }
    syncTimerDurationFromNextSlot();
    return;
  }

  timerRemSec = Math.ceil(remMs / 1000);
  const elapsed = timerTotalSec - timerRemSec;
  const currentBlockIdx = Math.floor(elapsed / 180);
  if (currentBlockIdx > timerLastBlockIdx) {
    timerLastBlockIdx = currentBlockIdx;
    beepAndVibrate("switch");
    toast(currentBlockIdx % 2 === 1 ? "🔥 Muda para Passo Acelerado!" : "🚶 Muda para Passo Normal!");
  }
  updateTimerUI();
}

function toggleCardioTimer() {
  unlockAudioContext();
  const btn = $("timer-start");
  if (timerRunning) {
    tickCardioTimer();
    clearInterval(timerInterval);
    timerRunning = false;
    releaseScreenWakeLock();
    btn.textContent = "Retomar";
    return;
  }
  if (timerRemSec <= 0 || timerRemSec === timerTotalSec) {
    syncTimerDurationFromNextSlot();
  }
  timerRunning = true;
  timerEndTime = Date.now() + timerRemSec * 1000;
  requestScreenWakeLock();
  btn.textContent = "Pausa";
  timerInterval = setInterval(tickCardioTimer, 500);
}

function resetCardioTimer() {
  clearInterval(timerInterval);
  timerRunning = false;
  releaseScreenWakeLock();
  $("timer-start").textContent = "Iniciar";
  syncTimerDurationFromNextSlot();
}

function renderCardio() {
  const host = $("cardio-card");
  host.innerHTML = "";
  const updateCount = () => {
    const done = CARDIO_SLOTS.filter(s => store.dayUI.cardio[s.id]?.done).length;
    $("cardio-progress").textContent = `${done}/3`;
  };

  CARDIO_SLOTS.forEach(s => {
    const rec = store.dayUI.cardio[s.id] || { done: false, min: "15" };
    store.dayUI.cardio[s.id] = rec;

    const row = el("div", `list-row${rec.done ? " done" : ""}`);
    const name = el("div", "list-name", s.name);
    name.appendChild(el("small", null, s.note));
    row.appendChild(name);

    const min = document.createElement("input");
    min.className = "cardio-min";
    min.type = "number";
    min.inputMode = "numeric";
    min.setAttribute("aria-label", `Minutos de passadeira ${s.name}`);
    min.value = rec.min;
    min.addEventListener("input", () => {
      rec.min = min.value;
      syncTimerDurationFromNextSlot();
      persistDebounced(300);
    });
    row.appendChild(min);

    const check = el("button", `check${rec.done ? " checked" : ""}`);
    check.type = "button";
    check.setAttribute("aria-label", `Marcar passadeira ${s.name}`);
    check.addEventListener("click", () => {
      rec.done = !rec.done;
      row.classList.toggle("done", rec.done);
      check.classList.toggle("checked", rec.done);
      updateCount();
      syncTimerDurationFromNextSlot();
      persist(true);
    });
    row.appendChild(check);
    host.appendChild(row);
  });

  updateCount();
}

/* HISTÓRICO COM EDIÇÃO PERSISTIDA POR TS ÚNICO */
function renderHistory() {
  const host = $("hist-list");
  host.innerHTML = "";
  if (!store.hist.length) {
    host.appendChild(el("p", "cardio-foot", "Ainda não arquivaste nenhuma sessão."));
    return;
  }

  const activeTargetTs = store.editSession?.targetTs ?? null;

  store.hist.slice().reverse().forEach((s, revIdx) => {
    const realIdx = store.hist.length - 1 - revIdx;
    const isEditingThis = activeTargetTs !== null && Number(s.ts) === Number(activeTargetTs);

    const entry = el("div", "hist-entry");
    const head = el("div", "hist-head");
    head.appendChild(el("span", "hist-day", `Dia ${s.day} — ${s.focus}`));
    head.appendChild(el("span", "hist-date", fmtDate(s.date)));

    const editBtn = el("button", "btn btn-sm", isEditingThis ? "Em edição" : "Editar");
    editBtn.type = "button";
    editBtn.disabled = isEditingThis;
    editBtn.setAttribute("aria-label", `Editar sessão de ${fmtDate(s.date)}`);
    editBtn.addEventListener("click", () => {
      const draftToSave = store.editSession?.draft || {
        day: store.state.day,
        date: store.dayUI.date,
        log: JSON.parse(JSON.stringify(store.log))
      };
      store.editSession = {
        targetTs: s.ts,
        draft: draftToSave
      };
      store.state.day = s.day;
      store.dayUI.date = s.date;
      store.log[s.day] = JSON.parse(JSON.stringify(s.entries));
      persist(true);
      renderTreinoModule();
      toast("Modo de edição ativo (sobrevive mesmo se fechares a app)");
      window.scrollTo({ top: 0, behavior: "smooth" });
    });
    head.appendChild(editBtn);

    const delBtn = el("button", "del-btn", "✕");
    delBtn.type = "button";
    delBtn.setAttribute("aria-label", `Apagar sessão de ${fmtDate(s.date)}`);
    delBtn.addEventListener("click", () => {
      if (!window.confirm(`Apagar definitivamente do histórico a sessão Dia ${s.day} (${fmtDate(s.date)})?`)) return;
      if (isEditingThis) cancelHistEdit(false);
      store.hist.splice(realIdx, 1);
      persist(true);
      renderTreinoModule();
      toast("Sessão apagada do histórico");
    });
    head.appendChild(delBtn);

    entry.appendChild(head);

    const lines = Object.keys(s.entries)
      .filter(n => {
        const e = s.entries[n];
        return e && (e.kg != null || e.reps != null || e.note);
      })
      .map(n => `${n} · ${fmtEntry(s.entries[n])}`)
      .join("\n");
    entry.appendChild(el("pre", "hist-lines", lines));
    host.appendChild(entry);
  });
}