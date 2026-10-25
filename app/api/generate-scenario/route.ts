import { askNemotron, getModelName, NebiusError } from "../../lib/nebius";
import {
  SCENARIO_SYSTEM_PROMPT,
  buildScenarioPrompt,
} from "../../lib/prompts";
import type { ScenarioRequest } from "../../lib/prompts";
import { extractJson, validateScenario } from "../../lib/parseAI";

const CATEGORIES = ["phishing", "social-engineering", "scam"];
const WEAKNESSES = ["urgency", "authority", "suspicious-links", "fake-offers"];

// Example:
// /api/generate-scenario?category=phishing&weakness=urgency&difficulty=1&previous=Fake%20IT%20alert
export async function GET(request: Request) {
  const params = new URL(request.url).searchParams;

  const category = params.get("category") ?? "phishing";
  const weakness = params.get("weakness") ?? "urgency";
  const difficulty = Number(params.get("difficulty") ?? "1");

  if (
    !CATEGORIES.includes(category) ||
    !WEAKNESSES.includes(weakness) ||
    ![1, 2, 3].includes(difficulty)
  ) {
    return Response.json(
      { error: "Invalid category, weakness or difficulty" },
      { status: 400 }
    );
  }

  // Attack types already shown this session, so Nemotron does not repeat them.
  // We clean the text because it ends up inside the AI prompt.
  const previous = (params.get("previous") ?? "")
    .split("|")
    .map((s) =>
      s
        .replace(/[^A-Za-z0-9 ,.'&-]/g, "")
        .slice(0, 60)
        .trim()
    )
    .filter((s) => s.length > 0)
    .slice(0, 8);

  const req: ScenarioRequest = {
    category: category as ScenarioRequest["category"],
    weakness: weakness as ScenarioRequest["weakness"],
    difficulty: difficulty as ScenarioRequest["difficulty"],
    previousAttackTypes: previous,
  };

  // Try up to 2 times if the AI's answer can't be read
  for (let attempt = 1; attempt <= 2; attempt++) {
    try {
      const text = await askNemotron(
        SCENARIO_SYSTEM_PROMPT,
        buildScenarioPrompt(req),
        { temperature: 0.8 }
      );

      const scenario = validateScenario(extractJson(text));
      if (scenario) {
        return Response.json({
          scenario: scenario,
          source: "nemotron",
          model: getModelName(),
        });
      }
      // Unreadable answer: loop and try once more
    } catch (err) {
      // Connection or key problems: retrying won't help, so report now
      const status = err instanceof NebiusError ? err.status : 500;
      return Response.json(
        {
          error: "Could not generate a scenario",
          details: err instanceof Error ? err.message : String(err),
        },
        { status: status >= 400 && status < 600 ? status : 500 }
      );
    }
  }

  return Response.json(
    { error: "The AI answer could not be read after 2 attempts" },
    { status: 502 }
  );
}