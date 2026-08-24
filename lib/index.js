import { resolveConfig } from "./config-DiyI6dcy.js";
import { Remote, TypertRemoteService } from "@deepseek-ai/dsh-typert-protocol";

//#region src/shared/lexicon.ts
const LEXICON = {
	ls: {
		note: "列出目录内容",
		args: {
			"-l": "长格式",
			"-a": "包含隐藏项",
			"-la": "长格式且包含隐藏项",
			"-al": "长格式且包含隐藏项"
		}
	},
	cd: { note: "切换当前目录" },
	pwd: { note: "打印当前工作目录" },
	cat: { note: "输出文件内容" },
	less: { note: "分页查看文件" },
	mkdir: {
		note: "创建目录",
		args: { "-p": "递归创建父目录" }
	},
	rm: {
		note: "删除文件或目录",
		args: {
			"-r": "递归",
			"-f": "强制",
			"-rf": "递归强制删除"
		}
	},
	echo: {
		note: "打印文本",
		args: { "-n": "不输出换行符" }
	},
	grep: {
		note: "按模式搜索文本",
		args: {
			"-r": "递归搜索",
			"-n": "显示行号",
			"-i": "忽略大小写",
			"-l": "只列文件名"
		}
	},
	find: { note: "查找文件或目录" },
	git: { note: "Git 版本控制操作" },
	npm: {
		note: "Node.js 包管理操作",
		args: {
			install: "安装依赖",
			test: "运行测试"
		}
	},
	node: { note: "运行 Node.js 脚本" },
	python: { note: "运行 Python 脚本" },
	python3: { note: "运行 Python3 脚本" },
	curl: {
		note: "发起网络请求",
		args: {
			"-L": "跟随重定向",
			"-s": "安静模式",
			"-o": "输出到文件"
		}
	},
	wget: {
		note: "下载文件",
		args: {
			"-q": "安静模式",
			"-O": "指定输出文件"
		}
	},
	sudo: { note: "以超级用户权限执行" },
	touch: { note: "创建空文件或更新时间戳" },
	cp: {
		note: "复制文件或目录",
		args: { "-r": "递归复制" }
	},
	mv: { note: "移动或重命名文件" },
	chmod: { note: "修改文件权限" },
	chown: { note: "修改文件属主" },
	ps: {
		note: "查看进程",
		args: { aux: "查看全部进程" }
	},
	kill: { note: "终止进程" },
	which: { note: "定位可执行文件路径" },
	env: { note: "设置并执行命令（或打印环境变量）" },
	export: { note: "设置环境变量" },
	source: { note: "在当前 shell 中执行脚本" },
	test: { note: "测试条件" },
	dsh: {
		note: "DeepSeek Harness 命令行工具",
		args: {
			"--profile": "指定运行 profile",
			"--patch": "合并 patch 配置",
			"--dump-config": "打印合并后配置"
		}
	},
	ln: {
		note: "创建文件链接",
		args: {
			"-s": "符号链接",
			"-f": "覆盖已存在",
			"-n": "不跟随已存在的符号链接",
			"-sfn": "强制创建符号链接"
		}
	},
	awk: { note: "按行处理文本" },
	ssh: { note: "SSH 远程登录或执行命令" },
	scp: { note: "SSH 安全拷贝" },
	rsync: { note: "增量同步文件" },
	tar: {
		note: "归档/解压文件",
		args: {
			"-czf": "压缩归档",
			"-xzf": "解压",
			"-xf": "解压"
		}
	},
	head: {
		note: "输出文件开头",
		args: { "-n": "指定行数" }
	},
	tail: {
		note: "输出文件末尾",
		args: {
			"-n": "指定行数",
			"-f": "持续跟踪输出"
		}
	},
	sed: { note: "流式文本替换" },
	df: {
		note: "查看磁盘占用",
		args: { "-h": "人类可读单位" }
	},
	du: {
		note: "查看目录占用",
		args: {
			"-h": "人类可读单位",
			"-sh": "汇总计算目录总大小"
		}
	}
};

