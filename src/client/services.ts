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

/** The client facade of the host `commandExplainer` Typert Remote (`remote.commandExplainer`). */
export interface CommandExplainerFace {
  explain(command: string): Promise<ExplainResult>
}

/** Identity-shaped codec schema for the client-side descriptor (parse is a passthrough). */
export interface PassthroughSchema {
  parse(value: unknown): unknown
}

export interface RemoteDescriptor {
  id: string
  service: string
  namespace: string
  method: string
  implementation: string
  invocation: { kind: 'direct' }
  parameters: Array<{
    name: string
    wire: string
    source: 'json'
    codec: { mode: 'strict'; typeSymbol: string; schema: PassthroughSchema }
  }>
  result: { mode: 'strict'; typeSymbol: string; schema: PassthroughSchema }
}

export interface RemoteContribution {
  package: string
  descriptors: RemoteDescriptor[]
}

/** The typed Client Remote mount (`ctx.remote`), whose `$mount` installs a namespace facade. */
export interface RemoteService {
  $mount(contribution: RemoteContribution): Promise<() => Promise<void>>
}
