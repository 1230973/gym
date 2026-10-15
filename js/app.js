import { PLAN } from "./data.js";
import { store, loadStore, persist, onStoreChange } from "./store.js";
import { $ } from "./ui.js";
import { initTreinoModule } from "./modules/treino.js";
import { initNutricaoModule } from "./modules/nutricao.js";
import { initMetasModule } from "./modules/metas.js";

function updateNavBadges() {
  const items = PLAN[store.state.day].exercises;
  const exDone = items.filter(n => store.dayUI.ex[`${store.state.day}|${n}`]).length;
  $("nav-badge-treino").textContent = `· D${store.state.day} (${exDone}/${items.length})`;

  const liters = ((store.dayUI.water || 0) / 1000).toFixed(1) + "L";
  $("nav-badge-nutri").textContent = `· ${liters}`;

  const pendingTasks = (store.tasks || []).filter(t => !t.done).length;
  $("nav-badge-metas").textContent = pendingTasks ? `· (${pendingTasks})` : "";
}

function switchPage(pageId) {
  store.state.page = pageId;
  document.querySelectorAll(".page-view").forEach(v => {
    v.classList.toggle("active", v.id === pageId);
  });
  document.querySelectorAll(".nav-tab").forEach(t => {
    const isAct = t.dataset.target === pageId;
    t.classList.toggle("active", isAct);
    if (isAct) $("topbar-title").textContent = t.dataset.title;
  });
  window.scrollTo({ top: 0, behavior: "instant" });
  persist();
}

async function bootstrap() {
  const s = new Date().toLocaleDateString("pt-PT", { weekday: "short", day: "numeric", month: "short" });
  $("today-label").textContent = s.charAt(0).toUpperCase() + s.slice(1);

  await loadStore();

  initTreinoModule();
  initNutricaoModule();
  initMetasModule();

  onStoreChange(updateNavBadges);
  updateNavBadges();

  document.querySelectorAll(".nav-tab").forEach(tab => {
    tab.addEventListener("click", () => switchPage(tab.dataset.target));
  });

  if (store.state.page) {
    switchPage(store.state.page);
  }
}

document.addEventListener("DOMContentLoaded", bootstrap);