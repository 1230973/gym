import { WATER_MIN } from "../../data.js";
import { store, persist, isoToday, computeSuggestedScenario } from "../../store.js";
import { $, el, toast, fmtDate } from "../../ui.js";

export function initHojeModule() {
  const host = $("page-hoje");
  host.innerHTML = `
    <div id="hoje-status-banner" class="card" style="margin-bottom:16px; border-color:var(--border-strong);">
      <div style="font-size:.78rem; font-weight:600; text-transform:uppercase; color:var(--muted); margin-bottom:6px;">Estado de Hoje</div>
      <div id="hoje-summary-text" style="font-size:.9rem; line-height:1.5; color:var(--text);">A carregar resumo...</div>
    </div>

    <section class="section">
      <div class="section-head">
        <h2 class="section-title">Hábitos Diários</h2>
        <span class="section-meta" id="hoje-habits-meta"></span>
      </div>
      <div class="card" id="hoje-habits-card"></div>
    </section>

    <section class="section">
      <div class="section-head">
        <h2 class="section-title">Tarefas Próximas & Prazos</h2>
        <span class="section-meta" id="hoje-tasks-meta"></span>
      </div>
      <div class="card">
        <div class="sess-row" style="margin-top:0; margin-bottom:12px;">
          <input class="text-input" type="text" id="hoje-new-task" placeholder="Nova tarefa rápida...">
          <input class="date-input" type="date" id="hoje-new-date" style="max-width:130px;">
          <button class="btn" id="hoje-btn-add" type="button" aria-label="Adicionar tarefa" style="flex:0 0 auto; padding:9px 14px;">+</button>
        </div>
        <div id="hoje-tasks-list"></div>
      </div>
    </section>
  `;

  $("hoje-btn-add").addEventListener("click", addQuickTask);
  $("hoje-new-task").addEventListener("keydown", e => { if (e.key === "Enter") addQuickTask(); });

  renderHojeModule();
}

export function renderHojeModule() {
  renderStatusBanner();
  renderHabitsHoje();
  renderTasksHoje();
}

function renderStatusBanner() {
  const textEl = $("hoje-summary-text");
  if (!textEl) return;

  const water = store.dayUI.water || 0;
  const tierKey = computeSuggestedScenario();
  const tierName = store.settings.ntTiers[tierKey]?.short || "Tier";
  const sleepOk = store.dayUI.sleepOk;

  let sleepText = sleepOk === true ? "✓ Dormiste ≥6h" : (sleepOk === false ? "⚠️ Sono curto (<6h)" : "Sono por registar");
  let waterText = water >= WATER_MIN ? "✓ Água em dia" : `Água: ${(water/1000).toFixed(1)}L / 3.5L`;
  let recReady = true;

  if (store.hist.length) {
    const last = store.hist[store.hist.length - 1];
    const recHours = store.settings.recoveryHours || 36;
    const hoursSince = (Date.now() - (last.ts || 0)) / (3600 * 1000);
    recReady = hoursSince >= recHours;
  }

  const recText = recReady ? "✓ Pronto para treinar" : "⏱ Em recuperação (janela 36h)";

  textEl.innerHTML = `
    <div style="display:flex; flex-direction:column; gap:4px;">
      <div><b>Nutrição sugerida:</b> ${tierName}</div>
      <div><b>Recuperação HIT:</b> ${recText}</div>
      <div style="font-size:.82rem; color:var(--muted); margin-top:2px;">${sleepText} · ${waterText}</div>
    </div>
  `;
}

function getActiveHabits() {
  const dayOfWeek = new Date().getDay();
  return (store.habits || []).filter(h => !h.days || h.days.includes(dayOfWeek));
}

function renderHabitsHoje() {
  const host = $("hoje-habits-card");
  const meta = $("hoje-habits-meta");
  if (!host) return;
  host.innerHTML = "";

  const active = getActiveHabits();
  const done = active.filter(h => store.dayUI.habitsDone?.[h.id]).length;
  meta.textContent = `${done}/${active.length}`;

  if (!active.length) {
    host.appendChild(el("p", "cardio-foot", "Sem hábitos para hoje."));
    return;
  }

  active.forEach(h => {
    const isDone = !!store.dayUI.habitsDone?.[h.id];
    const row = el("div", `list-row${isDone ? " done" : ""}`);
    const name = el("div", "list-name", h.name);

    // Calcular Streak atual (dias consecutivos concluídos)
    let streak = 0;
    const d = new Date();
    while (true) {
      const iso = `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, "0")}-${String(d.getDate()).padStart(2, "0")}`;
      const log = iso === isoToday() ? store.dayUI.habitsDone : store.dailyLogs[iso]?.habitsDone;
      // Simplificado: se tem registo ou é o dia de hoje
      if (iso === isoToday() ? store.dayUI.habitsDone?.[h.id] : store.dailyLogs[iso]) {
        streak++;
        d.setDate(d.getDate() - 1);
      } else {
        break;
      }
    }

    name.appendChild(el("small", null, `${h.cat}${streak > 1 ? ` · 🔥 ${streak} dias` : ""}`));
    row.appendChild(name);

    const check = el("button", `check${isDone ? " checked" : ""}`);
    check.type = "button";
    check.setAttribute("aria-label", `Marcar hábito ${h.name}`);
    check.addEventListener("click", () => {
      store.dayUI.habitsDone[h.id] = !store.dayUI.habitsDone[h.id];
      persist(true);
      renderHabitsHoje();
    });
    row.appendChild(check);
    host.appendChild(row);
  });
}

function addQuickTask() {
  const titleIn = $("hoje-new-task");
  const dateIn = $("hoje-new-date");
  const text = titleIn.value.trim();
  if (!text) return;

  store.tasks.push({
    id: "t-" + Date.now(),
    title: text,
    date: dateIn.value || isoToday(),
    done: false
  });
  titleIn.value = "";
  persist(true);
  renderTasksHoje();
}

function renderTasksHoje() {
  const host = $("hoje-tasks-list");
  const meta = $("hoje-tasks-meta");
  if (!host) return;
  host.innerHTML = "";
  const today = isoToday();

  const sorted = [...store.tasks].sort((a, b) => {
    if (!!a.done !== !!b.done) return a.done ? 1 : -1;
    return (a.date || "9999-99-99").localeCompare(b.date || "9999-99-99");
  });

  const pending = sorted.filter(t => !t.done).length;
  meta.textContent = `${pending} pendentes`;

  if (!sorted.length) {
    host.appendChild(el("p", "cardio-foot", "Sem tarefas."));
    return;
  }

  sorted.slice(0, 5).forEach(t => {
    const isOverdue = !t.done && t.date && t.date < today;
    const row = el("div", `list-row${t.done ? " done" : ""}${isOverdue ? " overdue" : ""}`);
    const name = el("div", "list-name", t.title);
    if (t.date) {
      name.appendChild(el("small", null, `${isOverdue ? "⚠️ Atrasada · " : "Prazo: "}${fmtDate(t.date)}`));
    }
    row.appendChild(name);

    const check = el("button", `check${t.done ? " checked" : ""}`);
    check.type = "button";
    check.setAttribute("aria-label", `Marcar tarefa ${t.title}`);
    check.addEventListener("click", () => {
      t.done = !t.done;
      persist(true);
      renderTasksHoje();
    });
    row.appendChild(check);
    host.appendChild(row);
  });
}