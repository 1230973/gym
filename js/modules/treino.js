import { PLAN, EXERCISE_RANGE, SEED, CARDIO_SLOTS } from "../data.js";
import { store, persist, isoToday } from "../store.js";
import { $, el, toast, fmtDate } from "../ui.js";

export function initTreinoModule() {
  const host = $("page-treino");
  host.innerHTML = `
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
          <button class="sleep-toggle" id="sleep-toggle" type="button" role="switch" aria-checked="false">—</button>
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
      <div class="card" id="cardio-card"></div>
      <p class="cardio-foot">3 min passo normal (a falar sem esforço) + 3 min passo acelerado, a repetir até ao tempo. Mínimo 2 sessões por dia; a terceira só se der jeito.</p>
    </section>

    <section class="section">
      <details class="drawer"><summary>Histórico de sessões</summary><div id="hist-list"></div></details>
      <details class="drawer">
        <summary>Regras do treino</summary>
        <ul class="hack-list">
          <li><strong>Volume:</strong> 1 série de trabalho efetiva por exercício, até à falha concêntrica pura.</li>
          <li><strong>Reps:</strong> compostos 6-8; isolamentos 8-12; gémeos e abs 10-15.</li>
          <li><strong>Cadência:</strong> excêntrica controlada 2-3s, pausa de 1s no estiramento/pico, concêntrica explosiva.</li>
          <li><strong>Progressão:</strong> dupla progressão. Toca no valor "anterior" para copiar para hoje.</li>
          <li><strong>Recuperação:</strong> dia sim dia não, ou janelas de 36h (10h manhã / 22h noite).</li>
        </ul>
      </details>
    </section>
  `;

  $("day-chips").querySelectorAll(".day-chip").forEach(chip => {
    chip.addEventListener("click", () => {
      store.state.day = chip.dataset.day;
      persist();
      renderTreinoModule();
    });
  });

  $("sess-date").addEventListener("change", e => {
    store.dayUI.date = e.target.value;
    persist();
  });

  $("sleep-toggle").addEventListener("click", () => {
    store.dayUI.sleepOk = !store.dayUI.sleepOk;
    renderSleepToggle();
    persist();
  });

  $("btn-save").addEventListener("click", saveSession);
  $("btn-copy").addEventListener("click", copySession);

  renderTreinoModule();
}

export function renderTreinoModule() {
  const plan = PLAN[store.state.day];
  document.documentElement.style.setProperty("--day-color", plan.color);

  $("day-chips").querySelectorAll(".day-chip").forEach(chip => {
    chip.classList.toggle("sel", chip.dataset.day === store.state.day);
  });

  $("sess-focus").textContent = `Dia ${store.state.day} — ${plan.focus}`;
  $("sess-date").value = store.dayUI.date || isoToday();

  renderSleepToggle();
  renderExercises();
  renderCardio();
  renderHistory();
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
  let hasSavedDay = false;
  for (let i = store.hist.length - 1; i >= 0; i--) {
    const h = store.hist[i];
    if (h.day === day) {
      hasSavedDay = true;
      if (h.entries && h.entries[name]) {
        const e = h.entries[name];
        if (e.kg || e.reps) return e;
      }
    }
  }
  if (!hasSavedDay && SEED[day] && SEED[day][name]) {
    return SEED[day][name];
  }
  return null;
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
    const entry = rec[name] || { kg: "", reps: "" };
    rec[name] = entry;

    const card = el("article", `ex${store.dayUI.ex[key] ? " done" : ""}`);
    const top = el("div", "ex-top");
    top.appendChild(el("span", "ex-idx", String(i + 1).padStart(2, "0")));
    top.appendChild(el("span", "ex-name", name));

    const check = el("button", `check${store.dayUI.ex[key] ? " checked" : ""}`);
    check.type = "button";
    check.addEventListener("click", () => {
      store.dayUI.ex[key] = !store.dayUI.ex[key];
      card.classList.toggle("done", !!store.dayUI.ex[key]);
      check.classList.toggle("checked", !!store.dayUI.ex[key]);
      updateExerciseProgress();
      persist();
    });
    top.appendChild(check);
    card.appendChild(top);

    const range = EXERCISE_RANGE[name];
    if (range) {
      const rangeLine = el("p", `ex-range${range.guess ? " guess" : ""}`);
      rangeLine.appendChild(el("b", null, `${range.range} reps`));
      rangeLine.appendChild(document.createTextNode(` · ${range.cat}${range.guess ? " · nome ambíguo, confirma" : ""}`));
      card.appendChild(rangeLine);
    }

    const row = el("div", "ex-load");
    const kg = document.createElement("input");
    kg.className = "load-input";
    kg.type = "text";
    kg.placeholder = "carga";
    kg.value = entry.kg || "";
    kg.addEventListener("input", () => { entry.kg = kg.value; persist(); });
    row.appendChild(kg);

    row.appendChild(el("span", "load-x", "×"));

    const reps = document.createElement("input");
    reps.className = "load-input";
    reps.type = "text";
    reps.placeholder = "reps";
    reps.value = entry.reps || "";
    reps.addEventListener("input", () => { entry.reps = reps.value; persist(); });
    row.appendChild(reps);

    const prev = el("div", "load-prev");
    const last = lastFromHistory(day, name);
    if (last) {
      prev.appendChild(document.createTextNode("anterior "));
      prev.appendChild(el("b", null, `${last.kg || "—"} × ${last.reps || "—"}`));
      prev.addEventListener("click", () => {
        kg.value = last.kg || "";
        reps.value = last.reps || "";
        entry.kg = kg.value;
        entry.reps = reps.value;
        persist();
        toast("Carga anterior copiada");
      });
    } else {
      prev.textContent = "sem anterior";
    }
    row.appendChild(prev);
    card.appendChild(row);
    host.appendChild(card);
  });

  updateExerciseProgress();
}

