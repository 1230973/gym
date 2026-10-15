import { WATER_MIN } from "../data.js";
import {
  store, persist, buildBlob, validateAndApplyBlob, freshToday, freshNtDone,
  isoToday, wipeAllData, cloudConfig, saveCloudConfig, cloudPush, cloudPull,
  computeExpectedSuppCount, generateSecureSyncId
} from "../store.js";
import { $, el, toast, fmtDate } from "../ui.js";
import { isPersonalRecord } from "./treino.js";

export function initMetasModule() {
  const host = $("page-metas");
  host.innerHTML = `
    <section class="section">
      <div class="section-head">
        <h2 class="section-title">Consistência (Últimos 7 Dias)</h2>
        <button class="btn btn-sm btn-ghost" id="btn-copy-week" type="button" style="margin-left:auto;">Copiar Resumo</button>
      </div>
      <div class="card">
        <div class="week-grid" id="week-grid"></div>
        <div class="week-legend">
          <span><i class="w-dot ok-water"></i> Água (≥3.5L)</span>
          <span><i class="w-dot ok-cardio"></i> Cardio (≥2)</span>
          <span><i class="w-dot ok-supp"></i> Suplementos (100%)</span>
          <span><i class="w-dot ok-hab"></i> Hábitos (100%)</span>
        </div>
      </div>
    </section>

    <section class="section">
      <div class="section-head">
        <h2 class="section-title">Hábitos Diários</h2>
        <span class="section-meta" id="habits-progress"></span>
      </div>
      <div class="card">
        <div class="sess-row" style="margin-top:0; margin-bottom:10px;">
          <input class="text-input" type="text" id="new-habit-name" placeholder="Novo hábito diário...">
          <input class="text-input" type="text" id="new-habit-cat" placeholder="Categoria" style="max-width:110px;">
          <button class="btn" id="btn-add-habit" type="button" aria-label="Adicionar novo hábito" style="flex:0 0 auto; padding:9px 14px;">+</button>
        </div>
        <div id="habits-card"></div>
      </div>
    </section>

    <section class="section">
      <div class="section-head">
        <h2 class="section-title">Tarefas & Prazos</h2>
        <button class="btn btn-sm btn-ghost" id="btn-clear-done-tasks" type="button" style="margin-left:auto; margin-right:6px;">Limpar concluídas</button>
        <span class="section-meta" id="tasks-progress" style="margin-left:0;"></span>
      </div>
      <div class="card">
        <div class="sess-row" style="margin-top:0; margin-bottom:12px;">
          <input class="text-input" type="text" id="new-task-title" placeholder="Nova meta, entrega ou exame...">
          <input class="date-input" type="date" id="new-task-date" style="max-width:130px;">
          <button class="btn" id="btn-add-task" type="button" aria-label="Adicionar nova tarefa" style="flex:0 0 auto; padding:9px 14px;">+</button>
        </div>
        <div id="tasks-list"></div>
      </div>
    </section>

    <section class="section">
      <details class="drawer">
        <summary>Sincronização Cloud (Supabase Anon Key + RLS)</summary>
        <p class="cardio-foot" style="margin-bottom:10px;">
          Credenciais isoladas apenas neste dispositivo. Usa um <b>Sync ID aleatório de ≥32 caracteres</b> e ativa RLS na tabela <code>life_os_sync</code>.
        </p>
        <div class="sess-row"><input class="text-input" type="url" id="cloud-url" placeholder="https://xyz.supabase.co"></div>
        <div class="sess-row"><input class="text-input" type="password" id="cloud-key" placeholder="Supabase Anon Public Key"></div>
        <div class="sess-row">
          <input class="text-input" type="text" id="cloud-id" placeholder="Sync ID (≥32 chars)" style="font-family:var(--mono); font-size:.76rem;">
          <button class="btn btn-sm" id="btn-gen-syncid" type="button">Gerar ID 32c</button>
        </div>
        <div class="danger-row">
          <button class="btn" id="btn-cloud-push" type="button">Enviar p/ Cloud</button>
          <button class="btn" id="btn-cloud-pull" type="button">Puxar da Cloud</button>
        </div>
      </details>

      <details class="drawer" open>
        <summary>Backup JSON e Reposição</summary>
        <div class="danger-row">
          <button class="btn" id="btn-export" type="button">Exportar JSON</button>
          <button class="btn" id="btn-import" type="button">Importar JSON</button>
          <input type="file" id="import-file" accept=".json" hidden>
        </div>
        <div class="danger-row">
          <button class="btn btn-ghost" id="btn-reset-day" type="button">Limpar vistos de hoje</button>
          <button class="btn btn-ghost" id="btn-reset-all" type="button">Apagar tudo</button>
        </div>
      </details>
    </section>
  `;

  $("btn-copy-week").addEventListener("click", copyWeeklySummary);

  $("btn-add-habit").addEventListener("click", addHabit);
  $("new-habit-name").addEventListener("keydown", e => { if (e.key === "Enter") addHabit(); });

  $("btn-add-task").addEventListener("click", addTask);
  $("new-task-title").addEventListener("keydown", e => { if (e.key === "Enter") addTask(); });
  $("btn-clear-done-tasks").addEventListener("click", () => {
    const doneCount = store.tasks.filter(t => t.done).length;
    if (!doneCount) { toast("Sem tarefas concluídas para limpar"); return; }
    store.tasks = store.tasks.filter(t => !t.done);
    persist(true);
    renderTasks();
    toast("Tarefas concluídas removidas");
  });

  $("cloud-url").value = cloudConfig.url || "";
  $("cloud-key").value = cloudConfig.key || "";
  $("cloud-id").value = cloudConfig.syncId || "";
  const persistCloudInputs = () => {
    saveCloudConfig($("cloud-url").value, $("cloud-key").value, $("cloud-id").value);
    $("cloud-id").value = cloudConfig.syncId;
    toast("Configuração Cloud guardada localmente");
  };
  $("cloud-url").addEventListener("change", persistCloudInputs);
  $("cloud-key").addEventListener("change", persistCloudInputs);
  $("cloud-id").addEventListener("change", persistCloudInputs);

  $("btn-gen-syncid").addEventListener("click", () => {
    $("cloud-id").value = generateSecureSyncId();
    persistCloudInputs();
  });

  $("btn-cloud-push").addEventListener("click", async () => {
    saveCloudConfig($("cloud-url").value, $("cloud-key").value, $("cloud-id").value);
    const ok = await cloudPush(buildBlob());
    toast(ok ? "Sincronizado com a Cloud!" : "Erro: verifica URL/Anon Key do Supabase");
  });

  $("btn-cloud-pull").addEventListener("click", async () => {
    saveCloudConfig($("cloud-url").value, $("cloud-key").value, $("cloud-id").value);
    const ok = await cloudPull();
    if (ok) { toast("Dados puxados da Cloud!"); setTimeout(() => window.location.reload(), 500); }
    else toast("Não foi possível puxar da Cloud");
  });

  $("btn-export").addEventListener("click", () => {
    const data = JSON.stringify(buildBlob(), null, 2);
    const blob = new Blob([data], { type: "application/json" });
    const url = URL.createObjectURL(blob);
    const a = document.createElement("a");
    a.href = url;
    a.download = `life-os-backup-${isoToday()}.json`;
    a.click();
    URL.revokeObjectURL(url);
    toast("Backup exportado (sem chaves Cloud)");
  });

  $("btn-import").addEventListener("click", () => $("import-file").click());
  $("import-file").addEventListener("change", e => {
    const f = e.target.files[0];
    if (!f) return;
    const r = new FileReader();
    r.onload = () => {
      try {
        validateAndApplyBlob(JSON.parse(r.result));
        persist(true);
        toast("Backup importado com sucesso");
        setTimeout(() => window.location.reload(), 500);
      } catch (err) {
        toast(err.message || "Ficheiro JSON inválido");
      }
    };
    r.readAsText(f);
  });

  $("btn-reset-day").addEventListener("click", () => {
    if (!window.confirm("Queres limpar os vistos de exercícios e refeições de hoje?")) return;
    const clearAllToday = window.confirm("Queres TAMBÉM zerar a água, suplementos e hábitos de hoje?\n(Cancelar = mantém água, suplementos e hábitos)");
    if (clearAllToday) {
      store.dayUI = freshToday();
    } else {
      store.dayUI.ex = {};
      store.dayUI.cardio = {};
    }
    store.ntDone = freshNtDone();
    persist(true);
    window.location.reload();
  });

  $("btn-reset-all").addEventListener("click", () => {
    if (window.confirm("Isto apaga TODAS as cargas, histórico, tarefas e configurações. Tens a certeza?")) {
      wipeAllData();
    }
  });

  renderMetasModule();
}

