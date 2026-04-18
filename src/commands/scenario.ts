import { setAwaitingResponse, setScenarioContext, getConversation, clearAwaiting } from "../store/conversation";
import { updateQuizScore } from "../store/quiz-scores";
import { setLastCommand } from "../store/conversation";
import { generateScenario, evaluateScenarioAnswer } from "../services/azure-openai";

export async function handleScenario(phone: string): Promise<{ text: string }> {
  setLastCommand(phone, "scenario");

  try {
    const scenario = await generateScenario();

    // Store scenario context for evaluation
    setAwaitingResponse(phone, "scenario", scenario.correctDecision, scenario.reasoning);
    setScenarioContext(phone, scenario.scenario);

    return {
      text: [
        "Go/No-Go Scenario:",
        "",
        scenario.scenario,
        "",
        "What's your decision? Reply with GO or NO GO and your reasoning.",
      ].join("\n"),
    };
  } catch (error: any) {
    return { text: `Scenario generation error: ${error.message}` };
  }
}

export async function handleScenarioAnswer(phone: string, answer: string): Promise<{ text: string }> {
  const state = getConversation(phone);
  const correctDecision = state.quiz_answer;
  const correctReasoning = state.quiz_explanation;
  const scenario = state.scenario_context;

  if (!correctDecision || !scenario) {
    clearAwaiting(phone);
    return { text: "No active scenario. Text scenario to start one." };
  }

  try {
    const feedback = await evaluateScenarioAnswer(
      scenario,
      correctDecision,
      correctReasoning ?? "",
      answer
    );

    // Determine if student got it right (rough check)
    const studentDecision = answer.toUpperCase().includes("NO GO") ? "NO GO" : answer.toUpperCase().includes("GO") ? "GO" : "UNKNOWN";
    const isCorrect = studentDecision === correctDecision;
    updateQuizScore(phone, "scenario", isCorrect);

    clearAwaiting(phone);

    return {
      text: [
        `Correct answer: ${correctDecision}`,
        "",
        feedback,
        "",
        "Text scenario for another one.",
      ].join("\n"),
    };
  } catch (error: any) {
    clearAwaiting(phone);
    return { text: `Evaluation error: ${error.message}` };
  }
}