function saveSession() {
  const day = store.state.day;
  const plan = PLAN[day];
  const rec = store.log[day] || {};
  const entries = {};
  let filled = 0;

  plan.exercises.forEach(name => {
    const e = rec[name] || { kg: "", reps: "" };
    entries[name] = { kg: e.kg || "", reps: e.reps || "" };
    if (e.kg || e.reps) filled++;
  });

  if (!filled) {
    toast("Nada para guardar neste dia");
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
  persist();

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
    const e = rec[name] || {};
    lines.push(`${name} — ${e.kg || "—"} × ${e.reps || "—"}`);
  });
  const text = lines.join("\n");
  if (navigator.clipboard && navigator.clipboard.writeText) {
    navigator.clipboard.writeText(text).then(() => toast("Registo copiado"), () => fallbackCopy(text));
  } else {
    fallbackCopy(text);
  }
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
    min.value = rec.min;
    min.addEventListener("input", () => { rec.min = min.value; persist(); });
    row.appendChild(min);

    const check = el("button", `check${rec.done ? " checked" : ""}`);
    check.type = "button";
    check.addEventListener("click", () => {
      rec.done = !rec.done;
      row.classList.toggle("done", rec.done);
      check.classList.toggle("checked", rec.done);
      updateCount();
      persist();
    });
    row.appendChild(check);
    host.appendChild(row);
  });

  updateCount();
}

function renderHistory() {
  const host = $("hist-list");
  host.innerHTML = "";
  if (!store.hist.length) {
    host.appendChild(el("p", "cardio-foot", "Ainda não arquivaste nenhuma sessão."));
    return;
  }
  store.hist.slice().reverse().forEach(s => {
    const entry = el("div", "hist-entry");
    const head = el("div", "hist-head");
    head.appendChild(el("span", "hist-day", `Dia ${s.day} — ${s.focus}`));
    head.appendChild(el("span", "hist-date", fmtDate(s.date)));
    entry.appendChild(head);

    const lines = Object.keys(s.entries)
      .filter(n => s.entries[n].kg || s.entries[n].reps)
      .map(n => `${n} · ${s.entries[n].kg || "—"} × ${s.entries[n].reps || "—"}`)
      .join("\n");
    entry.appendChild(el("pre", "hist-lines", lines));
    host.appendChild(entry);
  });
}   