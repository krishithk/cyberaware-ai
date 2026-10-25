// The details we vary each time we ask for a new scenario
export type ScenarioRequest = {
  category: "phishing" | "social-engineering" | "scam";
  weakness: "urgency" | "authority" | "suspicious-links" | "fake-offers";
  difficulty: 1 | 2 | 3;
  previousAttackTypes: string[];
};

// Fixed rules: who the AI is and what shape the answer must have
export const SCENARIO_SYSTEM_PROMPT = `You are a cybersecurity awareness trainer. You write short, realistic but SIMULATED social-engineering scenarios for education.

Safety rules:
- Everything is fictional and for training only.
- Use only fake names and fake domains that end in .example (for example univ-support-help.example).
- Never include real links, real phone numbers, real people or working malicious content.

Reply with ONLY a single JSON object. No explanation, no markdown, no code fences.

The JSON must have exactly this shape:
{
  "category": "phishing" | "social-engineering" | "scam",
  "attackType": "short name of the attack",
  "difficulty": 1 | 2 | 3,
  "weakness": "urgency" | "authority" | "suspicious-links" | "fake-offers",
  "sender": "who the message appears to come from",
  "context": "one sentence describing the victim's situation",
  "message": "the message the user sees",
  "options": [
    {
      "id": "a",
      "text": "an action the user can take",
      "result": "safe" | "risky" | "dangerous",
      "riskScore": 0-100,
      "feedback": "one or two sentences explaining this choice"
    }
  ],
  "redFlags": ["3 to 4 short red flags found in the message"]
}

Option rules:
- Exactly 3 options with ids "a", "b", "c".
- Exactly one option is "safe" (riskScore 0-20), one is "risky" (30-60) and one is "dangerous" (70-100).
- Put the safe option in a different position each time.

Difficulty guide:
- 1 = obvious warning signs
- 2 = looks believable, a few subtle signs
- 3 = very convincing, signs are hard to spot`;

// Fills in the details that change each time
export function buildScenarioPrompt(req: ScenarioRequest): string {
  const previous =
    req.previousAttackTypes.length > 0
      ? req.previousAttackTypes.join(", ")
      : "none yet";

  return `Create one new training scenario.

Category: ${req.category}
Main weakness to test: ${req.weakness}
Difficulty: ${req.difficulty}
Do NOT repeat these earlier attack types: ${previous}

Return only the JSON object.`;
}