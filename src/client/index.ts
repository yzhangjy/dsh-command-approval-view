/**
 * Client half of dsh-command-approval-view (installed package bundle entry).
 *
 * Takes over the `conversation.composer` approval prompt: renders the pending
 * shell command as a syntax-highlighted terminal view, an instant deterministic
 * lexicon explanation, and (when the host `commandExplainer` Remote is wired)
 * a model-generated whole-command explanation. Buttons keep the existing
 * `answer('allowed-once' | 'rejected')` semantics untouched.
 *
 * Ships as a CJS closure via `window.__ModuleLoader__.load({id, factory})`.
 */

import React from 'react'
import { detExplain, normalizeCommand, type ExplainResult } from '../shared/explain'
import type { ClientCtx, CommandExplainerFace, SlotsService } from './services'

const CSS =
  '.dsh-cav-root{padding:8px calc(var(--dsh-composer-side-clearance) + 16px) 12px;flex-direction:column;align-items:center;display:flex;max-height:100%;min-height:0;box-sizing:border-box}' +
  '.dsh-cav-card{width:100%;max-width:var(--dsh-chat-content-width);border:1px solid var(--dsw-alias-state-warn-secondary);background:var(--dsw-specific-input-major);box-shadow:var(--dsw-shadow-lv2);--dsh-scrollbar-thumb:var(--dsw-alias-scrollbar-bg-l2);--dsh-scrollbar-thumb-hover:var(--dsw-alias-scrollbar-hover-l2);border-radius:20px;overflow:hidden;display:flex;flex-direction:column;max-height:min(560px,100vh - 160px)}' +
  '.dsh-cav-strip{background:var(--dsw-alias-state-warn-tertiary);color:var(--dsw-alias-state-warn-primary);align-items:center;gap:8px;padding:10px 16px;font-size:13px;line-height:18px;display:flex;flex:none}' +
  '.dsh-cav-dot{background:var(--dsw-alias-state-warn-primary);border-radius:50%;width:8px;height:8px;flex:none}' +
  '.dsh-cav-body{box-sizing:border-box;flex:1 1 auto;min-height:0;flex-direction:column;gap:6px;padding:12px 16px;display:flex;overflow-y:auto}' +
  '.dsh-cav-headline{color:var(--dsw-alias-label-primary);font-size:15px;font-weight:500;line-height:24px}' +
  '.dsh-cav-cmd{color:var(--dsw-alias-label-tertiary);font-family:var(--ds-font-family-code);font-size:13px;line-height:20px;margin:0;white-space:pre-wrap;word-break:break-word}' +
  '.dsh-cav-actionRow{justify-content:flex-end;gap:8px;padding:14px 16px;display:flex;flex:none}' +
  '.dsh-cav-btn{border-radius:9999px;font-size:13px;line-height:18px;padding:6px 14px;cursor:pointer;border:1px solid transparent}' +
  '.dsh-cav-btn:disabled{opacity:.5;cursor:default}' +
  '.dsh-cav-reject{background:transparent;color:var(--dsw-alias-label-secondary);border-color:var(--dsw-alias-border-l2)}' +
  '.dsh-cav-reject:hover:not(:disabled){background:var(--dsw-alias-interactive-bg-hover-danger);color:var(--dsw-alias-state-error-primary);border-color:transparent}' +
  '.dsh-cav-allow{background:var(--dsw-alias-brand-primary);color:var(--dsw-alias-label-primary-inverted)}' +
  '.dsh-cav-allow:hover:not(:disabled){background:var(--dsw-alias-button-primary-hover)}' +
  '.dsh-cav-tok-cmd{color:var(--dsw-alias-brand-primary);font-weight:500}' +
  '.dsh-cav-tok-opt{color:var(--dsw-alias-state-success-primary)}' +
  '.dsh-cav-tok-str{color:var(--dsw-alias-state-warn-primary)}' +
  '.dsh-cav-tok-env{color:var(--dsw-alias-state-warn-primary);font-weight:500}' +
  '.dsh-cav-tok-op{color:var(--dsw-alias-state-error-primary);font-weight:600}' +
  '.dsh-cav-tok-comment,.dsh-cav-tok-cont{color:var(--dsw-alias-label-tertiary);font-style:italic}' +
  '.dsh-cav-tok-arg{color:var(--dsw-alias-label-primary)}' +
  '.dsh-cav-loading{flex-direction:row;align-items:center;gap:8px;font-size:12px;line-height:16px;color:var(--dsw-alias-label-secondary);display:flex}' +
  '.dsh-cav-spinner{width:13px;height:13px;border:2px solid var(--dsw-alias-border-l2);border-top-color:var(--dsw-alias-brand-primary);border-radius:50%;animation:dsh-cav-spin .8s linear infinite;display:inline-block;flex:none}' +
  '@keyframes dsh-cav-spin{to{transform:rotate(360deg)}}' +
  '.dsh-cav-exp{margin-top:2px;border:1px solid var(--dsw-alias-border-l1);border-radius:12px;padding:10px 12px;flex-direction:column;gap:6px;display:flex}' +
  '.dsh-cav-exp-title{font-size:12px;line-height:16px;color:var(--dsw-alias-label-secondary);font-weight:500}' +
  '.dsh-cav-exp-summary{font-size:13px;line-height:20px;color:var(--dsw-alias-label-primary);white-space:pre-wrap}' +
  '.dsh-cav-exp-diag{font-size:11px;line-height:16px;color:var(--dsw-alias-state-error-primary);white-space:pre-wrap;font-family:var(--ds-font-family-code)}'

