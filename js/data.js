export const EXERCISE_RANGE = {
  "Neutral Press": { range: "6-8", cat: "Composto", guess: true },
  "Recline Curl": { range: "8-12", cat: "Isolamento", guess: true },
  "Lateral Raise Machine": { range: "8-12", cat: "Isolamento" },
  "Tricep Extension": { range: "8-12", cat: "Isolamento" },
  "Rear Delt Fly": { range: "8-12", cat: "Isolamento" },
  "Kelso Shrug": { range: "8-12", cat: "Isolamento" },
  "Close Grip Row": { range: "6-8", cat: "Composto" },
  "Frontal Pull": { range: "6-8", cat: "Composto" },
  "Seated Leg Curl": { range: "8-12", cat: "Isolamento" },
  "Alternating Leg Extension": { range: "8-12", cat: "Isolamento" },
  "Transverse Row": { range: "6-8", cat: "Composto", guess: true },
  "Sagittal Single Arm Pull": { range: "6-8", cat: "Composto", guess: true },
  "Bayesian Curl": { range: "8-12", cat: "Isolamento" },
  "Tricep Overhead Extension": { range: "8-12", cat: "Isolamento" },
  "Lower Pec Fly": { range: "8-12", cat: "Isolamento" },
  "Y Raise Cable": { range: "8-12", cat: "Isolamento" },
  "Single Arm Fly": { range: "8-12", cat: "Isolamento" },
  "Full ROM Shoulder Press": { range: "6-8", cat: "Composto" },
  "Single Leg 45°": { range: "6-8", cat: "Composto", guess: true },
  "Leg Extension Extended Hip": { range: "8-12", cat: "Isolamento", guess: true },
  "Pec Fly": { range: "8-12", cat: "Isolamento" },
  "45° Row": { range: "6-8", cat: "Composto" },
  "Front Raise": { range: "8-12", cat: "Isolamento" },
  "Pullover Uni": { range: "8-12", cat: "Isolamento" },
  "Preacher": { range: "8-12", cat: "Isolamento" },
  "JM Press": { range: "6-8", cat: "Composto" },
  "Reverse": { range: "8-12", cat: "Isolamento", guess: true },
  "Adductors": { range: "8-12", cat: "Isolamento" },
  "Single Leg SLDL": { range: "6-8", cat: "Composto" },
  "Calves": { range: "10-15", cat: "Gémeos" },
  "Abs": { range: "10-15", cat: "Abs" }
};

export const PLAN = {
  "1": {
    focus: "Back + Traps + Rear Delt",
    color: "var(--d1)",
    exercises: [
      "Neutral Press", "Recline Curl", "Lateral Raise Machine", "Tricep Extension",
      "Rear Delt Fly", "Abs", "Kelso Shrug", "Close Grip Row",
      "Frontal Pull", "Calves", "Seated Leg Curl", "Alternating Leg Extension"
    ]
  },
  "2": {
    focus: "Chest + Anterior Delt",
    color: "var(--d2)",
    exercises: [
      "Transverse Row", "Sagittal Single Arm Pull", "Bayesian Curl", "Tricep Overhead Extension",
      "Abs", "Lower Pec Fly", "Y Raise Cable", "Single Arm Fly",
      "Full ROM Shoulder Press", "Calves", "Single Leg 45°", "Leg Extension Extended Hip"
    ]
  },
  "3": {
    focus: "Bíceps + Tríceps",
    color: "var(--d3)",
    exercises: [
      "Lateral Raise Machine", "Pec Fly", "45° Row", "Front Raise",
      "Pullover Uni", "Preacher", "JM Press", "Reverse",
      "Abs", "Calves", "Adductors", "Single Leg SLDL"
    ]
  }
};

export const SEED = {
  "1": {
    "Kelso Shrug": { kg: "70kg", reps: "overshot" },
    "Rear Delt Fly": { kg: "18kg", reps: "8" },
    "Frontal Pull": { kg: "86kg", reps: "" },
    "Close Grip Row": { kg: "84kg", reps: "10" },
    "Lateral Raise Machine": { kg: "86kg", reps: "" },
    "Recline Curl": { kg: "17.5kg", reps: "6" },
    "Alternating Leg Extension": { kg: "43kg", reps: "9" },
    "Seated Leg Curl": { kg: "n fiz", reps: "" },
    "Calves": { kg: "20kg", reps: "12" },
    "Abs": { kg: "76kg", reps: "" },
    "Tricep Extension": { kg: "25kg", reps: "10" }
  },
  "3": {
    "Pec Fly": { kg: "FullStack", reps: "" }
  }
};

export const CARDIO_SLOTS = [
  { id: "cardio-pa", name: "Após o pequeno-almoço", note: "15 min · obrigatória" },
  { id: "cardio-al", name: "Após o almoço", note: "15 min · obrigatória" },
  { id: "cardio-ja", name: "Após o jantar", note: "15 min · opcional, só se o horário der" }
];

