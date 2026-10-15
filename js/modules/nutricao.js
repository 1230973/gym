import { SUPP_ITEMS, WATER_MIN, WATER_MAX, FOOD_BANKS, NT_TIERS, NT_TIER_ORDER, NT_SCENARIO_TIER } from "../data.js";
import { store, persist, persistDebounced, isoToday, computeSuggestedScenario } from "../store.js";
import { $, el, toast } from "../ui.js";

let ntActiveTier = "";

export function initNutricaoModule() {
  const host = $("page-nutri");
  host.innerHTML = `
    <section class="section">
      <div class="section-head"><h2 class="section-title">Água & Peso Corporal</h2><span class="section-meta" id="water-progress"></span></div>
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

        <div class="sess-row" style="border-top:1px solid var(--border); padding-top:12px; margin-top:14px; flex-wrap:wrap;">
          <label for="bw-input">Peso hoje (jejum)</label>
          <input class="load-input" type="number" step="0.1" inputMode="decimal" id="bw-input" placeholder="kg" style="width:86px;">
          <div class="bw-chart-wrap" id="bw-chart-wrap" style="margin-left:auto; margin-top:0;"></div>
        </div>
      </div>
    </section>

    <section class="section">
      <div class="section-head">
        <h2 class="section-title">Suplementos</h2>
        <button class="btn btn-sm btn-ghost" id="supp-filter-btn" type="button" style="margin-left:auto; margin-right:6px;"></button>
        <span class="section-meta" id="supp-progress" style="margin-left:0;"></span>
      </div>
      <div class="card" id="supp-card"></div>
    </section>

    <section class="section">
      <div class="section-head">
        <h2 class="section-title">Nutrição</h2>
        <button class="btn btn-sm btn-ghost" id="nt-auto-suggest" type="button" style="margin-left:auto; margin-right:6px;">Sugerir Auto</button>
        <span class="section-meta" id="nt-progress" style="margin-left:0;"></span>
      </div>
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
      persist(true);
    });
  });

  $("water-reset").addEventListener("click", () => {
    if (!store.dayUI.water || !window.confirm("Zerar o contador de água de hoje?")) return;
    store.dayUI.water = 0;
    renderWater();
    persist(true);
  });

  $("bw-input").addEventListener("input", e => {
    const val = e.target.value !== "" ? parseFloat(e.target.value) : null;
    store.dayUI.weight = val;
    if (val != null && !isNaN(val)) {
      store.bodyWeight[isoToday()] = val;
    } else {
      delete store.bodyWeight[isoToday()];
    }
    renderBodyWeightChart();
    persistDebounced(300);
  });

  $("supp-filter-btn").addEventListener("click", () => {
    store.ntState.suppFilter = store.ntState.suppFilter === "all" ? "auto" : "all";
    persist(true);
    renderSupp();
  });

  $("nt-auto-suggest").addEventListener("click", () => {
    const sc = computeSuggestedScenario();
    ntSelect(sc, false, true);
    toast("Cenário atualizado com base na janela de 36h");
  });

  $("nt-chips").querySelectorAll(".nt-chip").forEach(chip => {
    chip.addEventListener("click", () => ntSelect(chip.dataset.scenario, false, true));
  });

  $("nt-pill-toggle").querySelectorAll(".nt-pill").forEach(pill => {
    pill.addEventListener("click", () => {
      store.ntState.mode = pill.dataset.mode;
      persist(true);
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

function isWorkoutDay() {
  const sc = store.ntState.scenario;
  if (sc === "high-am" || sc === "high-pm") return true;
  if (sc && sc.startsWith("rest-")) return false;
  return true;
}

export function renderNutricaoModule() {
  renderWater();
  renderBodyWeightChart();
  if (!store.ntState.scenario || !NT_SCENARIO_TIER[store.ntState.scenario]) {
    store.ntState.scenario = computeSuggestedScenario();
  }
  // isUserAction = false no render automático para NUNCA atualizar store.ts no arranque!
  ntSelect(store.ntState.scenario, true, false);
}

function renderWater() {
  const ml = store.dayUI.water || 0;
  $("water-amount").textContent = `${(ml / 1000).toFixed(2)}L`;
  $("water-bar-fill").style.width = `${Math.min(100, (ml / WATER_MAX) * 100)}%`;
  $("water-progress").textContent = ml >= WATER_MIN ? "✓ meta" : `${(ml / 1000).toFixed(2)}L / 3.5L`;
}

/* GRÁFICO DUPLO DE PESO CORPORAL: DIÁRIO (TRACEJADO) + MÉDIA MÓVEL 7 DIAS (LINHA CONTÍNUA) */
function renderBodyWeightChart() {
  const bwIn = $("bw-input");
  const wrap = $("bw-chart-wrap");
  if (!bwIn || !wrap) return;

  const todayVal = store.dayUI.weight ?? store.bodyWeight[isoToday()] ?? null;
  if (document.activeElement !== bwIn) {
    bwIn.value = todayVal != null ? todayVal : "";
  }

  const allDates = Object.keys(store.bodyWeight).sort();
  const validEntries = allDates
    .map(d => ({ date: d, val: store.bodyWeight[d] }))
    .filter(x => typeof x.val === "number" && !isNaN(x.val));

  if (!validEntries.length) {
    wrap.textContent = "Sem histórico de peso";
    return;
  }

  // Calcular média móvel de até 7 registos para cada ponto e exibir os últimos 10 pontos
  const recent = validEntries.slice(-10);
  const dailyPts = recent.map(r => r.val);
  const maPts = recent.map((_, idx) => {
    const globalIdx = validEntries.length - recent.length + idx;
    const win = validEntries.slice(Math.max(0, globalIdx - 6), globalIdx + 1).map(x => x.val);
    return win.reduce((a, b) => a + b, 0) / win.length;
  });

  const latestMA = maPts[maPts.length - 1].toFixed(1);
  if (recent.length < 2) {
    wrap.innerHTML = `<span>MM7d: <b>${latestMA}kg</b></span>`;
    return;
  }

  const allVals = [...dailyPts, ...maPts];
  const min = Math.min(...allVals);
  const max = Math.max(...allVals);
  const span = max - min || 1;
  const w = 88, h = 24;

  const toCoords = arr => arr.map((val, idx) => {
    const x = (idx / (arr.length - 1)) * w;
    const y = h - ((val - min) / span) * (h - 6) - 3;
    return `${x.toFixed(1)},${y.toFixed(1)}`;
  }).join(" ");

  const dailyPoly = toCoords(dailyPts);
  const maPoly = toCoords(maPts);

  wrap.innerHTML = `
    <span title="Tracejado: diário · Linha: média móvel 7d">MM7d: <b style="color:var(--med)">${latestMA}kg</b></span>
    <svg class="bw-svg" viewBox="0 0 ${w} ${h}" aria-label="Evolução do peso diário e média móvel de 7 dias">
      <polyline fill="none" stroke="var(--muted)" stroke-width="1.2" stroke-dasharray="2,2" opacity="0.7" points="${dailyPoly}"/>
      <polyline fill="none" stroke="var(--med)" stroke-width="2.1" stroke-linecap="round" stroke-linejoin="round" points="${maPoly}"/>
    </svg>
  `;
}

function renderSupp() {
  const host = $("supp-card");
  host.innerHTML = "";
  const showAll = store.ntState.suppFilter === "all" || isWorkoutDay();
  const visibleItems = showAll ? SUPP_ITEMS : SUPP_ITEMS.filter(i => !i.workoutOnly);

  $("supp-filter-btn").textContent = showAll
    ? (isWorkoutDay() ? "Dia Treino" : "A mostrar todos")
    : "Dia Descanso (só diários)";

  const updateCount = () => {
    const done = visibleItems.filter(i => store.dayUI.supp?.[i.id]).length;
    $("supp-progress").textContent = `${done}/${visibleItems.length}`;
  };

  visibleItems.forEach(item => {
    const isDone = !!(store.dayUI.supp && store.dayUI.supp[item.id]);
    const row = el("div", `list-row${isDone ? " done" : ""}`);
    const name = el("div", "list-name", item.name);
    name.appendChild(el("small", null, item.note));
    row.appendChild(name);

    const check = el("button", `check${isDone ? " checked" : ""}`);
    check.type = "button";
    check.setAttribute("aria-label", `Marcar suplemento ${item.name}`);
    check.addEventListener("click", () => {
      store.dayUI.supp = store.dayUI.supp || {};
      store.dayUI.supp[item.id] = !store.dayUI.supp[item.id];
      row.classList.toggle("done", !!store.dayUI.supp[item.id]);
      check.classList.toggle("checked", !!store.dayUI.supp[item.id]);
      updateCount();
      persist(true);
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

function ntSelect(scenario, keepMode, isUserAction = false) {
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
  renderSupp();
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
    if (!isUserAction) {
      persist(false); // Guarda cache local sem tocar em store.ts!
    }
  }
  if (isUserAction) {
    persist(true);
  }
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
    check.setAttribute("aria-label", `Marcar refeição ${s.name}`);
    check.addEventListener("click", () => {
      store.ntDone.checked[idx] = !store.ntDone.checked[idx];
      card.classList.toggle("nt-done", !!store.ntDone.checked[idx]);
      check.classList.toggle("nt-checked", !!store.ntDone.checked[idx]);
      updateProg();
      persist(true);
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