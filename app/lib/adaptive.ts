import type { Category, Weakness } from "../data/scenarios";

const CATEGORIES: Category[] = ["phishing", "social-engineering", "scam"];
const WEAKNESSES: Weakness[] = [
  "urgency",
  "authority",
  "suspicious-links",
  "fake-offers",
];

type Difficulty = 1 | 2 | 3;

// Everything we remember about the user
export type UserState = {
  categoryScores: Record<Category, number>; // 0-100, higher = better
  weaknessLevels: Record<Weakness, number>; // 0-100, higher = weaker
  weaknessTested: Record<Weakness, number>; // how often each was tested
  currentDifficulty: Difficulty;
  scenariosCompleted: number;
  recentMistakes: string[]; // attack types the user fell for (last 5)
  recentRisk: number[]; // last two risk scores, used for difficulty
  lastCategory: Category | null;
};

// One answer the user gave
export type AnswerRecord = {
  category: Category;
  topic: Weakness; // the weakness this scenario was testing
  detected: Weakness | "none"; // the weakness the AI detected
  riskScore: number; // 0 = safest, 100 = most dangerous
  attackType: string;
};

// What the next scenario should be about
export type Focus = {
  category: Category;
  weakness: Weakness;
  difficulty: Difficulty;
  reason: string;
};

// Which categories suit each weakness (best fit first)
const CATEGORIES_FOR: Record<Weakness, Category[]> = {
  urgency: ["phishing", "social-engineering", "scam"],
  authority: ["social-engineering", "phishing"],
  "suspicious-links": ["phishing", "scam"],
  "fake-offers": ["scam", "phishing"],
};

// A weakness at or above this level gets trained again
const WEAK_THRESHOLD = 20;

function label(weakness: string): string {
  return weakness.replace("-", " ");
}

// The starting state for a brand new user
export function createInitialState(): UserState {
  return {
    categoryScores: { phishing: 50, "social-engineering": 50, scam: 50 },
    weaknessLevels: {
      urgency: 0,
      authority: 0,
      "suspicious-links": 0,
      "fake-offers": 0,
    },
    weaknessTested: {
      urgency: 0,
      authority: 0,
      "suspicious-links": 0,
      "fake-offers": 0,
    },
    currentDifficulty: 1,
    scenariosCompleted: 0,
    recentMistakes: [],
    recentRisk: [],
    lastCategory: null,
  };
}

// Update what we know about the user after one answer
export function updateState(state: UserState, a: AnswerRecord): UserState {
  const safety = 100 - a.riskScore;

  // 1. Category score moves halfway toward this answer's safety
  const categoryScores = { ...state.categoryScores };
  categoryScores[a.category] = Math.round(
    categoryScores[a.category] * 0.5 + safety * 0.5
  );

  // 2. Weakness levels: unsafe answers raise it, safe answers lower it
  const weaknessLevels = { ...state.weaknessLevels };
  const weaknessTested = { ...state.weaknessTested };
  weaknessTested[a.topic] += 1;

  const unsafe = a.riskScore >= 30;
  if (unsafe) {
    const target = a.detected !== "none" ? a.detected : a.topic;
    weaknessLevels[target] = Math.min(
      100,
      weaknessLevels[target] + Math.round(a.riskScore / 3)
    );
  } else {
    weaknessLevels[a.topic] = Math.max(0, weaknessLevels[a.topic] - 20);
  }

  // 3. Remember recent mistakes (keep the last 5)
  const recentMistakes = unsafe
    ? [...state.recentMistakes, a.attackType].slice(-5)
    : state.recentMistakes;

  // 4. Difficulty: two safe answers in a row go up, two bad ones go down
  let currentDifficulty = state.currentDifficulty;
  let recentRisk = [...state.recentRisk, a.riskScore].slice(-2);
  if (recentRisk.length === 2) {
    if (recentRisk.every((r) => r <= 30) && currentDifficulty < 3) {
      currentDifficulty = (currentDifficulty + 1) as Difficulty;
      recentRisk = [];
    } else if (recentRisk.every((r) => r >= 60) && currentDifficulty > 1) {
      currentDifficulty = (currentDifficulty - 1) as Difficulty;
      recentRisk = [];
    }
  }

  return {
    categoryScores,
    weaknessLevels,
    weaknessTested,
    currentDifficulty,
    scenariosCompleted: state.scenariosCompleted + 1,
    recentMistakes,
    recentRisk,
    lastCategory: a.category,
  };
}

// Decide what the next scenario should test
export function chooseNextFocus(state: UserState): Focus {
  // Strongest weakness first
  const byLevel = [...WEAKNESSES].sort(
    (a, b) => state.weaknessLevels[b] - state.weaknessLevels[a]
  );
  const worst = byLevel[0];

  let weakness: Weakness;
  let reason: string;

  if (state.weaknessLevels[worst] >= WEAK_THRESHOLD) {
    // The user struggled: train that weakness again
    weakness = worst;
    reason =
      "You struggled with " +
      label(worst) +
      ", so this scenario tests it again in a new situation.";
  } else {
    // The user is doing well: try the least-tested weakness
    weakness = [...WEAKNESSES].sort(
      (a, b) => state.weaknessTested[a] - state.weaknessTested[b]
    )[0];
    reason =
      state.scenariosCompleted === 0
        ? "A warm-up scenario to see how you respond."
        : "You are handling attacks well, so we try a new area: " +
          label(weakness) +
          ".";
  }

  // Pick a category that suits the weakness, avoiding the last one used
  let candidates = CATEGORIES_FOR[weakness];
  if (state.lastCategory && candidates.length > 1) {
    const others = candidates.filter((c) => c !== state.lastCategory);
    if (others.length > 0) candidates = others;
  }
  const category = [...candidates].sort(
    (a, b) => state.categoryScores[a] - state.categoryScores[b]
  )[0];

  return {
    category,
    weakness,
    difficulty: state.currentDifficulty,
    reason,
  };
}