interface WaitLike {
  key?: string
  sessionId?: string
  payload?: { approvalId?: string; toolName?: string; reason?: string; callId?: string }
  respond?: (msg: unknown) => Promise<{ accepted?: boolean }>
}

interface NodeRootLike {
  callId?: string
  argsRaw?: string
  kind?: string
}

interface NodeLike {
  kind?: string
  data?: { root?: NodeRootLike }
}

interface SnapshotLike {
  chat?: { nodes?: { get(key: string): NodeLike | undefined } }
}

function readCommand(snapshot: unknown, callId: string | undefined): string | undefined {
  if (callId === undefined || snapshot === null || snapshot === undefined) return undefined
  const nodes = (snapshot as SnapshotLike)?.chat?.nodes
  if (!nodes || typeof nodes.get !== 'function') return undefined
  const node = nodes.get('9:tool-call' + callId)
  if (!node || node.kind !== 'tool-call') return undefined
  const root = node.data?.root
  if (!root || root.callId !== callId) return undefined
  if ('kind' in root && root.kind) return undefined // finished call: command already collapsed
  try {
    const args = JSON.parse(root.argsRaw ?? '{}')
    return typeof args.command === 'string' ? args.command : undefined
  } catch {
    return undefined
  }
}

type Tok = [string, string]

