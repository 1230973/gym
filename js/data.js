export const EXERCISE_RANGE = {
  "Neutral Press": { range: "6-8", min: 6, max: 8, cat: "Composto", guess: true },
  "Recline Curl": { range: "8-12", min: 8, max: 12, cat: "Isolamento", guess: true },
  "Lateral Raise Machine": { range: "8-12", min: 8, max: 12, cat: "Isolamento" },
  "Tricep Extension": { range: "8-12", min: 8, max: 12, cat: "Isolamento" },
  "Rear Delt Fly": { range: "8-12", min: 8, max: 12, cat: "Isolamento" },
  "Kelso Shrug": { range: "8-12", min: 8, max: 12, cat: "Isolamento" },
  "Close Grip Row": { range: "6-8", min: 6, max: 8, cat: "Composto" },
  "Frontal Pull": { range: "6-8", min: 6, max: 8, cat: "Composto" },
  "Seated Leg Curl": { range: "8-12", min: 8, max: 12, cat: "Isolamento" },
  "Alternating Leg Extension": { range: "8-12", min: 8, max: 12, cat: "Isolamento" },
  "Transverse Row": { range: "6-8", min: 6, max: 8, cat: "Composto", guess: true },
  "Sagittal Single Arm Pull": { range: "6-8", min: 6, max: 8, cat: "Composto", guess: true },
  "Bayesian Curl": { range: "8-12", min: 8, max: 12, cat: "Isolamento" },
  "Tricep Overhead Extension": { range: "8-12", min: 8, max: 12, cat: "Isolamento" },
  "Lower Pec Fly": { range: "8-12", min: 8, max: 12, cat: "Isolamento" },
  "Y Raise Cable": { range: "8-12", min: 8, max: 12, cat: "Isolamento" },
  "Single Arm Fly": { range: "8-12", min: 8, max: 12, cat: "Isolamento" },
  "Full ROM Shoulder Press": { range: "6-8", min: 6, max: 8, cat: "Composto" },
  "Single Leg 45°": { range: "6-8", min: 6, max: 8, cat: "Composto", guess: true },
  "Leg Extension Extended Hip": { range: "8-12", min: 8, max: 12, cat: "Isolamento", guess: true },
  "Pec Fly": { range: "8-12", min: 8, max: 12, cat: "Isolamento" },
  "45° Row": { range: "6-8", min: 6, max: 8, cat: "Composto" },
  "Front Raise": { range: "8-12", min: 8, max: 12, cat: "Isolamento" },
  "Pullover Uni": { range: "8-12", min: 8, max: 12, cat: "Isolamento" },
  "Preacher": { range: "8-12", min: 8, max: 12, cat: "Isolamento" },
  "JM Press": { range: "6-8", min: 6, max: 8, cat: "Composto" },
  "Reverse": { range: "8-12", min: 8, max: 12, cat: "Isolamento", guess: true },
  "Adductors": { range: "8-12", min: 8, max: 12, cat: "Isolamento" },
  "Single Leg SLDL": { range: "6-8", min: 6, max: 8, cat: "Composto" },
  "Calves": { range: "10-15", min: 10, max: 15, cat: "Gémeos" },
  "Abs": { range: "10-15", min: 10, max: 15, cat: "Abs" }
};

export const DEFAULT_PLAN = {
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
    "Kelso Shrug": { kg: 70, reps: null, note: "overshot" },
    "Rear Delt Fly": { kg: 18, reps: 8, note: "" },
    "Frontal Pull": { kg: 86, reps: null, note: "" },
    "Close Grip Row": { kg: 84, reps: 10, note: "" },
    "Lateral Raise Machine": { kg: 86, reps: null, note: "" },
    "Recline Curl": { kg: 17.5, reps: 6, note: "" },
    "Alternating Leg Extension": { kg: 43, reps: 9, note: "" },
    "Seated Leg Curl": { kg: null, reps: null, note: "n fiz" },
    "Calves": { kg: 20, reps: 12, note: "" },
    "Abs": { kg: 76, reps: null, note: "" },
    "Tricep Extension": { kg: 25, reps: 10, note: "" }
  },
  "3": {
    "Pec Fly": { kg: null, reps: null, note: "FullStack" }
  }
};