//#endregion
//#region src/shared/explain.ts
/** Fold a trailing backslash + newline continuation into a single command. */
function normalizeCommand(command) {
	return String(command).replace(/\\[ \t]*\r?\n[ \t]*/g, " ");
}
/** Split one command line into whitespace-separated arguments, quote-aware. */
function splitArgs(s) {
	const out = [];
	let cur = "";
	let i = 0;
	const n = s.length;
	while (i < n) {
		const c = s[i];
		if (c === " " || c === "	") {
			if (cur) {
				out.push(cur);
				cur = "";
			}
			i++;
			continue;
		}
		if (c === "\"" || c === "'") {
			const q = c;
			let j = i + 1;
			while (j < n) {
				if (s[j] === "\\") {
					j += 2;
					continue;
				}
				if (s[j] === q) break;
				j++;
			}
			cur += s.slice(i, j + 1);
			i = j + 1;
			continue;
		}
		cur += c;
		i++;
	}
	if (cur) out.push(cur);
	return out;
}
/** Split a command into logical sub-commands on `&&`, `||`, `|`, `;`, newline. */
function detSplit(command) {
	const parts = [];
	let cur = "";
	let i = 0;
	const n = command.length;
	const flush = () => {
		const t = cur.trim();
		if (t) parts.push(t);
		cur = "";
	};
	while (i < n) {
		const two = command.slice(i, i + 2);
		if (two === "&&" || two === "||") {
			flush();
			i += 2;
			continue;
		}
		const c = command[i];
		if (c === "|" || c === ";" || c === "\n") {
			flush();
			i++;
			continue;
		}
		if (c === "\"" || c === "'") {
			const q = c;
			let j = i + 1;
			while (j < n) {
				if (command[j] === "\\") {
					j += 2;
					continue;
				}
				if (command[j] === q) break;
				j++;
			}
			cur += command.slice(i, j + 1);
			i = j + 1;
			continue;
		}
		cur += c;
		i++;
	}
	flush();
	return parts;
}
/**
* Deterministic lexicon explanation: one flat sentence for the whole command,
* never a per-segment list (the command is explained as a single unit).
*/
function detExplain(command) {
	const clauses = [];
	for (const part of detSplit(command)) {
		const argv = splitArgs(part);
		const name$1 = (argv[0] || "").split("/").pop() || "";
		const entry = LEXICON[name$1];
		if (entry) {
			let clause = name$1 + "：" + entry.note;
			for (let k = 1; k < argv.length; k++) {
				const a = argv[k];
				if (a && a.charAt(0) === "-" && entry.args && entry.args[a]) clause += "（" + a + " " + entry.args[a] + "）";
			}
			clauses.push(clause);
		}
	}
	const summary = clauses.length === 0 ? "未能识别该命令，请人工确认。" : "该命令将：" + clauses.join("；") + "。";
	return {
		summary,
		fallback: "lexicon"
	};
}

