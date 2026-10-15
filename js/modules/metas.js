import { WATER_MIN } from "../data.js";
import { store, persist, buildBlob, validateAndApplyBlob, freshToday, freshNtDone, isoToday, wipeAllData, cloudPush, cloudPull } from "../store.js";
import { $, el, toast, fmtDate } from "../ui.js";

export function initMetasModule() {
  const host = $("page-metas");
  host.innerHTML = `
    <section class="section">
      <div class="section-head">
        <h2 class="section-title">Consistência (Últimos 7 Dias)</h2>
        <span class="section-meta">Água · Cardio · Supp · Hábitos</span>
      </div>
      <div class="card">
        <div class="week-grid" id="week-grid"></div>
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
        <summary>Sincronização Cloud (Supabase REST)</summary>
        <p class="cardio-foot" style="margin-bottom:10px;">Opcional: cria uma tabela <code>life_os_sync (id text primary key, payload jsonb, updated_at timestamptz)</code> no Supabase para sincronizar entre o telemóvel e o PC.</p>
        <div class="sess-row"><input class="text-input" type="url" id="cloud-url" placeholder="https://xyz.supabase.co"></div>
        <div class="sess-row"><input class="text-input" type="password" id="cloud-key" placeholder="Supabase Anon/Service Key"></div>
        <div class="sess-row"><input class="text-input" type="text" id="cloud-id" placeholder="ID (ex: tomas-main)"></div>
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

  $("btn-add-habit").addEventListener("click", addHabit);
  $("new-habit-name").addEventListener("keydown", e => { if (e.key === "Enter") addHabit(); });

  $("btn-add-task").addEventListener("click", addTask);
  $("new-task-title").addEventListener("keydown", e => { if (e.key === "Enter") addTask(); });
  $("btn-clear-done-tasks").addEventListener("click", () => {
    const doneCount = store.tasks.filter(t => t.done).length;
    if (!doneCount) { toast("Sem tarefas concluídas para limpar"); return; }
    store.tasks = store.tasks.filter(t => !t.done);
    persist();
    renderTasks();
    toast("Tarefas concluídas removidas");
  });

  $("cloud-url").value = store.cloud.url || "";
  $("cloud-key").value = store.cloud.key || "";
  $("cloud-id").value = store.cloud.syncId || "tomas-main";
  const saveCloudCfg = () => {
    store.cloud.url = $("cloud-url").value.trim();
    store.cloud.key = $("cloud-key").value.trim();
    store.cloud.syncId = $("cloud-id").value.trim() || "tomas-main";
    persist();
  };
  $("cloud-url").addEventListener("change", saveCloudCfg);
  $("cloud-key").addEventListener("change", saveCloudCfg);
  $("cloud-id").addEventListener("change", saveCloudCfg);

  $("btn-cloud-push").addEventListener("click", async () => {
    saveCloudCfg();
    const ok = await cloudPush();
    toast(ok ? "Sincronizado com a Cloud!" : "Erro: verifica URL/Key do Supabase");
  });

  $("btn-cloud-pull").addEventListener("click", async () => {
    saveCloudCfg();
    const ok = await cloudPull();
    if (ok) { toast("Dados puxados da Cloud!"); setTimeout(() => window.location.reload(), 600); }
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
    toast("Backup exportado");
  });

  $("btn-import").addEventListener("click", () => $("import-file").click());
  $("import-file").addEventListener("change", e => {
    const f = e.target.files[0];
    if (!f) return;
    const r = new FileReader();
    r.onload = () => {
      try {
        validateAndApplyBlob(JSON.parse(r.result));
        persist();
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
    persist();
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

function renderWeeklyConsistency() {
  const host = $("week-grid");
  if (!host) return;
  host.innerHTML = "";
  const todayIso = isoToday();

  for (let i = 6; i >= 0; i--) {
    const d = new Date();
    d.setDate(d.getDate() - i);
    const iso = `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, "0")}-${String(d.getDate()).padStart(2, "0")}`;
    const snap = iso === todayIso ? {
      water: store.dayUI.water || 0,
      cardioDone: Object.values(store.dayUI.cardio || {}).filter(c => c && c.done).length,
      suppDone: Object.values(store.dayUI.supp || {}).filter(Boolean).length,
      habitsDone: Object.values(store.dayUI.habitsDone || {}).filter(Boolean).length
    } : (store.dailyLogs[iso] || { water: 0, cardioDone: 0, suppDone: 0, habitsDone: 0 });

    const col = el("div", `week-day${iso === todayIso ? " today" : ""}`);
    const dayLbl = d.toLocaleDateString("pt-PT", { weekday: "short" }).replace(".", "");
    col.appendChild(el("span", "week-label", `${dayLbl} ${d.getDate()}`));

    const dots = el("div", "week-dots");
    dots.appendChild(el("span", `w-dot${snap.water >= WATER_MIN ? " ok-water" : ""}`));
    dots.appendChild(el("span", `w-dot${snap.cardioDone >= 2 ? " ok-cardio" : ""}`));
    dots.appendChild(el("span", `w-dot${snap.suppDone >= 4 ? " ok-supp" : ""}`));
    dots.appendChild(el("span", `w-dot${snap.habitsDone >= 1 ? " ok-hab" : ""}`));
    col.appendChild(dots);
    host.appendChild(col);
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
  persist();
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
      persist();
      renderWeeklyConsistency();
    });
    row.appendChild(check);

    const del = el("button", "del-btn", "✕");
    del.type = "button";
    del.setAttribute("aria-label", `Remover hábito ${h.name}`);
    del.addEventListener("click", () => {
      if (!window.confirm(`Remover o hábito "${h.name}"?`)) return;
      store.habits = store.habits.filter(item => item.id !== h.id);
      persist();
      renderHabits();
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
  persist();
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
      persist();
      renderTasks();
    });
    row.appendChild(check);

    const del = el("button", "del-btn", "✕");
    del.type = "button";
    del.setAttribute("aria-label", `Apagar tarefa ${t.title}`);
    del.addEventListener("click", () => {
      store.tasks = store.tasks.filter(item => item.id !== t.id);
      persist();
      renderTasks();
    });
    row.appendChild(del);

    host.appendChild(row);
  });
}