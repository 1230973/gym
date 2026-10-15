import { SUPP_ITEMS, WATER_MIN, WATER_MAX, FOOD_BANKS, NT_TIERS, NT_TIER_ORDER, NT_SCENARIO_TIER } from "../data.js";
import { store, persist, isoToday } from "../store.js";
import { $, el } from "../ui.js";

let ntActiveTier = "";

export function initNutricaoModule() {
  const host = $("page-nutri");
  host.innerHTML = `
    <section class="section">
      <div class="section-head"><h2 class="section-title">Água</h2><span class="section-meta" id="water-progress"></span></div>
      <div class="card">
        <div class="water-row">
          <div class="water-amount" id="water-amount">0.00L</div>
          <div class="water-target">meta 3.5-4.5L</div>
        </div>
        <div class="water-bar"><div class="water-bar-fill" id="water-bar-fill"></div></div>
        <div class="water-actions" id="water-actions">
          <button class="btn" type="button" data-add="250">+250ml</button>
          <button class="btn" type="button" data-add="500">+500ml</button>
          <button class="btn" type="button" data-add="1000">+1L</button>
          <button class="btn btn-ghost" type="button" id="water-reset">Reset</button>
        </div>
      </div>
    </section>

    <section class="section">
      <div class="section-head"><h2 class="section-title">Suplementos</h2><span class="section-meta" id="supp-progress"></span></div>
      <div class="card" id="supp-card"></div>
    </section>

    <section class="section">
      <div class="section-head"><h2 class="section-title">Nutrição</h2><span class="section-meta" id="nt-progress"></span></div>
      <div class="nt-chips" id="nt-chips">
        <button class="nt-chip" type="button" data-scenario="high-am">Treino Manhã (10h)</button>
        <button class="nt-chip" type="button" data-scenario="high-pm">Treino Noite (22h)</button>
        <button class="nt-chip" type="button" data-scenario="rest-after-double">Descanso (após 36h)</button>
        <button class="nt-chip" type="button" data-scenario="rest-next-am">Descanso (pré-manhã)</button>
        <button class="nt-chip" type="button" data-scenario="rest-next-pm">Descanso (pré-noite / &gt;48h)</button>
      </div>
      <div class="nt-pill-toggle" id="nt-pill-toggle" hidden>
        <button class="nt-pill" type="button" data-mode="low">Low</button>
        <button class="nt-pill" type="button" data-mode="med">Forçar Med</button>
      </div>
      <div class="nt-macro-card" id="nt-macro-card" hidden>
        <div class="nt-macro-accent"></div>
        <div class="nt-macro-grid">
          <div class="nt-macro-box"><span class="nt-macro-num" id="nt-m-hc"></span><span class="nt-macro-lab">Hidratos</span></div>
          <div class="nt-macro-box"><span class="nt-macro-num" id="nt-m-prot"></span><span class="nt-macro-lab">Proteína</span></div>
          <div class="nt-macro-box"><span class="nt-macro-num" id="nt-m-gord"></span><span class="nt-macro-lab">Gordura</span></div>
          <div class="nt-macro-box"><span class="nt-macro-num" id="nt-m-kcal"></span><span class="nt-macro-lab">Kcal</span></div>
        </div>
        <div class="nt-macro-tier-name" id="nt-macro-tier-name"></div>
      </div>
      <p class="nt-legend"><b>Peri-treino</b>: rápidos, gordura zero (+ fruta no pós-treino). <b>Longe do treino</b>: lentos/médios, gordura à vontade (zero fruta ao jantar). Em dias High: <b>70%</b> dos hidratos (~330g) peri-treino, <b>30%</b> (~140g) no resto do dia.</p>
      <div class="nt-meals" id="nt-meals"></div>
      <button class="secondary-btn" type="button" id="nt-peek-btn">Consultar outros tiers</button>
      <div class="nt-peek-panel" id="nt-peek-panel" hidden>
        <div class="nt-peek-tabs" id="nt-peek-tabs"></div>
        <div class="nt-peek-meals" id="nt-peek-meals"></div>
      </div>
      <details class="drawer"><summary>Banco de alimentos</summary><div id="fb-body"></div></details>
      <details class="drawer">
        <summary>Hacks de execução e timing</summary>
        <ul class="hack-list">
          <li><strong>Filtro do treino noturno:</strong> no High à noite, nada de pão branco ou fruta isolada de manhã; guarda os rápidos para o pré e pós-treino.</li>
          <li><strong>Osmolaridade da maltodextrina:</strong> 30g sempre em pelo menos 600ml de água.</li>
          <li><strong>Pesagem dos amidos:</strong> arroz e batata em peso cozinhado (em cru: arroz ÷3).</li>
        </ul>
      </details>
    </section>
  `;

  $("water-actions").querySelectorAll("[data-add]").forEach(btn => {
    btn.addEventListener("click", () => {
      store.dayUI.water = (store.dayUI.water || 0) + parseInt(btn.dataset.add, 10);
      renderWater();
      persist();
    });
  });

  $("water-reset").addEventListener("click", () => {
    store.dayUI.water = 0;
    renderWater();
    persist();
  });

  $("nt-chips").querySelectorAll(".nt-chip").forEach(chip => {
    chip.addEventListener("click", () => ntSelect(chip.dataset.scenario, false));
  });

  $("nt-pill-toggle").querySelectorAll(".nt-pill").forEach(pill => {
    pill.addEventListener("click", () => {
      store.ntState.mode = pill.dataset.mode;
      persist();
      renderNutricaoModule();
    });
  });

  $("nt-peek-btn").addEventListener("click", () => {
    const panel = $("nt-peek-panel");
    if (panel.hidden) openPeek();
    else { panel.hidden = true; $("nt-peek-btn").textContent = "Consultar outros tiers"; }
  });

  renderFoodBanks();
  renderNutricaoModule();
}

