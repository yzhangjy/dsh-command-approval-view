# PRD：DSH 命令确认展示优化插件（`dsh-command-approval-view`）

| 项目 | 内容 |
| --- | --- |
| 文档状态 | 初稿（v0.1，待评审） |
| 目标平台 | DeepSeek Harness Web（`dsh`，Host + Client 混合插件） |
| 优化对象 | **审批/命令确认提示（Approval Panel）**——请求用户确认执行命令行指令时的那块 UI |
| 一期价值 | 把"没有格式的指令"变成**语法高亮的结构化终端视图**，显著提升可读性 |
| 二期价值 | 在该视图下**额外给出一段"这段命令是干什么的"执行内容说明**，降低审批时的理解成本 |
| 覆盖工具 | `bash` / `pwsh` 等"bash 系"命令行工具（参数名 `command`） |

---

## 1. 背景与问题

DeepSeek Harness 在需要用户确认执行一条命令行指令时（典型是沙箱 bash 工具的**升权重试**，以及通用 `ask` 审批策略），会向客户端弹出一块审批提示。用户需要在这块提示里作出"允许一次 / 拒绝"的决定。

当前这块提示存在两个明显痛点：

1. **指令没有格式**：命令以整段纯文本/等宽文本原样呈现，遇到长命令、多行命令、`&&`/`|` 链式命令时，边界和语义都糊在一起，可读性差。
2. **没有执行内容说明**：审批请求本身只携带「工具名 + 理由 + 可选 callId」，并不直接携带命令文本，更没有任何"这条命令会做什么"的中性解释。用户往往要靠肉眼逐字读懂一条复杂 shell 命令才能安全地按下"允许"。

因此需要开发一个 DSH 插件，接管（或增强）命令确认提示的渲染，分两期落地：

- **一期**：把命令文本渲染为结构化的、带语法高亮的终端视图。
- **二期**：额外展示执行内容说明（这条命令的整体解释，一条连续中文，不切分）。

> 核心诉求：让用户在**做审批决定之前**，能用最短时间看懂"要执行的到底是什么、会有什么效果"，并且不改变审批本身的安全语义。

---

## 2. 现状分析（审批链路，已核实）

### 2.1 审批的 Host 侧 seam

- 包：`@deepseek-ai/dsh-user-approval`（"User-approval seam (`ctx.approval`)"）。
- 入口：`ctx.approval.request(req)`，`req` 类型为 `ApprovalRequest`：

  ```ts
  interface ApprovalRequest {
    readonly agent: Agent
    readonly toolName: string      // 被审批的工具名，如 "bash"
    readonly callId?: CallId       // 已流式展示的那次工具调用的 id（用于把提示挂到对应卡片上）
    readonly reason?: string       // 发起方的人类可读理由（如升权原因）
    readonly signal?: AbortSignal
  }
  ```

- **关键约束（已核实）**：`ApprovalRequest` **不携带工具参数**，即命令文本不在请求里。README 原文："请求不携带工具参数：应答者会看到工具名称、原因和可选调用 id"。命令必须通过 `callId` 反查那一次已展示的工具调用得到。

### 2.2 审批请求到客户端的桥接

- Host 把审批请求桥接为客户端 `MuxFrame` 帧：

  ```ts
  { type: 'approval/requested', approvalId, toolName, reason?, callId? }
  ```

- 客户端运行时把它封装成 `PendingWait<'approval'>`（`PendingInteraction` 的一种，kind = `approval`），`payload` 即上面的域字段（去掉 `type`/`sessionId`）。

### 2.3 审批提示的渲染（当前 UI）

- 包：`@deepseek-ai/dsh-client-ui-conversation`，组件 `ApprovalPanel`（`lib/types/client/skeleton/ApprovalPanel.d.ts`）。
- 分发方式：`conversation.composer` 链（chain slot）的 **takeover**，selector 用 `interactions.find(i => i.kind === 'approval')` 命中该 pending approval。
- 域对象：`PendingApproval`（`lib/types/client/contract/slots.d.ts`），暴露：

  | 成员 | 含义 |
  | --- | --- |
  | `key` | 渲染身份（React key / 一次性 latch 换轴） |
  | `toolName` | 被审批工具名（标题兜底） |
  | `reason` | 发起方的 WHY（存在时作为标题） |
  | `callId` | 配对工具调用 id（命令反查键） |
  | `answer(outcome)` | 发出用户决定，`outcome ∈ 'allowed-once' \| 'rejected'`（唯一两个可应答值） |

