import { store, persist, buildBlob, applyBlob, freshToday, freshNtDone, isoToday, wipeAllData } from "../store.js";
import { $, el, toast, fmtDate } from "../ui.js";

export function initMetasModule() {
  const host = $("page-metas");
  host.innerHTML = `
    <section class="section">
      <div class="section-head">
        <h2 class="section-title">Hábitos Diários</h2>
        <span class="section-meta" id="habits-progress"></span>
      </div>
      <div class="card" id="habits-card"></div>
    </section>

    <section class="section">
      <div class="section-head">
        <h2 class="section-title">Tarefas & Prazos (Faculdade / TryIt)</h2>
        <span class="section-meta" id="tasks-progress"></span>
      </div>
      <div class="card">
        <div class="sess-row" style="margin-top:0; margin-bottom:12px;">
          <input class="text-input" type="text" id="new-task-title" placeholder="Nova meta, entrega ou evento...">
          <input class="date-input" type="date" id="new-task-date" style="max-width:130px;">
          <button class="btn" id="btn-add-task" type="button" style="flex:0 0 auto; padding:9px 14px;">+</button>
        </div>
        <div id="tasks-list"></div>
      </div>
    </section>

    <section class="section">
      <details class="drawer" open>
        <summary>Backup, Exportação e Sistema</summary>
        <ul class="hack-list">
          <li><strong>Persistência Dupla:</strong> Todos os dados de treino, nutrição e metas são gravados instantaneamente em LocalStorage e IndexedDB.</li>
        </ul>
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

  $("btn-add-task").addEventListener("click", addTask);
  $("new-task-title").addEventListener("keydown", e => {
    if (e.key === "Enter") addTask();
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
        applyBlob(JSON.parse(r.result));
        persist();
        window.location.reload();
      } catch (err) {
        toast("Ficheiro JSON inválido");
      }
    };
    r.readAsText(f);
  });

  $("btn-reset-day").addEventListener("click", () => {
    store.dayUI = freshToday();
    store.ntDone = freshNtDone();
    persist();
    window.location.reload();
  });

  $("btn-reset-all").addEventListener("click", () => {
    if (window.confirm("Isto apaga cargas, histórico, tarefas e estado. Continuar?")) {
      wipeAllData();
    }
  });

  renderMetasModule();
}

export function renderMetasModule() {
  renderHabits();
  renderTasks();
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
    check.addEventListener("click", () => {
      store.dayUI.habitsDone[h.id] = !store.dayUI.habitsDone[h.id];
      row.classList.toggle("done", !!store.dayUI.habitsDone[h.id]);
      check.classList.toggle("checked", !!store.dayUI.habitsDone[h.id]);
      updateCount();
      persist();
    });
    row.appendChild(check);
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
  const pending = store.tasks.filter(t => !t.done).length;
  $("tasks-progress").textContent = `${pending} pendentes`;

  if (!store.tasks.length) {
    host.appendChild(el("p", "cardio-foot", "Sem tarefas pendentes."));
    return;
  }

  store.tasks.forEach(t => {
    const row = el("div", `list-row${t.done ? " done" : ""}`);
    const name = el("div", "list-name", t.title);
    if (t.date) name.appendChild(el("small", null, `Prazo: ${fmtDate(t.date)}`));
    row.appendChild(name);

    const check = el("button", `check${t.done ? " checked" : ""}`);
    check.type = "button";
    check.addEventListener("click", () => {
      t.done = !t.done;
      persist();
      renderTasks();
    });
    row.appendChild(check);

    const del = el("button", "del-btn", "✕");
    del.type = "button";
    del.addEventListener("click", () => {
      store.tasks = store.tasks.filter(item => item.id !== t.id);
      persist();
      renderTasks();
    });
    row.appendChild(del);

    host.appendChild(row);
  });
}