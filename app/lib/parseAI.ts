import type { Scenario } from "../data/scenarios";
import type { Evaluation } from "./evaluation";

const CATEGORIES = ["phishing", "social-engineering", "scam"];
const WEAKNESSES = ["urgency", "authority", "suspicious-links", "fake-offers"];
const RESULTS = ["safe", "risky", "dangerous"];

// Step 1: find the JSON object inside messy AI text
export function extractJson(text: string): unknown | null {
  if (!text) return null;

  // Remove any <think>...</think> reasoning and code fences
  const cleaned = text
    .replace(/<think>[\s\S]*?<\/think>/g, "")
    .replace(/```json/gi, "")
    .replace(/```/g, "");

  // Take everything from the first { to the last }
  const start = cleaned.indexOf("{");
  const end = cleaned.lastIndexOf("}");
  if (start === -1 || end === -1 || end <= start) return null;

  try {
    return JSON.parse(cleaned.slice(start, end + 1));
  } catch {
    return null;
  }
}

function isString(x: unknown): x is string {
  return typeof x === "string" && x.trim().length > 0;
}

function clampScore(n: unknown): number | null {
  if (typeof n !== "number" || Number.isNaN(n)) return null;
  return Math.max(0, Math.min(100, Math.round(n)));
}

// Step 2a: check a generated scenario has everything the page needs
export function validateScenario(data: unknown): Omit<Scenario, "id"> | null {
  if (typeof data !== "object" || data === null) return null;
  const d = data as Record<string, any>;

  if (!CATEGORIES.includes(d.category)) return null;
  if (!WEAKNESSES.includes(d.weakness)) return null;
  if (![1, 2, 3].includes(d.difficulty)) return null;
  if (!isString(d.attackType) || !isString(d.sender)) return null;
  if (!isString(d.context) || !isString(d.message)) return null;

  if (!Array.isArray(d.options) || d.options.length !== 3) return null;
  const options = [];
  for (const o of d.options) {
    const score = clampScore(o?.riskScore);
    if (
      !isString(o?.id) ||
      !isString(o?.text) ||
      !RESULTS.includes(o?.result) ||
      score === null ||
      !isString(o?.feedback)
    ) {
      return null;
    }
    options.push({
      id: o.id,
      text: o.text,
      result: o.result,
      riskScore: score,
      feedback: o.feedback,
    });
  }

  if (!Array.isArray(d.redFlags) || d.redFlags.length === 0) return null;
  const redFlags = d.redFlags.filter(isString);
  if (redFlags.length === 0) return null;

  return {
    category: d.category,
    attackType: d.attackType,
    difficulty: d.difficulty,
    weakness: d.weakness,
    sender: d.sender,
    context: d.context,
    message: d.message,
    options,
    redFlags,
  };
}

// Step 2b: check an evaluation has everything the page needs
export function validateEvaluation(data: unknown): Evaluation | null {
  if (typeof data !== "object" || data === null) return null;
  const d = data as Record<string, any>;

  const score = clampScore(d.riskScore);
  if (!RESULTS.includes(d.result) || score === null) return null;
  if (!isString(d.explanation) || !isString(d.recommendedFocus)) return null;
  if (![...WEAKNESSES, "none"].includes(d.weakness)) return null;

  const toList = (x: unknown): string[] =>
    Array.isArray(x) ? x.filter(isString) : [];

  return {
    result: d.result,
    riskScore: score,
    explanation: d.explanation,
    correctlyNoticed: toList(d.correctlyNoticed),
    missedRedFlags: toList(d.missedRedFlags),
    weakness: d.weakness,
    recommendedFocus: d.recommendedFocus,
  };
}