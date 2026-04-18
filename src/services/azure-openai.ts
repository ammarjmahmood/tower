const AZURE_ENDPOINT = process.env.AZURE_OPENAI_ENDPOINT!;
const AZURE_API_KEY = process.env.AZURE_OPENAI_API_KEY!;
const AZURE_DEPLOYMENT = process.env.AZURE_OPENAI_DEPLOYMENT || "gpt-4o";
const AZURE_API_VERSION = process.env.AZURE_OPENAI_API_VERSION || "2024-12-01-preview";

interface ChatMessage {
  role: "system" | "user" | "assistant";
  content: string;
}

/**
 * Send a chat completion request to Azure OpenAI
 * Tries v1 endpoint first, falls back to legacy deployment endpoint
 */
export async function chatWithAzure(
  systemPrompt: string,
  messages: ChatMessage[],
  maxTokens: number = 600
): Promise<string> {
  const v1Url = `${AZURE_ENDPOINT}/openai/v1/chat/completions`;
  const legacyUrl = `${AZURE_ENDPOINT}/openai/deployments/${AZURE_DEPLOYMENT}/chat/completions?api-version=${AZURE_API_VERSION}`;

  const body = JSON.stringify({
    model: AZURE_DEPLOYMENT,
    messages: [{ role: "system", content: systemPrompt }, ...messages],
    max_tokens: maxTokens,
    temperature: 0.7,
  });

  const headers = {
    "api-key": AZURE_API_KEY,
    "Content-Type": "application/json",
  };

  let res = await fetch(v1Url, { method: "POST", headers, body });
  if (!res.ok && res.status === 404) {
    res = await fetch(legacyUrl, { method: "POST", headers, body });
  }

  if (!res.ok) {
    const err = await res.text();
    throw new Error(`Azure OpenAI error ${res.status}: ${err}`);
  }

  const data = await res.json();
  return data.choices[0].message.content;
}

/**
 * Explain a METAR to a student pilot
 */
export async function explainMetar(rawMetar: string): Promise<string> {
  return chatWithAzure(
    "You are a friendly flight instructor helping a student pilot understand weather reports. Explain every element of the METAR in simple language. Be encouraging. Use short paragraphs.",
    [{ role: "user", content: `Please explain this METAR to me:\n${rawMetar}` }],
    800
  );
}

/**
 * Generate a go/no-go scenario for training
 */
export async function generateScenario(): Promise<{
  scenario: string;
  correctDecision: string;
  reasoning: string;
}> {
  const response = await chatWithAzure(
    `You are a flight instructor creating go/no-go decision scenarios for student pilots in Canada.
Generate a realistic scenario with:
- Departure and destination airports (use real Canadian ICAO codes)
- Aircraft type (C172 or DA40)
- Time of day
- A current METAR for departure
- A TAF showing changing conditions
- One non-obvious factor (crosswind, fuel planning, sunset timing, NOTAM consideration)

Respond in this exact JSON format:
{
  "scenario": "The full scenario description for the student (2-3 paragraphs)",
  "correctDecision": "GO" or "NO GO",
  "reasoning": "Detailed instructor explanation of the correct answer (1-2 paragraphs)"
}`,
    [{ role: "user", content: "Generate a new go/no-go scenario." }],
    1000
  );

  try {
    return JSON.parse(response);
  } catch {
    // If JSON parsing fails, try to extract from the response
    return {
      scenario: response,
      correctDecision: "NO GO",
      reasoning: "Unable to parse scenario. Discuss with your instructor.",
    };
  }
}

/**
 * Evaluate a student's go/no-go answer
 */
export async function evaluateScenarioAnswer(
  scenario: string,
  correctDecision: string,
  correctReasoning: string,
  studentAnswer: string
): Promise<string> {
  return chatWithAzure(
    `You are a flight instructor evaluating a student pilot's go/no-go decision. Be constructive and educational.
If they got it right, praise them and add any additional considerations.
If they got it wrong, gently explain why and what they missed.
Keep your response to 2-3 short paragraphs.`,
    [
      {
        role: "user",
        content: `Scenario: ${scenario}\n\nCorrect decision: ${correctDecision}\nCorrect reasoning: ${correctReasoning}\n\nStudent's answer: ${studentAnswer}\n\nEvaluate their decision:`,
      },
    ],
    500
  );
}
