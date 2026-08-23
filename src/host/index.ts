/**
 * Host half of dsh-command-approval-view.
 *
 * Registers the `commandExplainer` service: a Typert Remote face whose single
 * `explain(command)` method returns a neutral, whole-command explanation. The
 * browser half calls it through the harness's `@Remote` wire (the package's
 * `./remote` descriptor) to upgrade the deterministic lexicon fallback.
 *
 * @module dsh-command-approval-view
 */

import type { Context } from '@deepseek-ai/cordis'
import { Remote, TypertRemoteService } from '@deepseek-ai/dsh-typert-protocol'
import { resolveConfig, type ExplainerConfig } from '../config'
import { detExplain, normalizeCommand, type ExplainResult } from '../shared/explain'

export const name = 'command-approval-view'

/** Hard dependency: the model-call API used for the explanation. */
export const inject = ['llm']

export const DEFAULT_PROMPT =
  '你是 shell 命令解释器。用中文、用 1~3 句话，整体解释下面这条即将提交给用户审批的命令是做什么的，' +
  '顺带说明关键选项与参数（如 --profile、--patch、目录路径等）。' +
  '只描述“这条命令做什么”，不判断是否应该允许，绝不实际执行命令。' +
  '不输出 JSON、不分条列举、不分段；只输出一段连续中文。' +
  '反斜杠 \\ 后跟换行是续行，不要当成多条命令。不认识的字命令就跳过。'

interface ModelSelection {
  provider: string
  model: string
  reasoningEffort?: string
}

interface LlmService {
  stream(options: Record<string, unknown>): AsyncIterable<{ type?: string; text?: string; reason?: { kind?: string; failure?: { message?: string } } }>
}

interface AgentLike {
  session?: { id?: string }
}

function stripFences(raw: string): string {
  return String(raw || '').trim().replace(/^```[a-z]*\s*/i, '').replace(/\s*```$/, '').trim()
}

function resolveRoute(ctx: Context, config: ExplainerConfig): { provider: string; model: string; reasoningEffort?: string } {
  let provider = config.provider
  let model = config.model
  let reasoningEffort: string | undefined
  const selSvc = ctx.get('agentDefaultModel') as { currentSelection?: () => ModelSelection } | undefined
  try {
    const sel = selSvc && typeof selSvc.currentSelection === 'function' ? selSvc.currentSelection() : undefined
    if (sel && sel.provider && sel.model) {
      if (!provider) provider = sel.provider
      if (!model) model = sel.model
      if (!reasoningEffort) reasoningEffort = sel.reasoningEffort
    }
  } catch {
    // ignore: fall through to the explicit-config check below
  }
  if (!provider || !model) throw new Error('未配置解释模型且无默认模型')
  return { provider, model, reasoningEffort }
}

async function streamText(llm: LlmService, options: Record<string, unknown>): Promise<string> {
  let text = ''
  for await (const chunk of llm.stream(options)) {
    if (chunk && chunk.type === 'text-delta') text += chunk.text ?? ''
    else if (chunk && chunk.type === 'finish') {
      const r = chunk.reason
      if (r && (r.kind === 'error' || r.kind === 'aborted')) {
        const msg = (r.kind === 'error' && r.failure?.message) ? r.failure.message : `生成失败：${r.kind}`
        throw new Error(msg)
      }
    }
  }
  return text
}

async function modelExplain(ctx: Context, llm: LlmService, config: ExplainerConfig, command: string, sessionId?: string): Promise<ExplainResult> {
  const route = resolveRoute(ctx, config)
  const messages = [{
    id: 'm-' + Date.now().toString(36) + '-' + Math.random().toString(36).slice(2, 10),
    role: 'user',
    content: [{ type: 'text', text: '命令：\n' + command }],
    source: { kind: 'plugin', plugin: 'dsh-command-approval-view' },
  }]
  const options: Record<string, unknown> = {
    provider: route.provider,
    model: route.model,
    reasoningEffort: route.reasoningEffort,
    messages,
    system: config.prompt || DEFAULT_PROMPT,
    maxTokens: config.maxTokens,
    sessionId,
  }
  const text = stripFences(await streamText(llm, options))
  if (!text) throw new Error('模型输出为空')
  return { summary: text, fallback: 'model' }
}

async function withTimeout<T>(p: Promise<T>, ms: number, ctx: Context): Promise<T> {
  const timer = ctx.get('timer') as { timeout?: (ms: number) => Promise<void> } | undefined
  if (timer && typeof timer.timeout === 'function') {
    const timeoutP = timer.timeout(ms).then(() => { throw new Error('解释超时') })
    return await Promise.race([p, timeoutP])
  }
  return await p
}

/**
 * Explain the whole command: model first, deterministic lexicon on any failure.
 */
async function explainCommand(ctx: Context, llm: LlmService, config: ExplainerConfig, rawCommand: string, sessionId?: string): Promise<ExplainResult> {
  if (!rawCommand.trim()) return { summary: '', fallback: 'empty' }
  if (!config.enabled) return { summary: '', fallback: 'disabled' }
  const command = normalizeCommand(rawCommand)
  try {
    return await withTimeout(modelExplain(ctx, llm, config, command, sessionId), config.timeoutMs, ctx)
  } catch (err) {
    const d = detExplain(command)
    d.diagnostic = err instanceof Error ? err.message : String(err)
    return d
  }
}

/** Typert Remote face: `ctx.commandExplainer.explain(command)` from the browser. */
class CommandExplainerService extends TypertRemoteService {
  readonly config: ExplainerConfig

  constructor(ctx: Context, config: ExplainerConfig) {
    super(ctx, 'commandExplainer')
    this.config = config
  }

  @Remote('explain')
  async remoteExportExplain(agent: AgentLike, command: string): Promise<ExplainResult> {
    const sessionId = agent?.session?.id
    const llm = this.ctx.get('llm') as LlmService
    return explainCommand(this.ctx, llm, this.config, command, sessionId)
  }
}

export function apply(ctx: Context, rawConfig?: Partial<ExplainerConfig>): void {
  const config = resolveConfig(rawConfig)
  // Register even when disabled so a live settings toggle can take effect via
  // a deep re-read of the resolved config at call time; the explain method
  // itself respects `enabled` (returns 'disabled') for the degenerate case.
  void new CommandExplainerService(ctx, config)
}