export function renderNutricaoModule() {
  renderWater();
  renderSupp();
  if (store.ntState.scenario && NT_SCENARIO_TIER[store.ntState.scenario]) {
    ntSelect(store.ntState.scenario, true);
  }
}

function renderWater() {
  const ml = store.dayUI.water || 0;
  $("water-amount").textContent = `${(ml / 1000).toFixed(2)}L`;
  $("water-bar-fill").style.width = `${Math.min(100, (ml / WATER_MAX) * 100)}%`;
  $("water-progress").textContent = ml >= WATER_MIN ? "✓ meta" : `${(ml / 1000).toFixed(2)}L / 3.5L`;
}

function renderSupp() {
  const host = $("supp-card");
  host.innerHTML = "";
  const updateCount = () => {
    const done = SUPP_ITEMS.filter(i => store.dayUI.supp?.[i.id]).length;
    $("supp-progress").textContent = `${done}/${SUPP_ITEMS.length}`;
  };

  SUPP_ITEMS.forEach(item => {
    const isDone = !!(store.dayUI.supp && store.dayUI.supp[item.id]);
    const row = el("div", `list-row${isDone ? " done" : ""}`);
    const name = el("div", "list-name", item.name);
    name.appendChild(el("small", null, item.note));
    row.appendChild(name);

    const check = el("button", `check${isDone ? " checked" : ""}`);
    check.type = "button";
    check.addEventListener("click", () => {
      store.dayUI.supp = store.dayUI.supp || {};
      store.dayUI.supp[item.id] = !store.dayUI.supp[item.id];
      row.classList.toggle("done", !!store.dayUI.supp[item.id]);
      check.classList.toggle("checked", !!store.dayUI.supp[item.id]);
      updateCount();
      persist();
    });
    row.appendChild(check);
    host.appendChild(row);
  });

  updateCount();
}

function ntResolve(scenario, mode) {
  if (scenario === "rest-next-pm" && mode === "med") return "med";
  return NT_SCENARIO_TIER[scenario] || "";
}

function ntSelect(scenario, keepMode) {
  store.ntState.scenario = scenario;
  if (!keepMode) store.ntState.mode = "low";

  $("nt-pill-toggle").hidden = scenario !== "rest-next-pm";
  $("nt-chips").querySelectorAll(".nt-chip").forEach(c => {
    c.classList.toggle("nt-selected", c.dataset.scenario === scenario);
  });
  $("nt-pill-toggle").querySelectorAll(".nt-pill").forEach(p => {
    p.classList.toggle("nt-active", p.dataset.mode === store.ntState.mode);
  });

  ntActiveTier = ntResolve(scenario, store.ntState.mode);
  if (!ntActiveTier) return;

  const tier = NT_TIERS[ntActiveTier];
  document.documentElement.style.setProperty("--tier-color", tier.color);
  $("nt-macro-card").hidden = false;
  $("nt-m-hc").textContent = tier.macros.hc;
  $("nt-m-prot").textContent = tier.macros.prot;
  $("nt-m-gord").textContent = tier.macros.gord;
  $("nt-m-kcal").textContent = tier.macros.kcal;
  $("nt-macro-tier-name").textContent = tier.label;

  if (store.ntDone.tier !== ntActiveTier) {
    store.ntDone = { date: isoToday(), tier: ntActiveTier, checked: {} };
  }
  persist();
  renderMeals(tier);
  $("nt-peek-panel").hidden = true;
  $("nt-peek-btn").textContent = "Consultar outros tiers";
}