- 命令来源：`commandOf(call)`（同包）——"从审批配对的运行中调用中抽出 shell 命令（bash 系参数的 `command` 字段）；取不到则隐藏该行"。
- 组合 props：`ApprovalComposerProps = PropsRuntime<'conversation.composer'> & { matched: ApprovalWait } & PropsLocale<'conversation'>`。

### 2.4 相关但非本次目标的面：工具调用卡片

- 工具调用卡片由 `tool.call.toolview`（keyed slot，key = wire 工具名）分发，owner 载荷为 `ToolCallOwnerProps`（`callId` / `toolName` / `block` / `cwd` / `home` / `openFile` / `inspect`）。
- 当前 bash 卡片由 `BashRow`（`lib/types/client/tool/toolviews/bash-sample.d.ts`）渲染："icon + Bash · 描述，整行切换命令的 terminal 或通用错误卡片"。
- 该卡片同样是"裸命令"展示，但**本次两期的目标是审批确认提示**；一期的高亮组件设计为可复用，后续可平滑迁移到卡片（列为非目标/后续项）。

---

## 3. 目标与非目标

### 3.1 目标（Goals）

**一期（指令格式化展示）**

1. 在审批确认提示中，把命令文本渲染为**等宽 `pre` 终端视图**，保留原命令字节级准确（可复制，不丢字符、不改义）。
2. 提供**语法高亮**，至少覆盖：
   - 命令名/内建关键字（`cd`/`export`/`sudo` 等可配置）；
   - 短选项 `-a` 与长选项 `--all`；
   - 路径与文件名；
   - 引号字符串（单/双引号、转义）；
   - 环境变量 `${VAR}` / `$VAR`；
   - 控制/重定向操作符 `&&` `||` `|` `;` `>` `>>` `<` `2>&1` 等；
   - 注释 `# ...` 与反斜杠续行 `\`。
3. 对**多段链式命令**给出视觉分段（如 `&&` 前为一段，重定向目标单独着色），并支持按足够宽度换行而不破坏高亮。
4. 高亮使用**主题 CSS 变量**（跟随 DSH 亮/暗主题），不硬编码颜色。
5. 保持**纯客户端、确定性、无网络**：输入 `command` 字符串，输出 React 元素，不引入延迟。

**二期（指令执行内容说明，由模型生成）**

6. 在命令视图下方/旁边新增**"执行说明"区块**，由**模型**给出一段中性、简洁、非权威的说明：
   - 一句话总述：这条命令整体要做什么；
   - 整体解释：一条连续中文，覆盖整条命令与关键参数/选项的目的（不切分）。
7. **支持配置解释所用模型与提示词**：`explain.model`（用哪个模型解释）与 `explain.prompt`（解释提示词，含 `{{command}}` 占位符），二者均可配置、可独立于主会话模型切换。
8. 说明**标注为"仅供参考"**，且不得替换或改变审批决定语义（决定仍由用户独立作出，仍走 `answer()`）。
9. 模型不可用/超时/报错时**降级到确定性词库解释**，再降级为"未识别/仅展示原命令"；对**无法识别**的命令绝不臆造危险解释。
10. 一期与二期可**独立开关**（配置项），并兼容"命令取不到（无 `callId` 或无 `command`）时隐藏说明、只保留 Reason 与按钮"的现状兜底。

### 3.2 非目标（Non-goals）

- **不改变审批语义**：不新增 `allow-always`、不记忆规则、不绕过 `ask`/`never` 策略、不触碰 `ApprovalRequest` / `approval/decided` 审计对。
- **不替代工具调用卡片**（`tool.call.toolview` / `BashRow`）——仅作为复用对象列入后续项。
- **不为命令做安全裁决/拦截**：说明是解释性的，不输出"安全/危险"结论，也不据此改变按钮。
- **不持久化**审批历史或用户的格式化偏好（可作为后续）。
- **一期不引入模型调用**：高亮是确定性纯函数，与解释无关。
- **说明不做安全裁决**：模型解释仅作说明、标注"仅供参考"，不据此改变审批按钮；模型不可用时确定性词库兜底。

---

## 4. 术语

| 术语 | 含义（对应 DSH 概念） |
| --- | --- |
| 审批（approval） | 一次性权限决定 seam：`ctx.approval.request(req) → 'allowed-once' \| 'rejected' \| 'cancelled' \| 'unavailable'` |
| 审批请求 | `ApprovalRequest`（`agent` + `toolName` + 可选 `callId` + 可选 `reason`） |
| 审批提示 / 审批面板 | 客户端展示该请求并收集决定的 UI 区域（现由 `ApprovalPanel` 渲染） |
| pending approval | 客户端运行时封装：`PendingWait<'approval'>`（`PendingInteraction`） |
| 域对象 | `PendingApproval`，承载 `toolName`/`reason`/`callId`/`answer()` |
| 配对调用 | 通过 `callId` 关联的那次 `RunningToolCall`，命令从它的 `command` 参数取得 |
| 命令（command） | bash 系工具的参数 `command` 字段值，即待执行的 shell 指令文本 |
| 执行说明 | 插件额外生成、解释命令用途的中性文本（二期核心，由配置的模型生成，词库降级） |
| takeover | 在 `conversation.composer` 链中，用 selector 命中特定 interaction 并接管其渲染 |

---

## 5. 用户画像与场景

- **用户**：使用 DSH Web 与 DeepSeek 模型协作的开发者，通常会触发沙箱升权或 `ask` 审批。
- **场景 A（高可读性）**：模型执行一条较长的链式命令并触发确认，用户在允许前，希望一眼看清命令结构（哪个是命令、哪些是参数、输出重定向到哪）。
- **场景 B（零基础审阅）**：用户对某条命令不熟（如一条 `find ... -exec ...`），希望有一句"这是干嘛的"来辅助判断是否放行。
- **场景 C（多行脚本）**：命令含 `\` 续行或 `;` 分隔的多段，需要可靠换行且高亮不串。
- **场景 D（无法识别降级）**：命令查不到（无 `callId`）或解释器不认识，插件优雅回退，不阻塞审批。

---

## 6. 功能需求

### 6.1 一期：指令格式化展示

**FR-1.1 终端视图容器**
- 命令以 `<pre>` + `white-space: pre-wrap; word-break: break-word`（或等价）呈现，保留原始换行与空格，支持复制。
- 使用主题等宽字体 token；颜色全部走 theme CSS 变量。

**FR-1.2 词法高亮**
- 确定性 token 化（见 §8.2），对 token 类型分别着色：命令名 / 关键字、选项（短/长）、参数、路径、字符串、环境变量、操作符、重定向目标、注释、续行符。
- 高亮不得改变命令的字节内容与顺序（纯展示变换）。

**FR-1.3 链式命令分段**
- 以 `&&`/`||`/`|`/`;`/换行 为分段边界提供视觉分隔，操作符高亮，帮助用户数清"有几段"。

**FR-1.4 主题兼容**
- 亮/暗主题均可用；复用 DSH 既有终端卡片的颜色 token，不硬编码 hex。

**FR-1.5 开关与兜底**
- 提供"启用格式化"开关（默认开）。
- 取不到命令时退化为现状（只显示 Reason 与按钮），不额外渲染空视图。

### 6.2 二期：指令执行内容说明

**FR-2.1 执行说明区块**
- 在命令视图下方增加"执行说明"区，含：一句话总述（整体解释，一条连续中文，不切分）。
- 视觉上与"命令本体"和"审批按钮"分区，避免喧宾夺主。

**FR-2.2 说明来源**
- 默认来自 Host 侧**模型解释**：以 `explain.model` 指定的模型 + `explain.prompt` 提示词生成；模型不可用时降级到确定性词库解释。
- 说明由 `command` 字符串驱动（此字符串来自 `callId` 反查的配对调用参数，见 §8.4），**不**使用审批请求里不存在的字段。

**FR-2.3 说明内容规范**
- 总述句式示例：`列出当前目录下所有文件（含隐藏文件；-l 长格式，-a 包含隐藏项）`。
- 说明必须**中性、不越权**：只描述"做什么"，不判断"该不该允许"。

**FR-2.4 免责声明**
- 说明区固定标注"仅供参考，以实际命令为准"之类的提示。

**FR-2.5 无法识别时的降级**
- 未识别命令：总述显示"未识别命令，请审阅原文"。
- 获取失败（无命令/超时/出错）：静默隐藏说明区，不影响审批按钮。

**FR-2.6 配置**
- 提供"启用执行说明"开关（默认关，二期上线后再决定默认值），与 FR-1.5 相互独立。
- 提供"解释模型"与"提示词"配置：`explain.model`、`explain.prompt`（含 `{{command}}` 占位符），可在设置面板中修改（持久包持久化；动态原型为进程内/默认值）。

---

## 7. 交互与视觉设计

> 以"接管后的审批提示"为准，整体仍是"标题 + 命令 + 说明(二期) + 按钮"的纵向布局。

```
┌─────────────────────────────────────────────────┐
│ [工具图标] bash · 请求确认执行命令行指令          │   ← toolName + reason（保留原标题语义）
├─────────────────────────────────────────────────┤
│ $  ls  -la                                       │   ← 一期：高亮 terminal 视图
│    └─┬─┘ └┬─┘                                   │      命令名/参数 分区着色
│     命令  选项                                    │
├─ 执行说明（仅供参考）───────────────────────────┤
│ 该命令列出当前目录下所有文件（含隐藏文件）。        │   ← 二期：总述
│   ▸ ls   列出目录内容                             │      整体解释（不切分）
│   ▸ -l   使用长格式                              │
│   ▸ -a   包含以 . 开头的隐藏项                     │
├─────────────────────────────────────────────────┤
│   [允许一次]          [拒绝]                      │   ← 仍调用 PendingApproval.answer()
└─────────────────────────────────────────────────┘
```

交互要点：
- 命令区：长命令折叠成固定高度 + "展开"，默认展示可滚动；提供"复制命令"。
- 说明区（二期）：总述直接呈现（一条连续中文，不切分）。
- 允许/拒绝按钮行为与现有面板一致，无新增确认步骤、无二次弹窗。
- 键盘可达、聚焦样式符合 DSH 现有一致性。

---

## 8. 技术方案

### 8.1 平台定位（Host / Client）

| 职责 | 平台 | 说明 |
| --- | --- | --- |
| 审批提示 UI（接管与渲染） | **Client** | 在 `conversation.composer` 链中注册 selector 接管 approval interaction |
| 一期高亮（tokenize + 渲染） | **Client** | 纯函数，无网络 |
| 二期解释（调用模型生成说明 + 提示词/模型配置 + 词库降级） | **Host** | 模型调用、配置解析与降级词库都在 Node 侧 |
| Host↔Client 通信 | 两者 | `harness.handle('explain-command', h)` / `host.call('explain-command', { command })` |

> 说明：二期必须放在 Host——调用模型、读取模型配置都需要 Node 侧的 LLM/模型路由服务与配置面；确定性词库仅作为降级路径，也放在 Host。一期高亮必须在 Client（它直接渲染 DOM）。

### 8.2 一期实现：高亮器（Client，纯函数）

- 输入：`command: string`。
- 输出：token 流 `Array<{ type, text }>`，再映射为 React 元素（`React.createElement`）。
- token 类型集合（可配置词库）：
  - `command`（首个不为操作符的 token / 词库命中）、`keyword`、`short-opt`、`long-opt`、`arg`、`path`、`string`、`env`、`operator`、`redirect`、`comment`、`continuation`。
- 词法策略：先按引号/转义切分，再识别操作符（`&&` `||` `|` `;` `>` `>>` `<` `2>&1` `&`），再识别以 `-`/`--` 开头的选项、以 `${`/`$` 开头的变量、以 `#` 开头的注释、`\` 结尾的续行；其余按首 token 与词库归类。
- 样式：通过 `styles.insert(css)` 注入本地 class，颜色用 `var(--dsh-...)` 主题 token（实现期用 `Theme.listTokens` + `Service.listService('theme')` 确认真实 token 名）。
- 生命周期：所有注入随 `ctx.effect`/`slots.register` 的反注册回收，停止/更新即移除。

### 8.3 二期实现：模型解释（Host，可配置模型 + 提示词）

- 输入：`command: string`；配置：`explain.enabled`（默认关）、`explain.model`（解释用模型）、`explain.prompt`（提示词模板，含 `{{command}}` 占位符）。
- 主路径（模型解释）：
  1. Host 通过 LLM/模型路由服务（实现期用 `Service.listService` 确认真实接口，如 `ctx.llm` / 模型路由），以 `explain.model` 指定的模型、`explain.prompt` 渲染后的提示词，对 `command` 生成说明。
  2. 提示词中固定约束：只解释"做什么"、不判断"该不该允许"、绝不执行、输出一段连续中文（无 JSON、不分段）。
  3. 解析模型输出为一条连续中文（不切分、无 JSON）；解析失败 → 走降级路径。
- 降级路径（确定性词库）：
  1. 模型不可用/超时/报错/输出不合规时，回退到内置词库（命令名 → 用途；常见选项 → 含义）生成同类结构；
  2. 词库再未命中 → `fallback: 'unrecognized'`，仅展示总述"未识别命令"。
- 需要实现期确认的接口：Host 的 LLM/模型调用服务方法与参数、模型 id 列表来源（用于校验 `explain.model`）、超时与取消控制。

**默认提示词（`explain.prompt` 默认值，示意）**

```
你是 shell 命令解释器。对下面这条将提交给用户审批的命令，用中文给出一句中性的总述，
并整体解释整条命令与关键参数的用途（不切分）。
只描述"这条命令做什么"，不判断"是否应该允许执行"，绝不实际执行命令。
不输出 JSON、不分条列举、不分段；只输出一段连续中文。
不认识的字命令就跳过。
（命令正文以用户消息发送，不塞进系统提示词。）
```

### 8.4 数据流

```
bash 工具请求审批  --ctx.approval.request({toolName:'bash', callId, reason})-->
  审批 seam(host) --'approval/requested' MuxFrame--> 客户端 PendingWait<'approval'>
  --> conversation.composer 链 --> 本插件 takeover（selector 命中 approval）
        ├─ 组件内：useSession + callId → 配对 RunningToolCall → command（commandOf 同源）
        ├─ 一期：Client 本地 tokenize + 高亮渲染
        └─ 二期：client host.call('explain-command', { command }) → 说明渲染
  用户点击允许/拒绝 --> PendingApproval.answer('allowed-once'|'rejected')
  --> 客户端 RPC 应答 --> Host 审批出水（仅 allowed-once/rejected 两值）
```

关键约束复述：
- **命令不在审批 payload 中**：必须通过 `callId` 在组件内反查 `RunningToolCall` 的 `command` 参数（与 `ApprovalPanel.commandOf` 同路径）。若 `callId` 缺失或调用未就绪，则无命令 → 一期仅渲染 Reason+按钮、二期隐藏说明。
- **只读展示，不改 wire**：决定仍由 `PendingApproval.answer` 走既有 RPC 编码，本插件不重写应答协议、不触碰审计事件。

### 8.5 Host↔Client 契约（JSON）

```
// Client → Host
host.call('explain-command', { command: string })
// Host → Client（lossless JSON）
{
  summary: string,                       // 一句话总述（整条命令，不切分）
  fallback: 'model' | 'lexicon' | 'empty' | 'disabled' | 'error',
  diagnostic?: string                    // 模型失败降级时的错误信息（可选）
}
```

### 8.6 包形态与接入

- 目录：`dsh-command-approval-view/`，包名 `dsh-command-approval-view`。
- 形态（两种，按交付目标选择，机制一致）：
  1. **持久包**：`src/index.ts`（host）+ `src/client.ts`（client）等，参照 `dsh-path-anonymizer` 的 `package.json` 约定（`dsh.bundle.patch` / `peerDependencies`）；通过 host composition 或 agent preset 挂载。
  2. **动态 Cordis Plugin 原型**：先用 `cordis_define` → `cordis_run` 验证 takeover 与高亮/说明效果，再沉淀为持久包。
- 依赖（peer）：`@deepseek-ai/cordis`、`@deepseek-ai/dsh-agent`、`@deepseek-ai/dsh-user-approval`（仅类型/契约）；客户端运行时能力通过既有 slots/provider 获取。
- 配置（`Config`）：`explain.enabled`（默认关）、`explain.model`（解释用模型 id，默认取会话模型或部署默认）、`explain.prompt`（提示词模板，含 `{{command}}` 占位符）。动态插件原型阶段以默认值/内联配置承载；持久包以 schemastery schema 承载并在设置面板暴露。

---

## 9. 权衡与风险

| # | 风险/权衡 | 说明与对策 |
| --- | --- | --- |
| 1 | **接管替代内置 `ApprovalPanel`** | 必须保留允许/拒绝语义与 `answer()` 的 wire 编码；实现前先 `Slots.listSubTree('conversation.composer')` 查询真实链协议、selector 与 fallback 规则，避免双渲染或丢应答。 |
| 2 | 命令可读但解释**可能不权威/出错** | 说明固定加"仅供参考"，且仅作解释不做裁决；无法识别就降级，绝不臆造。 |
| 3 | 词库覆盖有限 | 一期高亮不依赖词库即可工作（凭语法）；二期词库未命中走降级；词库可后续扩展/社区补充。 |
| 4 | 高亮需在"长命令/多行"下不串 | 词法按引号/转义/续行优先切分，亮度只作用于文本 span，不改文本流。 |
| 5 | 主题 token 硬编码 | 实现期用 `Theme.listTokens` 确认真实变量名，全部用 `var(--...)`。 |
| 6 | 二期模型解释的延迟/成本/超时 | 模型解释为主路径，需处理超时与失败回退（降级确定性词库）；说明异步加载、审批按钮不被阻塞；超时上限可配置。 |
| 7 | 生命周期泄漏 | 所有注入（slot 注册、styles、host.handle）都归属当前 Fiber，随 stop/update 回收。 |
| 8 | 命令来源依赖 `callId` 反查 | 与现有 `ApprovalPanel.commandOf` 同源，具备同等可用性；取不到则优雅隐藏。 |

---

## 10. 里程碑与验收标准

### M1 · 一期（格式化展示）

- [ ] 在审批提示中接管命令渲染，输出等宽高亮终端视图。
- [ ] 覆盖 §6.1 的 token 类型；链式命令分段清晰；亮/暗主题正常。
- [ ] 复制命令得到与原命令完全一致的文本。
- [ ] 无命令时回退现状（Reason + 按钮），审批可用。
- [ ] 允许/拒绝行为与现有面板等价（含 `allow-once`/`reject` 与审计不变）。

### M2 · 二期（执行内容说明）

- [ ] 高亮视图下出现"执行说明"区块（总述 + 可折叠逐段）。
- [ ] `ls -la`、`find … -exec …`、`git … && npm …` 等样例给出正确且中性的解释。
- [ ] 未知命令降级为"未识别"，不阻塞审批。
- [ ] "启用执行说明"开关可独立生效，关闭后无 `host.call` 请求。
- [ ] 说明不影响审批决定与 wire 编码。

### 验收口径

- 单元：高亮器（token 边界、多行、转义）、解释器（切段、词库命中/未命中降级）。
- 集成：在真实会话触发一次 bash 升权审批，肉眼验证格式与说明；再触发无 `callId` 审批验证兜底。

---

## 11. 附录：关键类型与文件（实现参考）

| 类型/文件 | 位置（已核实） |
| --- | --- |
| `ApprovalRequest` / `ApprovalService` | `@deepseek-ai/dsh-user-approval` → `lib/types/index.d.ts` |
| 审批 seam 说明（"请求不携带工具参数"） | 同上 → `README.zh.md` |
| `PendingWait` / `PendingInteraction` / `PendingPayloads.approval` | `@deepseek-ai/dsh-client-runtime` → `lib/types/client/sessions/pending.d.ts` |
| `PendingApproval` / `ApprovalComposerProps` / `ApprovalWait` | `@deepseek-ai/dsh-client-ui-conversation` → `lib/types/client/contract/slots.d.ts` |
| `ApprovalPanel` / `commandOf` | 同上 → `lib/types/client/skeleton/ApprovalPanel.d.ts` |
| 工具卡片 slot `tool.call.toolview` / `ToolCallOwnerProps` | `@deepseek-ai/dsh-client-ui-tool` → `lib/types/client/contract/slots.d.ts` |
| bash 卡片 `BashRow` 示例 | 同上 → `lib/types/client/tool/toolviews/bash-sample.d.ts` |
| 审批请求客户端帧 `approval/requested` | `@deepseek-ai/dsh-host-apiproxy` → `lib/types/api/events.d.ts` |