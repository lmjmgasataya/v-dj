export const SECURITY_QUESTIONS = [
  "What is your mother's maiden name?",
  "What was the name of your first pet?",
  "What was the name of your first employer?",
  "What was the name of your elementary/primary school?",
  "What was the make and model of your first car?",
] as const;

export type SecurityQuestion = (typeof SECURITY_QUESTIONS)[number];

export function normalizeSecurityAnswer(answer: string) {
  return answer.trim().toLowerCase();
}