export function renderMetasModule() {
  renderWeeklyConsistency();
  renderHabits();
  renderTasks();
}

function getLast7DaysSnapshots() {
  const todayIso = isoToday();
  const list = [];
  for (let i = 6; i >= 0; i--) {
    const d = new Date();
    d.setDate(d.getDate() - i);
    const iso = `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, "0")}-${String(d.getDate()).padStart(2, "0")}`;
    const snap = iso === todayIso ? {
      water: store.dayUI.water || 0,
      cardioDone: Object.values(store.dayUI.cardio || {}).filter(c => c && c.done).length,
      suppDone: Object.values(store.dayUI.supp || {}).filter(Boolean).length,
      suppTarget: computeExpectedSuppCount(store.ntState?.scenario, store.ntState?.suppFilter),
      habitsDone: Object.values(store.dayUI.habitsDone || {}).filter(Boolean).length,
      habitsTarget: (store.habits || []).length,
      weight: store.dayUI.weight ?? store.bodyWeight[iso] ?? null
    } : (store.dailyLogs[iso] || {
      water: 0,
      cardioDone: 0,
      suppDone: 0,
      suppTarget: 4,
      habitsDone: 0,
      habitsTarget: store.habits.length || 1,
      weight: store.bodyWeight[iso] ?? null
    });
    list.push({ dateObj: d, iso, snap });
  }
  return list;
}

