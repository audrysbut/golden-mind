import allQuestions from '../data/questions.json'
import type { Question } from '../types'

const typedQuestions = allQuestions as Question[]

export function getQuestions(count: number): Question[] {
  const shuffled = [...typedQuestions].sort(() => Math.random() - 0.5)
  return shuffled.slice(0, count)
}

export function checkAnswer(question: Question, guess: string): boolean {
  const normalized = guess.toLowerCase().trim()
  return question.acceptableAnswers.some(a => a.toLowerCase().trim() === normalized)
}
