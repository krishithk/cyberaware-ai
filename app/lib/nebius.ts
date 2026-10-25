// One place that talks to Nemotron on Nebius Token Factory.
// This file only runs on the server, so the API key stays secret.

export class NebiusError extends Error {
  status: number;
  constructor(message: string, status: number) {
    super(message);
    this.status = status;
  }
}

type Options = {
  temperature?: number;
  maxTokens?: number;
};

export async function askNemotron(
  systemPrompt: string,
  userPrompt: string,
  options: Options = {}
): Promise<string> {
  const apiKey = process.env.NEBIUS_API_KEY;
  const model = process.env.NEBIUS_MODEL;

  if (!apiKey || !model) {
    throw new NebiusError(
      "Missing NEBIUS_API_KEY or NEBIUS_MODEL in .env.local",
      500
    );
  }

  // The address comes from .env.local, with a default if it is missing
  const baseUrl = (
    process.env.NEBIUS_BASE_URL ?? "https://api.tokenfactory.nebius.com/v1"
  ).replace(/\/+$/, "");

  const response = await fetch(baseUrl + "/chat/completions", {
    method: "POST",
    headers: {
      "Content-Type": "application/json",
      Authorization: "Bearer " + apiKey,
    },
    body: JSON.stringify({
      model: model,
      messages: [
        { role: "system", content: systemPrompt },
        { role: "user", content: userPrompt },
      ],
      temperature: options.temperature ?? 0.7,
      // Reasoning models spend tokens "thinking", so we allow plenty
      max_tokens: options.maxTokens ?? 4000,
    }),
  });

  const data = await response.json().catch(() => null);

  if (!response.ok) {
    throw new NebiusError(
      "Nebius returned an error: " + JSON.stringify(data),
      response.status
    );
  }

  const content = data?.choices?.[0]?.message?.content;
  if (!content) {
    throw new NebiusError("The model returned an empty answer", 502);
  }

  return content;
}

export function getModelName(): string {
  return process.env.NEBIUS_MODEL ?? "unknown";
}