export const SUPP_ITEMS = [
  { id: "citrulina", name: "Citrulina malato", note: "pré-treino · 30-45min antes" },
  { id: "glicerol", name: "Glicerol", note: "pré-treino · pump" },
  { id: "beterraba", name: "Beterraba em pó", note: "pré-treino · pump" },
  { id: "eletrolitos", name: "Eletrólitos/sódio", note: "intra-treino · na água do malto" },
  { id: "creatina", name: "Creatina 5g", note: "diário · pós-treino ou com refeição HC" },
  { id: "d3k2", name: "Vitamina D3+K2", note: "diário · com gordura" },
  { id: "omega3", name: "Ómega-3", note: "diário" },
  { id: "magnesio", name: "Magnésio glicinato", note: "diário · à noite" }
];

export const WATER_MIN = 3500;
export const WATER_MAX = 4500;

export const FOOD_BANKS = {
  rapid: ["Arroz branco", "Batata cozida/assada", "Pão branco", "Maltodextrina/dextrose", "Cornflakes sem açúcar", "Banana madura", "Melancia"],
  slow: ["Aveia", "Arroz basmati/integral", "Batata-doce", "Pão integral/centeio", "Leguminosas", "Maçã", "Frutos vermelhos", "Pera", "Kiwi"],
  lean: ["Frango/peru", "Claras de ovo", "Peixe branco magro", "Whey", "Quark 0%/skyr", "Atum ao natural"],
  fatty: ["Ovos inteiros", "Salmão/atum fresco", "Carne picada magra", "Queijos curados"],
  fats: ["Azeite virgem extra", "Frutos secos / manteiga de amendoim", "Queijos curados", "Gemas de ovo", "Abacate", "Peixes gordos"]
};

function ntBank(keys, n) {
  return keys.map(k => FOOD_BANKS[k].slice(0, n).join(", ")).join(" · ");
}

const SLOT_PERI = {
  zone: "peri",
  rule: "Hidratos rápidos · gordura zero",
  sugg: `Hidratos: ${ntBank(["rapid"], 4)}. Proteína magra: ${ntBank(["lean"], 3)}.`
};
const SLOT_AWAY = {
  zone: "away",
  rule: "Hidratos lentos/médios · gordura à vontade",
  sugg: `Hidratos: ${ntBank(["slow"], 4)}. Gordura: ${ntBank(["fats"], 3)}.`
};
const SLOT_INTRA = {
  zone: "peri",
  rule: "Hidratos rápidos · gordura zero",
  sugg: "30g maltodextrina + eletrólitos em 600-700ml de água, aos goles."
};

function slot(time, name, base) {
  return { time, name, zone: base.zone, rule: base.rule, sugg: base.sugg };
}

export const NT_TIERS = {
  "high-am": {
    label: "High · Treino de Manhã (10h)", short: "High 10h", color: "var(--high)",
    macros: { hc: "470g", prot: "140g", gord: "55g", kcal: "~2.950" },
    slots: [
      slot("08:00", "Pré-treino", SLOT_PERI),
      slot("10:00", "Intra-treino", SLOT_INTRA),
      slot("12:00", "Pós-treino (+ fruta)", SLOT_PERI),
      slot("16:30", "Longe do treino", SLOT_AWAY),
      slot("20:30", "Jantar (sem fruta)", SLOT_AWAY)
    ]
  },
  "high-pm": {
    label: "High · Treino à Noite (22h)", short: "High 22h", color: "var(--high)",
    macros: { hc: "470g", prot: "140g", gord: "55g", kcal: "~2.950" },
    slots: [
      slot("08:30", "Longe do treino", SLOT_AWAY),
      slot("13:00", "Longe do treino", SLOT_AWAY),
      slot("19:30", "Pré-treino", SLOT_PERI),
      slot("22:00", "Intra-treino", SLOT_INTRA),
      slot("23:30", "Pós-treino (+ fruta)", SLOT_PERI)
    ]
  },
  "med": {
    label: "Med · Descanso ou Ponte 36h", short: "Med", color: "var(--med)",
    macros: { hc: "330g", prot: "140g", gord: "65g", kcal: "~2.500" },
    slots: [
      slot("", "Pequeno-almoço", SLOT_AWAY),
      slot("", "Almoço", SLOT_AWAY),
      slot("", "Lanche", SLOT_AWAY),
      slot("", "Jantar (sem fruta)", SLOT_AWAY)
    ]
  },
  "low": {
    label: "Low · Descanso Prolongado", short: "Low", color: "var(--low)",
    macros: { hc: "115g", prot: "140g", gord: "92g", kcal: "1.850-1.950" },
    slots: [
      slot("", "Pequeno-almoço", SLOT_AWAY),
      slot("", "Almoço", SLOT_AWAY),
      slot("", "Lanche", SLOT_AWAY),
      slot("", "Jantar (sem fruta)", SLOT_AWAY)
    ]
  }
};

export const NT_TIER_ORDER = ["high-am", "high-pm", "med", "low"];
export const NT_SCENARIO_TIER = {
  "high-am": "high-am",
  "high-pm": "high-pm",
  "rest-after-double": "med",
  "rest-next-am": "med",
  "rest-next-pm": "low"
};

export const DEFAULT_HABITS = [
  { id: "h-whoop", name: "Rever recuperação e sono WHOOP", cat: "Biometria" },
  { id: "h-uni", name: "Bloco de estudo / Engenharia Informática", cat: "Faculdade" },
  { id: "h-tryit", name: "Bloco de trabalho / TryIt", cat: "Trabalho" }
];