function renderWeeklyConsistency() {
  const host = $("week-grid");
  if (!host) return;
  host.innerHTML = "";
  const todayIso = isoToday();
  const days = getLast7DaysSnapshots();

  days.forEach(({ dateObj, iso, snap }) => {
    const col = el("div", `week-day${iso === todayIso ? " today" : ""}`);
    const dayLbl = dateObj.toLocaleDateString("pt-PT", { weekday: "short" }).replace(".", "");
    col.appendChild(el("span", "week-label", `${dayLbl} ${dateObj.getDate()}`));

    const suppTarget = snap.suppTarget || 4;
    const habTarget = snap.habitsTarget || store.habits.length || 1;

    const dots = el("div", "week-dots");
    dots.appendChild(el("span", `w-dot${snap.water >= WATER_MIN ? " ok-water" : ""}`));
    dots.appendChild(el("span", `w-dot${snap.cardioDone >= 2 ? " ok-cardio" : ""}`));
    dots.appendChild(el("span", `w-dot${snap.suppDone >= suppTarget && suppTarget > 0 ? " ok-supp" : ""}`));
    dots.appendChild(el("span", `w-dot${snap.habitsDone >= habTarget && habTarget > 0 ? " ok-hab" : ""}`));
    col.appendChild(dots);
    host.appendChild(col);
  });
}

function copyWeeklySummary() {
  const days = getLast7DaysSnapshots();
  const startIso = days[0].iso;

  const weekSessions = store.hist.filter(h => h.date >= startIso);
  const totalCardio = days.reduce((acc, d) => acc + (d.snap.cardioDone || 0), 0);
  const avgWater = (days.reduce((acc, d) => acc + (d.snap.water || 0), 0) / 7 / 1000).toFixed(2);
  const weights = days.map(d => d.snap.weight).filter(w => typeof w === "number" && !isNaN(w));
  const avgWeight = weights.length ? (weights.reduce((a, b) => a + b, 0) / weights.length).toFixed(1) + "kg" : "—";

  // Contabilizar PRs reais batidos nas sessões dos últimos 7 dias (ignorando SEED)
  let prCount = 0;
  weekSessions.forEach(sess => {
    const sessIdx = store.hist.indexOf(sess);
    if (sessIdx > 0) {
      Object.keys(sess.entries || {}).forEach(exName => {
        const e = sess.entries[exName];
        if (isPersonalRecord(sess.day, exName, e?.kg, e?.reps, sessIdx - 1)) {
          prCount++;
        }
      });
    }
  });

  const summary = [
    `📊 Resumo Semanal Life OS (${fmtDate(startIso)} a ${fmtDate(isoToday())})`,
    `• Sessões HIT concluídas: ${weekSessions.length}`,
    `• Recordes Pessoais (PRs): ${prCount}`,
    `• Blocos de Passadeira: ${totalCardio} sessões`,
    `• Média de Água: ${avgWater}L / dia`,
    `• Peso Médio (MM7d): ${avgWeight}`
  ].join("\n");

  if (navigator.clipboard && navigator.clipboard.writeText) {
    navigator.clipboard.writeText(summary).then(() => toast("Resumo semanal copiado!"));
  } else {
    toast("Não foi possível copiar");
  }
}

