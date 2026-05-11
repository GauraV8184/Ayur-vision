// Clinical mock: conditions and mapping (simplified)

export const conditionCatalog = [
  {
    id: "C-agni-mandya",
    name: "Agni Mandya (Weak digestion)",
    symptoms: ["Bloating", "Constipation", "Fatigue"],
    doshaBias: { vata: 0.3, pitta: 0.2, kapha: 0.5 },
  },
  {
    id: "C-ama",
    name: "Ama accumulation",
    symptoms: ["Bloating", "Heaviness", "Fatigue"],
    doshaBias: { vata: 0.1, pitta: 0.2, kapha: 0.7 },
  },
  {
    id: "C-vata",
    name: "Vata imbalance",
    symptoms: ["Anxiety", "Insomnia / Light sleep", "Joint pain / Stiffness"],
    doshaBias: { vata: 0.8, pitta: 0.1, kapha: 0.1 },
  },
  {
    id: "C-pitta",
    name: "Pitta aggravation",
    symptoms: ["Acidity / Heartburn", "Heat intolerance", "Irritability"],
    doshaBias: { vata: 0.1, pitta: 0.8, kapha: 0.1 },
  },
  {
    id: "C-kapha",
    name: "Kapha excess",
    symptoms: ["Weight gain / Heaviness", "Seasonal allergies", "Fatigue"],
    doshaBias: { vata: 0.1, pitta: 0.1, kapha: 0.8 },
  },
];

