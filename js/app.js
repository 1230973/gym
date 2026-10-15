import { store, loadStore, persist, checkRolloverOnWake, onStoreChange, cloudSyncReconcile } from "./store.js";
import { $, toast } from "./ui.js";
import { initHojeModule, renderHojeModule } from "./modules/hoje.js";
import { initTreinoModule, renderTreinoModule } from "./modules/treino.js";
import { initNutricaoModule, renderNutricaoModule } from "./modules/nutricao.js";
import { initDefModule, renderDefModule } from "./modules/def.js";

function updateTopDate() {
  const s = new Date().toLocaleDateString("pt-PT", { weekday: "short", day: "numeric", month: "short" });
  $("today-label").textContent = s.charAt(0).toUpperCase() + s.slice(1);
}

function updateNavBadges() {
  const items = store.settings.plan[store.state.day]?.exercises || [];
  const exDone = items.filter(n => store.dayUI.ex[`${store.state.day}|${n}`]).length;
  $("nav-badge-treino").textContent = `· D${store.state.day} (${exDone}/${items.length})`;

  const liters = ((store.dayUI.water || 0) / 1000).toFixed(1) + "L";
  $("nav-badge-nutri").textContent = `· ${liters}`;

  const pendingTasks = (store.tasks || []).filter(t => !t.done).length;
  $("nav-badge-hoje").textContent = pendingTasks ? `· (${pendingTasks})` : "";
}

function switchPage(pageId, isUserAction = true) {
  store.state.page = pageId;
  document.querySelectorAll(".page-view").forEach(v => {
    v.classList.toggle("active", v.id === pageId);
  });
  document.querySelectorAll(".nav-tab").forEach(t => {
    const isAct = t.dataset.target === pageId;
    t.classList.toggle("active", isAct);
    if (isAct) $("topbar-title").textContent = t.dataset.title;
  });
  if (pageId === "page-hoje") renderHojeModule();
  if (pageId === "page-treino") renderTreinoModule();
  if (pageId === "page-nutri") renderNutricaoModule();
  if (pageId === "page-def") renderDefModule();
  window.scrollTo({ top: 0, behavior: "instant" });
  if (isUserAction) persist(true);
}

function rerenderAllModules() {
  updateTopDate();
  renderHojeModule();
  renderTreinoModule();
  renderNutricaoModule();
  renderDefModule();
  updateNavBadges();
}

async function bootstrap() {
  updateTopDate();

  await loadStore();

  initHojeModule();
  initTreinoModule();
  initNutricaoModule();
  initDefModule();

  onStoreChange(updateNavBadges);
  updateNavBadges();

  document.querySelectorAll(".nav-tab").forEach(tab => {
    tab.addEventListener("click", () => switchPage(tab.dataset.target, true));
  });

  if (store.state.page) {
    switchPage(store.state.page, false);
  }

  window.addEventListener("pagehide", () => persist(false));
  document.addEventListener("visibilitychange", () => {
    if (document.visibilityState === "hidden") {
      persist(false);
    } else if (document.visibilityState === "visible") {
      if (checkRolloverOnWake()) {
        rerenderAllModules();
        toast("Novo dia iniciado");
      }
      cloudSyncReconcile(() => {
        rerenderAllModules();
        toast("Sincronizado com a Cloud");
      });
    }
  });

  window.addEventListener("online", () => {
    cloudSyncReconcile(() => {
      rerenderAllModules();
      toast("Ligação retomada");
    });
  });

  await cloudSyncReconcile(() => {
    rerenderAllModules();
    toast("Dados mais recentes carregados da Cloud");
  });
}

document.addEventListener("DOMContentLoaded", bootstrap);