export const DEFAULT_CARDIO_SLOTS = [
  { id: "cardio-pa", name: "Após o pequeno-almoço", note: "15 min · obrigatória", defMin: 15 },
  { id: "cardio-al", name: "Após o almoço", note: "15 min · obrigatória", defMin: 15 },
  { id: "cardio-ja", name: "Após o jantar", note: "15 min · opcional, só se o horário der", defMin: 15 }
];

export const DEFAULT_SUPP_ITEMS = [
  { id: "citrulina", name: "Citrulina malato", note: "pré-treino · 30-45min antes", workoutOnly: true },
  { id: "glicerol", name: "Glicerol", note: "pré-treino · pump", workoutOnly: true },
  { id: "beterraba", name: "Beterraba em pó", note: "pré-treino · pump", workoutOnly: true },
  { id: "eletrolitos", name: "Eletrólitos/sódio", note: "intra-treino · na água do malto", workoutOnly: true },
  { id: "creatina", name: "Creatina 5g", note: "diário · pós-treino ou com refeição HC", workoutOnly: false },
  { id: "d3k2", name: "Vitamina D3+K2", note: "diário · com gordura", workoutOnly: false },
  { id: "omega3", name: "Ómega-3", note: "diário", workoutOnly: false },
  { id: "magnesio", name: "Magnésio glicinato", note: "diário · à noite", workoutOnly: false }
];

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

function slot(time, name, base, hcTarget = null) {
  return { time, name, zone: base.zone, rule: base.rule, sugg: base.sugg, hcTarget };
}

export const DEFAULT_NT_TIERS = {
  "high-am": {
    label: "High · Treino de Manhã (10h)", short: "High 10h", color: "var(--high)",
    macros: { hc: "470g", prot: "140g", gord: "55g", kcal: "~2.950" },
    slots: [
      slot("08:00", "Pré-treino", SLOT_PERI, "~110g HC"),
      slot("10:00", "Intra-treino", SLOT_INTRA, "~30g HC"),
      slot("12:00", "Pós-treino (+ fruta)", SLOT_PERI, "~190g HC"),
      slot("16:30", "Longe do treino", SLOT_AWAY, "~70g HC"),
      slot("20:30", "Jantar (sem fruta)", SLOT_AWAY, "~70g HC")
    ]
  },
  "high-pm": {
    label: "High · Treino à Noite (22h)", short: "High 22h", color: "var(--high)",
    macros: { hc: "470g", prot: "140g", gord: "55g", kcal: "~2.950" },
    slots: [
      slot("08:30", "Longe do treino", SLOT_AWAY, "~70g HC"),
      slot("13:00", "Longe do treino", SLOT_AWAY, "~70g HC"),
      slot("19:30", "Pré-treino", SLOT_PERI, "~110g HC"),
      slot("22:00", "Intra-treino", SLOT_INTRA, "~30g HC"),
      slot("23:30", "Pós-treino (+ fruta)", SLOT_PERI, "~190g HC")
    ]
  },
  "med": {
    label: "Med · Descanso ou Ponte 36h", short: "Med", color: "var(--med)",
    macros: { hc: "330g", prot: "140g", gord: "65g", kcal: "~2.500" },
    slots: [
      slot("", "Pequeno-almoço", SLOT_AWAY, "~80g HC"),
      slot("", "Almoço", SLOT_AWAY, "~100g HC"),
      slot("", "Lanche", SLOT_AWAY, "~50g HC"),
      slot("", "Jantar (sem fruta)", SLOT_AWAY, "~100g HC")
    ]
  },
  "low": {
    label: "Low · Descanso Prolongado", short: "Low", color: "var(--low)",
    macros: { hc: "115g", prot: "140g", gord: "92g", kcal: "1.850-1.950" },
    slots: [
      slot("", "Pequeno-almoço", SLOT_AWAY, "~25g HC"),
      slot("", "Almoço", SLOT_AWAY, "~35g HC"),
      slot("", "Lanche", SLOT_AWAY, "~20g HC"),
      slot("", "Jantar (sem fruta)", SLOT_AWAY, "~35g HC")
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
  { id: "h-whoop", name: "Rever recuperação e sono WHOOP", cat: "Biometria", days: [1,2,3,4,5,6,0] },
  { id: "h-uni", name: "Bloco de estudo / Engenharia Informática", cat: "Faculdade", days: [1,2,3,4,5] },
  { id: "h-tryit", name: "Bloco de trabalho / TryIt", cat: "Trabalho", days: [1,2,3,4,5] }
];