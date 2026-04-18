import db from "./db";
import { getOrCreateUser } from "./preferences";

export interface QuizScore {
  quiz_type: string;
  correct: number;
  total: number;
}

export function updateQuizScore(phone: string, quizType: string, isCorrect: boolean): QuizScore {
  getOrCreateUser(phone);
  const existing = db.query(
    "SELECT * FROM quiz_scores WHERE phone = ? AND quiz_type = ?"
  ).get(phone, quizType) as { correct: number; total: number } | null;

  if (existing) {
    const correct = existing.correct + (isCorrect ? 1 : 0);
    const total = existing.total + 1;
    db.run(
      "UPDATE quiz_scores SET correct = ?, total = ?, updated_at = datetime('now') WHERE phone = ? AND quiz_type = ?",
      [correct, total, phone, quizType]
    );
    return { quiz_type: quizType, correct, total };
  } else {
    const correct = isCorrect ? 1 : 0;
    db.run(
      "INSERT INTO quiz_scores (phone, quiz_type, correct, total) VALUES (?, ?, ?, 1)",
      [phone, quizType, correct]
    );
    return { quiz_type: quizType, correct, total: 1 };
  }
}

export function getQuizScores(phone: string): QuizScore[] {
  return db.query(
    "SELECT quiz_type, correct, total FROM quiz_scores WHERE phone = ?"
  ).all(phone) as QuizScore[];
}
