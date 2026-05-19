import { loadSettings } from "@/lib/settings";
import { DEFAULT_AI_MODEL, OPENROUTER_API_URL } from "@/lib/constants";

export function getAIConfig() {
  const settings = loadSettings();
  const apiKey = settings.connection?.openRouterApiKey;
  if (!apiKey) throw new Error("OpenRouter API key not configured");
  return {
    apiKey,
    model: settings.connection?.aiModel ?? DEFAULT_AI_MODEL,
  };
}

export async function callOpenRouter(
  messages: Array<{ role: string; content: string }>,
  options?: {
    model?: string;
    temperature?: number;
    response_format?: { type: string };
  }
): Promise<string> {
  const { apiKey, model } = getAIConfig();
  const response = await fetch(OPENROUTER_API_URL, {
    method: "POST",
    headers: {
      Authorization: `Bearer ${apiKey}`,
      "Content-Type": "application/json",
      "HTTP-Referer": "",
      "X-Title": "PG Insights",
    },
    body: JSON.stringify({
      model: options?.model ?? model,
      messages,
      response_format: options?.response_format ?? { type: "json_object" },
      temperature: options?.temperature ?? 0.3,
    }),
  });

  if (!response.ok) {
    const err = await response.text();
    throw new Error(`OpenRouter error: ${response.status} ${err}`.trim());
  }

  const data = await response.json() as { choices: Array<{ message: { content: string } }> };
  const content = data.choices[0]?.message?.content;
  if (!content) throw new Error("Empty response from AI");
  return content;
}
