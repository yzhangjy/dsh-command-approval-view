/**
 * Deterministic command explanation shared by Host and Client.
 *
 * The client uses this directly as an instant, network-free fallback; the host
 * uses it as the degradation path when the model explanation fails. Keeping it
 * shared guarantees both halves agree on the same lexicon.
 *
 * @module dsh-command-approval-view/shared/explain
 */

import { LEXICON } from './lexicon'

export type ExplainFallback = 'model' | 'lexicon' | 'empty' | 'disabled' | 'error'

export interface ExplainResult {
  summary: string
  fallback: ExplainFallback
  /** Diagnostic error message, present only when a model attempt failed. */
  diagnostic?: string
}

/** Fold a trailing backslash + newline continuation into a single command. */
export function normalizeCommand(command: string): string {
  return String(command).replace(/\\[ \t]*\r?\n[ \t]*/g, ' ')
}

/** Split one command line into whitespace-separated arguments, quote-aware. */
export function splitArgs(s: string): string[] {
  const out: string[] = []
  let cur = ''
  let i = 0
  const n = s.length
  while (i < n) {
    const c = s[i]
    if (c === ' ' || c === '\t') {
      if (cur) { out.push(cur); cur = '' }
      i++
      continue
    }
    if (c === '"' || c === "'") {
      const q = c
      let j = i + 1
      while (j < n) {
        if (s[j] === '\\') { j += 2; continue }
        if (s[j] === q) break
        j++
      }
      cur += s.slice(i, j + 1)
      i = j + 1
      continue
    }
    cur += c
    i++
  }
  if (cur) out.push(cur)
  return out
}

/** Split a command into logical sub-commands on `&&`, `||`, `|`, `;`, newline. */
export function detSplit(command: string): string[] {
  const parts: string[] = []
  let cur = ''
  let i = 0
  const n = command.length
  const flush = () => { const t = cur.trim(); if (t) parts.push(t); cur = '' }
  while (i < n) {
    const two = command.slice(i, i + 2)
    if (two === '&&' || two === '||') { flush(); i += 2; continue }
    const c = command[i]
    if (c === '|' || c === ';' || c === '\n') { flush(); i++; continue }
    if (c === '"' || c === "'") {
      const q = c
      let j = i + 1
      while (j < n) {
        if (command[j] === '\\') { j += 2; continue }
        if (command[j] === q) break
        j++
      }
      cur += command.slice(i, j + 1)
      i = j + 1
      continue
    }
    cur += c
    i++
  }
  flush()
  return parts
}

/**
 * Deterministic lexicon explanation: one flat sentence for the whole command,
 * never a per-segment list (the command is explained as a single unit).
 */
export function detExplain(command: string): ExplainResult {
  const clauses: string[] = []
  for (const part of detSplit(command)) {
    const argv = splitArgs(part)
    const name = (argv[0] || '').split('/').pop() || ''
    const entry = LEXICON[name]
    if (entry) {
      let clause = name + '：' + entry.note
      for (let k = 1; k < argv.length; k++) {
        const a = argv[k]
        if (a && a.charAt(0) === '-' && entry.args && entry.args[a]) {
          clause += '（' + a + ' ' + entry.args[a] + '）'
        }
      }
      clauses.push(clause)
    }
  }
  const summary = clauses.length === 0
    ? '未能识别该命令，请人工确认。'
    : '该命令将：' + clauses.join('；') + '。'
  return { summary, fallback: 'lexicon' }
}