function tokenize(src: string): Tok[] {
  const tokens: Tok[] = []
  const n = src.length
  let i = 0
  let segStart = true
  const KEYWORDS: Record<string, number> = { sudo: 1, cd: 1, export: 1, echo: 1, if: 1, then: 1, else: 1, elif: 1, fi: 1, for: 1, do: 1, done: 1, while: 1, case: 1, esac: 1, function: 1, source: 1, set: 1, unset: 1, env: 1, exec: 1, trap: 1, return: 1, exit: 1 }
  const isSpace = (c: string) => c === ' ' || c === '\t' || c === '\n' || c === '\r'
  const isWordChar = (c: string) => /[A-Za-z0-9_.\/\-]/.test(c)
  while (i < n) {
    const ch = src[i]
    if (ch === '#') {
      let j = i
      while (j < n && src[j] !== '\n') j++
      tokens.push(['comment', src.slice(i, j)])
      i = j
      continue
    }
    if (isSpace(ch)) {
      let j = i
      while (j < n && isSpace(src[j])) j++
      const ws = src.slice(i, j)
      if (ws.indexOf('\n') !== -1) segStart = true
      tokens.push(['ws', ws])
      i = j
      continue
    }
    if (ch === '"' || ch === "'") {
      const q = ch
      let j = i + 1
      while (j < n) {
        if (src[j] === '\\') { j += 2; continue }
        if (src[j] === q) { j++; break }
        j++
      }
      tokens.push(['str', src.slice(i, j)])
      i = j
      segStart = false
      continue
    }
    if (ch === '\\' && (i + 1 >= n || src[i + 1] === '\n' || src[i + 1] === '\r')) {
      tokens.push(['cont', '\\'])
      i++
      continue
    }
    const two = src.slice(i, i + 2)
    if (two === '&&' || two === '||' || two === '>>') {
      tokens.push(['op', two])
      i += 2
      segStart = true
      continue
    }
    if (ch === '|' || ch === ';' || ch === '&' || ch === '>' || ch === '<') {
      tokens.push(['op', ch])
      i++
      segStart = true
      continue
    }
    if (ch === '$') {
      let j = i + 1
      if (j < n && src[j] === '{') {
        while (j < n && src[j] !== '}') j++
        if (j < n) j++
      } else {
        while (j < n && /[A-Za-z0-9_?!#$@*\-]/.test(src[j])) j++
      }
      if (j > i + 1) { tokens.push(['env', src.slice(i, j)]); i = j } else { tokens.push(['arg', '$']); i++ }
      segStart = false
      continue
    }
    if (ch === '-') {
      let j = i + 1
      let isOpt = false
      if (j < n && src[j] === '-') { j++; isOpt = true }
      else if (j < n && /[A-Za-z0-9]/.test(src[j])) { isOpt = true }
      if (isOpt) {
        while (j < n && /[A-Za-z0-9_\-]/.test(src[j])) j++
        tokens.push(['opt', src.slice(i, j)])
        i = j
      } else { tokens.push(['arg', '-']); i++ }
      segStart = false
      continue
    }
    if (isWordChar(ch)) {
      let j = i
      while (j < n && isWordChar(src[j])) j++
      const text = src.slice(i, j)
      if (segStart || KEYWORDS[text]) { tokens.push(['cmd', text]); segStart = false } else { tokens.push(['arg', text]) }
      i = j
      continue
    }
    tokens.push(['arg', ch])
    i++
    segStart = false
  }
  return tokens
}

function highlight(command: string): React.ReactElement {
  return React.createElement('pre', { className: 'dsh-cav-cmd' },
    tokenize(command).map((tok, idx) => {
      if (tok[0] === 'ws') return tok[1]
      return React.createElement('span', { key: idx, className: 'dsh-cav-tok-' + tok[0] }, tok[1])
    }),
  )
}

function explainView(exp: ExplainResult | null): React.ReactElement | null {
  if (!exp || !exp.summary) return null
  const source = exp.fallback === 'model' ? ' · 模型生成' : exp.fallback === 'lexicon' ? ' · 词库' : ''
  return React.createElement('div', { className: 'dsh-cav-exp' },
    React.createElement('div', { className: 'dsh-cav-exp-title' }, '执行说明（仅供参考）' + source),
    React.createElement('div', { className: 'dsh-cav-exp-summary' }, exp.summary),
    exp.diagnostic ? React.createElement('div', { className: 'dsh-cav-exp-diag' }, '诊断：' + exp.diagnostic) : null,
  )
}

function selectApproval(owner: unknown): unknown {
  const interactions = (owner as { interactions?: unknown[] } | undefined)?.interactions
  if (!Array.isArray(interactions)) return null
  for (const it of interactions) {
    if (it !== null && it !== undefined && (it as { kind?: string }).kind === 'approval') return it
  }
  return null
}

interface ApprovalViewProps {
  matched?: WaitLike
  useSession?: <T>(selector: (snapshot: unknown) => T) => T
  [key: string]: unknown
}

function makeApprovalView(commandExplainer: CommandExplainerFace | undefined) {
  return function ApprovalView(props: Record<string, unknown>): React.ReactElement | null {
    const p = props as ApprovalViewProps
    const wait = p.matched
    if (!wait) return null

    const command = p.useSession
      ? p.useSession<string | undefined>((snapshot) => readCommand(snapshot, wait.payload?.callId))
      : undefined

    const [answered, setAnswered] = React.useState(false)
    const [explain, setExplain] = React.useState<ExplainResult | null>(null)
    const [loading, setLoading] = React.useState(false)

    React.useEffect(() => {
      if (!command) { setExplain(null); setLoading(false); return }
      let cancelled = false
      setExplain(detExplain(normalizeCommand(command)))
      setLoading(Boolean(commandExplainer?.explain))
      if (commandExplainer && typeof commandExplainer.explain === 'function') {
        commandExplainer.explain(command).then((res) => {
          if (!cancelled && res && res.summary) { setExplain(res); setLoading(false) }
        }).catch(() => {
          if (!cancelled) setLoading(false)
        })
      }
      return () => { cancelled = true }
    }, [command])

    const answer = (outcome: 'allowed-once' | 'rejected') => {
      setAnswered(true)
      const respond = wait.respond
      if (!respond) return
      respond({
        ok: true,
        value: { sessionId: wait.sessionId, approvalId: wait.payload?.approvalId, outcome },
      }).then((receipt) => {
        if (!(receipt && receipt.accepted)) setAnswered(false)
      }).catch(() => setAnswered(false))
    }

    const reason = wait.payload?.reason
    const headline = (reason !== undefined && reason !== null && reason !== '')
      ? reason
      : ('请求确认执行：' + (wait.payload?.toolName || ''))

    return React.createElement('div', { className: 'dsh-cav-root', 'data-approval-key': wait.key },
      React.createElement('div', { className: 'dsh-cav-card' },
        React.createElement('div', { className: 'dsh-cav-strip' },
          React.createElement('span', { className: 'dsh-cav-dot' }),
          '待确认执行命令',
        ),
        React.createElement('div', { className: 'dsh-cav-body', 'data-approval-scroll': '', tabIndex: 0, role: 'group', 'aria-label': '命令确认详情' },
          React.createElement('div', { className: 'dsh-cav-headline' }, headline),
          command !== undefined ? highlight(command) : null,
          loading ? React.createElement('div', { className: 'dsh-cav-loading' },
            React.createElement('span', { className: 'dsh-cav-spinner' }),
            '正在生成执行说明…',
          ) : null,
          explainView(explain),
        ),
        React.createElement('div', { className: 'dsh-cav-actionRow' },
          React.createElement('button', { type: 'button', className: 'dsh-cav-btn dsh-cav-reject', disabled: answered, onClick: () => answer('rejected') }, '拒绝'),
          React.createElement('button', { type: 'button', className: 'dsh-cav-btn dsh-cav-allow', disabled: answered, onClick: () => answer('allowed-once') }, '允许一次'),
        ),
      ),
    )
  }
}

const name = 'command-approval-view'
const inject = ['slots']

function apply(ctx: ClientCtx): void {
  const slots = ctx.get('slots') as SlotsService | undefined
  if (!slots) return
  const commandExplainer = ctx.get('commandExplainer') as CommandExplainerFace | undefined

  ctx.effect(() => {
    const el = document.createElement('style')
    el.setAttribute('data-dsh-cav', '')
    el.textContent = CSS
    document.head.appendChild(el)
    return () => el.remove()
  }, 'dsh-command-approval-view: styles')

  const ApprovalView = makeApprovalView(commandExplainer)
  slots.inject('conversation.composer', () => {
    return slots.register({ name: 'conversation.composer', select: selectApproval, priority: -100 }, ApprovalView)
  })
}

module.exports = { name, inject, apply }