//#endregion
//#region src/host/index.ts
const name = "command-approval-view";
/** Hard dependency: the model-call API used for the explanation. */
const inject = ["llm"];
const DEFAULT_PROMPT = "你是 shell 命令解释器。用中文、用 1~3 句话，整体解释下面这条即将提交给用户审批的命令是做什么的，顺带说明关键选项与参数（如 --profile、--patch、目录路径等）。只描述\"这条命令做什么\"，不判断是否应该允许，绝不实际执行命令。不输出 JSON、不分条列举、不分段；只输出一段连续中文。反斜杠 \\ 后跟换行是续行，不要当成多条命令。不认识的字命令就跳过。";
function stripFences(raw) {
	return String(raw || "").trim().replace(/^```[a-z]*\s*/i, "").replace(/\s*```$/, "").trim();
}
function resolveRoute(ctx, config) {
	let provider = config.provider;
	let model = config.model;
	let reasoningEffort;
	const selSvc = ctx.get("agentDefaultModel");
	try {
		const sel = selSvc && typeof selSvc.currentSelection === "function" ? selSvc.currentSelection() : void 0;
		if (sel && sel.provider && sel.model) {
			if (!provider) provider = sel.provider;
			if (!model) model = sel.model;
			if (!reasoningEffort) reasoningEffort = sel.reasoningEffort;
		}
	} catch {}
	if (!provider || !model) throw new Error("未配置解释模型且无默认模型");
	return {
		provider,
		model,
		reasoningEffort
	};
}
async function streamText(llm, options) {
	let text = "";
	for await (const chunk of llm.stream(options)) if (chunk && chunk.type === "text-delta") text += chunk.text ?? "";
	else if (chunk && chunk.type === "finish") {
		const r = chunk.reason;
		if (r && (r.kind === "error" || r.kind === "aborted")) {
			const msg = r.kind === "error" && r.failure?.message ? r.failure.message : `生成失败：${r.kind}`;
			throw new Error(msg);
		}
	}
	return text;
}
async function modelExplain(ctx, llm, config, command, sessionId) {
	const route = resolveRoute(ctx, config);
	const messages = [{
		id: "m-" + Date.now().toString(36) + "-" + Math.random().toString(36).slice(2, 10),
		role: "user",
		content: [{
			type: "text",
			text: "命令：\n" + command
		}],
		source: {
			kind: "plugin",
			plugin: "dsh-command-approval-view"
		}
	}];
	const options = {
		provider: route.provider,
		model: route.model,
		reasoningEffort: route.reasoningEffort,
		messages,
		system: config.prompt || DEFAULT_PROMPT,
		maxTokens: config.maxTokens,
		sessionId
	};
	const text = stripFences(await streamText(llm, options));
	if (!text) throw new Error("模型输出为空");
	return {
		summary: text,
		fallback: "model"
	};
}
async function withTimeout(p, ms, ctx) {
	const timer = ctx.get("timer");
	if (timer && typeof timer.timeout === "function") {
		const timeoutP = timer.timeout(ms).then(() => {
			throw new Error("解释超时");
		});
		return await Promise.race([p, timeoutP]);
	}
	return await p;
}
/**
* Explain the whole command: model first, deterministic lexicon on any failure.
*/
async function explainCommand(ctx, llm, config, rawCommand, sessionId) {
	if (!rawCommand.trim()) return {
		summary: "",
		fallback: "empty"
	};
	if (!config.enabled) return {
		summary: "",
		fallback: "disabled"
	};
	const command = normalizeCommand(rawCommand);
	try {
		return await withTimeout(modelExplain(ctx, llm, config, command, sessionId), config.timeoutMs, ctx);
	} catch (err) {
		const d = detExplain(command);
		d.diagnostic = err instanceof Error ? err.message : String(err);
		return d;
	}
}
/**
* ES decorator runtime helpers — identical to what the harness's own build
* emits for `@Remote` (the `@` decorator syntax is not parseable by plain
* Node ESM, so the source ships this pre-lowered form; tsdown passes it
* through verbatim).
*/
function __runInitializers(thisArg, initializers, value) {
	const useValue = arguments.length > 2;
	for (let i = 0; i < initializers.length; i++) value = useValue ? initializers[i].call(thisArg, value) : initializers[i].call(thisArg);
	return useValue ? value : void 0;
}
function __esDecorate(ctor, descriptorIn, decorators, contextIn, initializers, extraInitializers) {
	const accept = (f) => {
		if (f !== void 0 && typeof f !== "function") throw new TypeError("Function expected");
		return f;
	};
	const kind = contextIn.kind;
	const key = kind === "getter" ? "get" : kind === "setter" ? "set" : "value";
	const target = !descriptorIn && ctor ? contextIn.static ? ctor : ctor.prototype : null;
	let descriptor = descriptorIn || (target ? Object.getOwnPropertyDescriptor(target, contextIn.name) : {});
	let done = false;
	for (let i = decorators.length - 1; i >= 0; i--) {
		const context = {};
		for (const p in contextIn) context[p] = p === "access" ? {} : contextIn[p];
		for (const p in contextIn.access) context.access[p] = contextIn.access[p];
		context.addInitializer = function(f) {
			if (done) throw new TypeError("Cannot add initializers after decoration has completed");
			extraInitializers.push(accept(f || null));
		};
		const result = decorators[i](kind === "accessor" ? {
			get: descriptor.get,
			set: descriptor.set
		} : descriptor[key], context);
		let v;
		if (kind === "accessor") {
			if (result === void 0) continue;
			if (result === null || typeof result !== "object") throw new TypeError("Object expected");
			if (v = accept(result.get)) descriptor.get = v;
			if (v = accept(result.set)) descriptor.set = v;
			if (v = accept(result.init)) initializers.unshift(v);
		} else if (v = accept(result)) if (kind === "field") initializers.unshift(v);
		else descriptor[key] = v;
	}
	if (target) Object.defineProperty(target, contextIn.name, descriptor);
	done = true;
}
/** Typert Remote face: `ctx.commandExplainer.explain(command)` from the browser. */
let _remoteExportExplain_decorators;
const _instanceExtraInitializers = [];
var CommandExplainerService = class extends TypertRemoteService {
	static {
		const _metadata = typeof Symbol === "function" && Symbol.metadata ? Object.create(TypertRemoteService[Symbol.metadata] ?? null) : void 0;
		_remoteExportExplain_decorators = [Remote("explain")];
		__esDecorate(this, null, _remoteExportExplain_decorators, {
			kind: "method",
			name: "remoteExportExplain",
			static: false,
			private: false,
			access: {
				has: (obj) => "remoteExportExplain" in obj,
				get: (obj) => obj.remoteExportExplain
			},
			metadata: _metadata
		}, null, _instanceExtraInitializers);
		if (_metadata) Object.defineProperty(this, Symbol.metadata, {
			enumerable: true,
			configurable: true,
			writable: true,
			value: _metadata
		});
	}
	constructor(ctx, config) {
		super(ctx, "commandExplainer");
		__runInitializers(this, _instanceExtraInitializers);
		this.config = config;
	}
	async remoteExportExplain(agent, command) {
		const sessionId = agent?.session?.id;
		const llm = this.ctx.get("llm");
		return explainCommand(this.ctx, llm, this.config, command, sessionId);
	}
};
function apply(ctx, rawConfig) {
	const config = resolveConfig(rawConfig);
	new CommandExplainerService(ctx, config);
}

//#endregion
export { DEFAULT_PROMPT, apply, inject, name };