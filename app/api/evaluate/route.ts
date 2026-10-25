import { askNemotron, getModelName, NebiusError } from "../../lib/nebius";
import {
  EVALUATION_SYSTEM_PROMPT,
  buildEvaluationPrompt,
} from "../../lib/evaluation";
import {
  extractJson,
  validateEvaluation,
  validateScenario,
} from "../../lib/parseAI";
import type { Scenario } from "../../data/scenarios";

// Ask Nemotron to judge one choice
async function evaluate(
  scenario: Omit<Scenario, "id">,
  selectedOptionId: string
) {
  // Reject options that don't exist BEFORE using any AI credits
  const exists = scenario.options.some((o) => o.id === selectedOptionId);
  if (!exists) {
    return Response.json(
      { error: "That option does not exist in this scenario" },
      { status: 400 }
    );
  }

  // Try up to 2 times if the AI's answer can't be read
  for (let attempt = 1; attempt <= 2; attempt++) {
    try {
      const text = await askNemotron(
        EVALUATION_SYSTEM_PROMPT,
        buildEvaluationPrompt(scenario, selectedOptionId),
        { temperature: 0.3 }
      );

      const evaluation = validateEvaluation(extractJson(text));
      if (evaluation) {
        return Response.json({
          evaluation: evaluation,
          source: "nemotron",
          model: getModelName(),
        });
      }
      // Unreadable answer: loop and try once more
    } catch (err) {
      // Key or connection problems: retrying won't help, so report now
      const status = err instanceof NebiusError ? err.status : 500;
      return Response.json(
        {
          error: "Could not evaluate the answer",
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

// The page sends the scenario and the chosen option here
export async function POST(request: Request) {
  let body: any;
  try {
    body = await request.json();
  } catch {
    return Response.json(
      { error: "Request body must be JSON" },
      { status: 400 }
    );
  }

  const scenario = validateScenario(body?.scenario);
  const selectedOptionId = body?.selectedOptionId;

  if (!scenario || typeof selectedOptionId !== "string") {
    return Response.json(
      { error: "Send a valid scenario and a selectedOptionId" },
      { status: 400 }
    );
  }

  return evaluate(scenario, selectedOptionId);
}