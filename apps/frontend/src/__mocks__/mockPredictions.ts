// Default mock prediction results (fallback when no diagnosis run exists)

export const prakritiResult = {
  vata: 25,
  pitta: 45,
  kapha: 30,
};

export const diseasePredictionsResult = [
  {
    condition: "Agni Mandya (Weak digestion)",
    probability: 0.87,
    explanation:
      "Digestive symptoms and meal irregularity indicate reduced digestive fire.",
  },
  {
    condition: "Vata imbalance",
    probability: 0.72,
    explanation:
      "Stress, light sleep, and variable routine suggest Vata aggravation.",
  },
  {
    condition: "Ama accumulation",
    probability: 0.65,
    explanation:
      "Heaviness and bloating patterns may indicate incomplete digestion.",
  },
];

export const doshaImbalance = {
  vata: { level: 72, status: "elevated", label: "Vata" },
  pitta: { level: 45, status: "normal", label: "Pitta" },
  kapha: { level: 38, status: "low", label: "Kapha" },
};

export const herbalRecommendations = [
  {
    id: "H-ashwagandha",
    plantName: "Ashwagandha",
    botanicalName: "Withania somnifera",
    doshaEffect: "Reduces Vata",
    therapeuticUses: "Stress, energy, sleep",
    preparation: "1–2 g powder with milk at bedtime (doctor guidance).",
    imagePlaceholder: "🌿",
  },
  {
    id: "H-triphala",
    plantName: "Triphala",
    botanicalName: "Emblica + Terminalia spp.",
    doshaEffect: "Tridoshic (context-specific)",
    therapeuticUses: "Digestion, bowel regularity",
    preparation: "1 tsp in warm water before bed (doctor guidance).",
    imagePlaceholder: "🌿",
  },
];

export const dietLifestyle = {
  recommended: [
    "Warm cooked meals",
    "Regular meal times",
    "Cumin/fennel for digestion",
    "Adequate hydration (warm water)",
  ],
  avoid: ["Cold drinks", "Late-night heavy meals", "Excess spicy/acidic foods"],
  lifestyle: ["Early sleep routine", "Daily walk", "Pranayama (gentle)"],
  dailyRoutine: ["Wake by 6–7 AM", "Main meal at noon", "Light dinner by 7–8 PM"],
};

