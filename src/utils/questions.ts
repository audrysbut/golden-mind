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

function levenshtein(a: string, b: string): number {
  const m = a.length, n = b.length
  const dp: number[][] = Array.from({ length: m + 1 }, () => Array(n + 1).fill(0))
  for (let i = 0; i <= m; i++) dp[i][0] = i
  for (let j = 0; j <= n; j++) dp[0][j] = j
  for (let i = 1; i <= m; i++) {
    for (let j = 1; j <= n; j++) {
      if (a[i - 1] === b[j - 1]) {
        dp[i][j] = dp[i - 1][j - 1]
      } else {
        dp[i][j] = Math.min(dp[i - 1][j], dp[i][j - 1], dp[i - 1][j - 1]) + 1
      }
    }
  }
  return dp[m][n]
}

export function countMatchingWords(question: Question, guess: string): { matched: number; total: number } {
  const answerWords = question.answer.toLowerCase().split(/\s+/)
  if (answerWords.length <= 1) return { matched: 0, total: 0 }
  const guessWords = new Set(guess.toLowerCase().split(/\s+/))
  const matched = answerWords.filter(w => guessWords.has(w)).length
  return { matched, total: answerWords.length }
}

export function isCloseAnswer(question: Question, guess: string): boolean {
  const normalized = guess.toLowerCase().trim()
  return question.acceptableAnswers.some(a => {
    const target = a.toLowerCase().trim()
    if (target === normalized) return false
    return levenshtein(normalized, target) <= 2
  })
}
