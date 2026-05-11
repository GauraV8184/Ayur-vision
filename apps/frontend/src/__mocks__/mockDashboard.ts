// Dashboard mock data (static charts) + default activity feed entries
// For dynamic activity (after Run AI Diagnosis), see `utils/storage.js`.

export const systemMetrics = [
  { label: "Patients analyzed today", value: 24, icon: "users", change: "+12%" },
  { label: "Predictions generated", value: 48, icon: "activity", change: "+8%" },
  { label: "Active AI models", value: 4, icon: "cpu", change: "100%" },
  { label: "Herbal recommendations", value: 36, icon: "leaf", change: "+15%" },
];

export const doshaDistribution = [
  { name: "Vata", value: 34, fill: "#8B7355" },
  { name: "Pitta", value: 41, fill: "#C45C3E" },
  { name: "Kapha", value: 25, fill: "#5C7A6B" },
];

export const symptomFrequency = [
  { name: "Fatigue", count: 42 },
  { name: "Bloating", count: 36 },
  { name: "Stress", count: 35 },
  { name: "Insomnia", count: 28 },
  { name: "Acidity", count: 22 },
];

export const diseasePredictions = [
  { name: "Agni Mandya", count: 18 },
  { name: "Ama", count: 15 },
  { name: "Vata imbalance", count: 12 },
  { name: "Pitta aggravation", count: 10 },
  { name: "Kapha excess", count: 8 },
];

export const treatmentFrequency = [
  { name: "Diet change", count: 45 },
  { name: "Herbal remedy", count: 38 },
  { name: "Lifestyle", count: 32 },
  { name: "Panchakarma", count: 12 },
];

export const recentActivity = [
  {
    id: 1,
    patient: "Rajesh Kulkarni",
    action: "Prakriti analysis",
    time: "2 min ago",
    type: "analysis",
  },
  {
    id: 2,
    patient: "Priya Mehta",
    action: "Herbal recommendations",
    time: "8 min ago",
    type: "recommendation",
  },
  {
    id: 3,
    patient: "Amit Sharma",
    action: "Disease prediction",
    time: "15 min ago",
    type: "prediction",
  },
  {
    id: 4,
    patient: "Sneha Patil",
    action: "Dosha assessment",
    time: "22 min ago",
    type: "analysis",
  },
  {
    id: 5,
    patient: "Vikram Rao",
    action: "Full diagnosis",
    time: "35 min ago",
    type: "diagnosis",
  },
];