function renderMeals(tier) {
  const host = $("nt-meals");
  host.innerHTML = "";
  const updateProg = () => {
    const done = Object.keys(store.ntDone.checked).filter(k => store.ntDone.checked[k]).length;
    $("nt-progress").textContent = `${done}/${tier.slots.length}`;
  };

  tier.slots.forEach((s, idx) => {
    const isChecked = !!store.ntDone.checked[idx];
    const card = el("article", `nt-meal-card${isChecked ? " nt-done" : ""}`);
    const top = el("div", "nt-meal-top");
    if (s.time) top.appendChild(el("span", "nt-meal-time", s.time));
    top.appendChild(el("span", "nt-meal-name", s.name));

    const check = el("button", `nt-check${isChecked ? " nt-checked" : ""}`);
    check.type = "button";
    check.addEventListener("click", () => {
      store.ntDone.checked[idx] = !store.ntDone.checked[idx];
      card.classList.toggle("nt-done", !!store.ntDone.checked[idx]);
      check.classList.toggle("nt-checked", !!store.ntDone.checked[idx]);
      updateProg();
      persist();
    });
    top.appendChild(check);
    card.appendChild(top);
    card.appendChild(el("p", "nt-meal-hack", s.rule));
    card.appendChild(el("p", "nt-meal-items", s.sugg));
    host.appendChild(card);
  });

  updateProg();
}

function openPeek() {
  const tabs = $("nt-peek-tabs");
  const meals = $("nt-peek-meals");
  tabs.innerHTML = "";
  const first = NT_TIER_ORDER.find(t => t !== ntActiveTier) || NT_TIER_ORDER[0];

  const renderPeekList = tierKey => {
    meals.innerHTML = "";
    NT_TIERS[tierKey].slots.forEach(s => {
      const row = el("div", "nt-peek-meal");
      row.appendChild(el("span", "nt-peek-meal-name", `${s.time ? s.time + " · " : ""}${s.name}`));
      row.appendChild(el("span", null, s.rule));
      meals.appendChild(row);
    });
  };

  NT_TIER_ORDER.forEach(tierKey => {
    const tab = el("button", `nt-peek-tab${tierKey === first ? " nt-active" : ""}`, NT_TIERS[tierKey].short);
    tab.type = "button";
    tab.dataset.tier = tierKey;
    tab.addEventListener("click", () => {
      tabs.querySelectorAll(".nt-peek-tab").forEach(t => t.classList.toggle("nt-active", t === tab));
      renderPeekList(tierKey);
    });
    tabs.appendChild(tab);
  });

  renderPeekList(first);
  $("nt-peek-panel").hidden = false;
  $("nt-peek-btn").textContent = "Fechar outros tiers";
}

function renderFoodBanks() {
  const groups = [
    { cat: "rapid", title: "Rápidos · só peri-treino", keys: "rapid" },
    { cat: "slow", title: "Lentos/médios · longe do treino", keys: "slow" },
    { cat: "lean", title: "Proteína magra", keys: "lean" },
    { cat: "fatty", title: "Proteína com gordura", keys: "fatty" },
    { cat: "fats", title: "Gordura", keys: "fats" }
  ];
  const host = $("fb-body");
  host.innerHTML = "";
  groups.forEach(g => {
    const wrap = el("div", "fb-group");
    wrap.dataset.cat = g.cat;
    wrap.appendChild(el("p", "fb-group-title", g.title));
    const chips = el("div", "fb-chips");
    FOOD_BANKS[g.keys].forEach(food => chips.appendChild(el("span", "fb-chip", food)));
    wrap.appendChild(chips);
    host.appendChild(wrap);
  });
}