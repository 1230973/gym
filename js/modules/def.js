import { store, persist, buildBlob, validateAndApplyBlob, freshToday, freshNtDone, isoToday, wipeAllData, cloudConfig, saveCloudConfig, cloudPush, cloudPull } from "../../store.js";
import { $, el, toast } from "../../ui.js";

export function initDefModule() {
  const host = $("page-def");
  host.innerHTML = `
    <section class="section">
      <div class="section-head"><h2 class="section-title">Parâmetros & Alvos</h2></div>
      <div class="card">
        <div class="sess-row">
          <label for="def-prot">Meta de Proteína (g)</label>
          <input class="load-input" type="number" id="def-prot" style="width:90px;">
        </div>
        <div class="sess-row">
          <label for="def-water">Água Mínima (ml)</label>
          <input class="load-input" type="number" id="def-water" style="width:90px;">
        </div>
        <div class="sess-row">
          <label for="def-rec">Janela Recuperação (h)</label>
          <input class="load-input" type="number" id="def-rec" style="width:90px;">
        </div>
        <div style="margin-top:12px;">
          <button class="btn btn-primary" id="btn-save-defs" type="button" style="width:100%;">Guardar Parâmetros</button>
        </div>
      </div>
    </section>

    <section class="section">
      <details class="drawer">
        <summary>Sincronização Cloud (Supabase)</summary>
        <div class="sess-row"><input class="text-input" type="url" id="cloud-url" placeholder="https://xyz.supabase.co"></div>
        <div class="sess-row"><input class="text-input" type="password" id="cloud-key" placeholder="Supabase Anon Key"></div>
        <div class="sess-row"><input class="text-input" type="text" id="cloud-id" placeholder="Sync ID (≥32 chars)" style="font-family:var(--mono); font-size:.76rem;"></div>
        <div class="danger-row">
          <button class="btn" id="btn-cloud-push" type="button">Enviar p/ Cloud</button>
          <button class="btn" id="btn-cloud-pull" type="button">Puxar da Cloud</button>
        </div>
      </details>

      <details class="drawer">
        <summary>Backup JSON e Sistema</summary>
        <p class="cardio-foot" style="margin-bottom:10px;">Versão da App: <b>Life OS v7.0</b></p>
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

  $("def-prot").value = store.settings.proteinTarget;
  $("def-water").value = store.settings.waterMin;
  $("def-rec").value = store.settings.recoveryHours;

  $("btn-save-defs").addEventListener("click", () => {
    store.settings.proteinTarget = parseInt($("def-prot").value, 10) || 140;
    store.settings.waterMin = parseInt($("def-water").value, 10) || 3500;
    store.settings.recoveryHours = parseInt($("def-rec").value, 10) || 36;
    persist(true);
    toast("Parâmetros atualizados");
  });

  $("cloud-url").value = cloudConfig.url || "";
  $("cloud-key").value = cloudConfig.key || "";
  $("cloud-id").value = cloudConfig.syncId || "";

  const persistCloudInputs = () => {
    saveCloudConfig($("cloud-url").value, $("cloud-key").value, $("cloud-id").value);
    $("cloud-id").value = cloudConfig.syncId;
    toast("Configuração Cloud guardada");
  };
  $("cloud-url").addEventListener("change", persistCloudInputs);
  $("cloud-key").addEventListener("change", persistCloudInputs);
  $("cloud-id").addEventListener("change", persistCloudInputs);

  $("btn-cloud-push").addEventListener("click", async () => {
    saveCloudConfig($("cloud-url").value, $("cloud-key").value, $("cloud-id").value);
    const ok = await cloudPush(buildBlob());
    toast(ok ? "Sincronizado com a Cloud!" : "Erro ao enviar");
  });

  $("btn-cloud-pull").addEventListener("click", async () => {
    saveCloudConfig($("cloud-url").value, $("cloud-key").value, $("cloud-id").value);
    const ok = await cloudPull();
    if (ok) { toast("Dados puxados!"); setTimeout(() => window.location.reload(), 500); }
    else toast("Erro ao puxar");
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
        persist(true);
        toast("Backup importado");
        setTimeout(() => window.location.reload(), 500);
      } catch (err) {
        toast("Ficheiro inválido");
      }
    };
    r.readAsText(f);
  });

  $("btn-reset-day").addEventListener("click", () => {
    if (!window.confirm("Limpar vistos de hoje?")) return;
    store.dayUI = freshToday();
    store.ntDone = freshNtDone();
    persist(true);
    window.location.reload();
  });

  $("btn-reset-all").addEventListener("click", () => {
    if (window.confirm("Apagar TUDO?")) wipeAllData();
  });
}

export function renderDefModule() {}