export type QuizCategory = "digestive" | "appetite" | "gut";

export interface AnswerOption {
  text: string;
  points: number; // hidden from user
}

export interface Question {
  id: number;
  category: QuizCategory;
  text: string;
  options: [AnswerOption, AnswerOption, AnswerOption];
}

export const QUESTIONS: Question[] = [
  // ── Category 1: Digestive Comfort (Q1–Q4, max 12 pts) ──
  {
    id: 1,
    category: "digestive",
    text: "How would you describe your digestion?",
    options: [
      { text: "I often experience bloating or discomfort after eating", points: 3 },
      { text: "I have mild digestive issues sometimes", points: 2 },
      { text: "My digestion feels normal and comfortable", points: 0 },
    ],
  },
  {
    id: 2,
    category: "digestive",
    text: "Do you have heartburn after meals?",
    options: [
      { text: "Frequently", points: 3 },
      { text: "Occasionally", points: 2 },
      { text: "Never", points: 0 },
    ],
  },
  {
    id: 3,
    category: "digestive",
    text: "How do you experience unexplained weight changes?",
    options: [
      { text: "My weight shifts dramatically without clear reasons", points: 3 },
      { text: "I notice small, unexplained weight changes", points: 2 },
      { text: "My weight stays mostly the same", points: 0 },
    ],
  },
  {
    id: 4,
    category: "digestive",
    text: "How do you feel after meals?",
    options: [
      { text: "I'm hungry again very quickly", points: 3 },
      { text: "I sometimes feel hungry between meals", points: 2 },
      { text: "I feel satisfied after eating without any food cravings", points: 0 },
    ],
  },

  // ── Category 2: Appetite & Metabolism (Q5–Q8, max 12 pts) ──
  {
    id: 5,
    category: "appetite",
    text: "How would you rate your energy levels throughout the day?",
    options: [
      { text: "I struggle with constant fatigue and energy crashes", points: 3 },
      { text: "Moderate energy with some afternoon slumps", points: 2 },
      { text: "Consistent, stable energy from morning to evening", points: 0 },
    ],
  },
  {
    id: 6,
    category: "appetite",
    text: "How well do you control your eating?",
    options: [
      { text: "I often struggle to control cravings and overeating", points: 3 },
      { text: "I sometimes overeat", points: 2 },
      { text: "I eat when hungry and stop when full", points: 0 },
    ],
  },
  {
    id: 7,
    category: "appetite",
    text: "How difficult is it for you to lose weight?",
    options: [
      { text: "I can't seem to lose weight even when dieting and exercising", points: 3 },
      { text: "I can lose weight but it's hard to keep it off", points: 2 },
      { text: "I'm at my ideal weight", points: 0 },
    ],
  },
  {
    id: 8,
    category: "appetite",
    text: "What do you typically eat for breakfast?",
    options: [
      { text: "I usually skip breakfast or just have coffee", points: 3 },
      { text: "Something quick — cereal, toast, a muffin, or a granola bar", points: 2 },
      { text: "A protein-rich breakfast (eggs, Greek yogurt, protein smoothie)", points: 0 },
    ],
  },

  // ── Category 3: Gut Health (Q9–Q17, max 27 pts) ──
  {
    id: 9,
    category: "gut",
    text: "Do you have problems sleeping?",
    options: [
      { text: "Yes", points: 3 },
      { text: "Sometimes", points: 2 },
      { text: "No", points: 0 },
    ],
  },
  {
    id: 10,
    category: "gut",
    text: "Do you often experience brain fog?",
    options: [
      { text: "Yes", points: 3 },
      { text: "Sometimes", points: 2 },
      { text: "No", points: 0 },
    ],
  },
  {
    id: 11,
    category: "gut",
    text: "Do you experience mood swings?",
    options: [
      { text: "Yes, frequently", points: 3 },
      { text: "Sometimes", points: 2 },
      { text: "No", points: 0 },
    ],
  },
  {
    id: 12,
    category: "gut",
    text: "How would you describe your typical diet?",
    options: [
      { text: "Mostly frozen meals and fast food with few vegetables", points: 3 },
      { text: "A mixture of frozen meals and whole foods", points: 2 },
      { text: "Plenty of fresh whole foods and vegetables", points: 0 },
    ],
  },
  {
    id: 13,
    category: "gut",
    text: "How often do you eat fermented foods? (Greek yogurt, kimchi, sauerkraut)",
    options: [
      { text: "Rarely or never", points: 3 },
      { text: "Once in a while", points: 2 },
      { text: "Several times a week", points: 0 },
    ],
  },
  {
    id: 14,
    category: "gut",
    text: "How often do you eat prebiotic foods? (asparagus, onion, garlic, or bananas)",
    options: [
      { text: "Rarely", points: 3 },
      { text: "Occasionally", points: 2 },
      { text: "Regularly", points: 0 },
    ],
  },
  {
    id: 15,
    category: "gut",
    text: "Do you take antacids or acid blockers like Prilosec or omeprazole?",
    options: [
      { text: "Daily or almost every day", points: 3 },
      { text: "Occasionally", points: 2 },
      { text: "Never", points: 0 },
    ],
  },
  {
    id: 16,
    category: "gut",
    text: "Do you take pain pills like aspirin, Advil, Tylenol, or ibuprofen?",
    options: [
      { text: "Daily or almost every day", points: 3 },
      { text: "Occasionally", points: 2 },
      { text: "Never", points: 0 },
    ],
  },
  {
    id: 17,
    category: "gut",
    text: "Recent antibiotic use?",
    options: [
      { text: "Yes, within the last 6 months", points: 3 },
      { text: "Yes, but over 1 year ago", points: 2 },
      { text: "No, not in the last 2 years or more", points: 0 },
    ],
  },
];

export const CATEGORY_META = {
  digestive: { label: "Digestive Comfort", maxScore: 12, questionIds: [1, 2, 3, 4] },
  appetite: { label: "Appetite & Metabolism", maxScore: 12, questionIds: [5, 6, 7, 8] },
  gut: { label: "Gut Health", maxScore: 27, questionIds: [9, 10, 11, 12, 13, 14, 15, 16, 17] },
} as const;

export const TOTAL_MAX_SCORE = 51;

export type AlertLevel = "green" | "yellow" | "red";

export function getAlertLevel(totalScore: number): AlertLevel {
  if (totalScore <= 8) return "green";
  if (totalScore <= 22) return "yellow";
  return "red";
}

export function getCrmTag(totalScore: number): string {
  if (totalScore >= 23) return "red alert";
  if (totalScore >= 9) return "yellow alert";
  return "green alert";
}

export function computeScores(answers: { questionId: number; points: number }[]) {
  const map = new Map(answers.map((a) => [a.questionId, a.points]));
  const digestiveScore = CATEGORY_META.digestive.questionIds.reduce((s, id) => s + (map.get(id) ?? 0), 0);
  const appetiteScore = CATEGORY_META.appetite.questionIds.reduce((s, id) => s + (map.get(id) ?? 0), 0);
  const gutScore = CATEGORY_META.gut.questionIds.reduce((s, id) => s + (map.get(id) ?? 0), 0);
  const totalScore = digestiveScore + appetiteScore + gutScore;
  return { digestiveScore, appetiteScore, gutScore, totalScore };
}