function addHabit() {
  const nameIn = $("new-habit-name");
  const catIn = $("new-habit-cat");
  const name = nameIn.value.trim();
  if (!name) return;
  store.habits.push({
    id: "h-" + Date.now(),
    name,
    cat: catIn.value.trim() || "Diário"
  });
  nameIn.value = "";
  catIn.value = "";
  persist(true);
  renderHabits();
  renderWeeklyConsistency();
}

function renderHabits() {
  const host = $("habits-card");
  host.innerHTML = "";
  const updateCount = () => {
    const done = store.habits.filter(h => store.dayUI.habitsDone?.[h.id]).length;
    $("habits-progress").textContent = `${done}/${store.habits.length}`;
  };

  store.habits.forEach(h => {
    const isDone = !!store.dayUI.habitsDone?.[h.id];
    const row = el("div", `list-row${isDone ? " done" : ""}`);
    const name = el("div", "list-name", h.name);
    name.appendChild(el("small", null, h.cat));
    row.appendChild(name);

    const check = el("button", `check${isDone ? " checked" : ""}`);
    check.type = "button";
    check.setAttribute("aria-label", `Marcar hábito ${h.name}`);
    check.addEventListener("click", () => {
      store.dayUI.habitsDone[h.id] = !store.dayUI.habitsDone[h.id];
      row.classList.toggle("done", !!store.dayUI.habitsDone[h.id]);
      check.classList.toggle("checked", !!store.dayUI.habitsDone[h.id]);
      updateCount();
      persist(true);
      renderWeeklyConsistency();
    });
    row.appendChild(check);

    const del = el("button", "del-btn", "✕");
    del.type = "button";
    del.setAttribute("aria-label", `Remover hábito ${h.name}`);
    del.addEventListener("click", () => {
      if (!window.confirm(`Remover o hábito "${h.name}"?`)) return;
      store.habits = store.habits.filter(item => item.id !== h.id);
      persist(true);
      renderHabits();
      renderWeeklyConsistency();
    });
    row.appendChild(del);

    host.appendChild(row);
  });

  updateCount();
}

function addTask() {
  const titleIn = $("new-task-title");
  const dateIn = $("new-task-date");
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
  renderTasks();
}

function renderTasks() {
  const host = $("tasks-list");
  host.innerHTML = "";
  const today = isoToday();

  const sorted = [...store.tasks].sort((a, b) => {
    if (!!a.done !== !!b.done) return a.done ? 1 : -1;
    return (a.date || "9999-99-99").localeCompare(b.date || "9999-99-99");
  });

  const pending = sorted.filter(t => !t.done).length;
  $("tasks-progress").textContent = `${pending} pendentes`;

  if (!sorted.length) {
    host.appendChild(el("p", "cardio-foot", "Sem tarefas pendentes."));
    return;
  }

  sorted.forEach(t => {
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
      renderTasks();
    });
    row.appendChild(check);

    const del = el("button", "del-btn", "✕");
    del.type = "button";
    del.setAttribute("aria-label", `Apagar tarefa ${t.title}`);
    del.addEventListener("click", () => {
      store.tasks = store.tasks.filter(item => item.id !== t.id);
      persist(true);
      renderTasks();
    });
    row.appendChild(del);

    host.appendChild(row);
  });
}