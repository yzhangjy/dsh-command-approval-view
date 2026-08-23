/**
 * Client-side service contracts — the small faces this plugin consumes from the
 * harness web half. TYPE-ONLY; kept local so the bundle stays free of
 * cross-plugin runtime imports.
 */

import type { Context } from '@deepseek-ai/cordis'
import type { ExplainResult } from '../shared/explain.ts'

export type ClientCtx = Context

/** A slot registration for a chain slot (name + selector + priority). */
export interface ChainSlotRegistration {
  name: string
  select: (owner: unknown) => unknown
  priority: number
}

/** The harness slot service (`ctx.slots`). */
export interface SlotsService {
  register(registration: ChainSlotRegistration, component: (props: Record<string, unknown>) => unknown): unknown
  inject(key: string, callback: () => unknown): () => void
}

/** The client facade of the host `commandExplainer` Typert Remote. */
export interface CommandExplainerFace {
  explain(command: string): Promise<ExplainResult>
}
