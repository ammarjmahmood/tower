import { getConversation, setAwaitingResponse, clearAwaiting } from "../store/conversation";
import { updateQuizScore, getQuizScores } from "../store/quiz-scores";
import { setLastCommand } from "../store/conversation";
import { METAR_QUIZ_BANK } from "../utils/constants";

export async function handleQuiz(phone: string): Promise<{ text: string }> {
  setLastCommand(phone, "quiz");

  // Pick a random METAR from the bank
  const idx = Math.floor(Math.random() * METAR_QUIZ_BANK.length);
  const question = METAR_QUIZ_BANK[idx];

  // Store the answer for when they reply
  setAwaitingResponse(phone, "quiz", question.answer, question.explanation);

  return {
    text: [
      "METAR Quiz:",
      "",
      question.raw,
      "",
      "What are the flight rules?",
      "Reply: VFR, MVFR, IFR, or LIFR",
    ].join("\n"),
  };
}

export async function handleQuizAnswer(phone: string, answer: string): Promise<{ text: string }> {
  const state = getConversation(phone);
  const correctAnswer = state.quiz_answer;
  const explanation = state.quiz_explanation;

  if (!correctAnswer) {
    clearAwaiting(phone);
    return { text: "No active quiz. Text quiz to start one." };
  }

  const normalized = answer.trim().toUpperCase();
  const isCorrect = normalized === correctAnswer;
  const score = updateQuizScore(phone, "metar", isCorrect);

  clearAwaiting(phone);

  const lines = [];
  if (isCorrect) {
    lines.push(`✓ Correct! ${correctAnswer}.`);
  } else {
    lines.push(`✗ Not quite. The answer is ${correctAnswer}.`);
  }
  lines.push("");
  lines.push(explanation ?? "");
  lines.push("");
  lines.push(`Score: ${score.correct}/${score.total} (${Math.round((score.correct / score.total) * 100)}%)`);
  lines.push("");
  lines.push("Text quiz for another question.");

  return { text: lines.join("\n") };
}
