window.__ModuleLoader__.load({ id: "dsh-command-approval-view", factory: (require) => {
var module = { exports: {} }; var exports = module.exports;
//#region rolldown:runtime
var __create = Object.create;
var __defProp = Object.defineProperty;
var __getOwnPropDesc = Object.getOwnPropertyDescriptor;
var __getOwnPropNames = Object.getOwnPropertyNames;
var __getProtoOf = Object.getPrototypeOf;
var __hasOwnProp = Object.prototype.hasOwnProperty;
var __copyProps = (to, from, except, desc) => {
	if (from && typeof from === "object" || typeof from === "function") for (var keys = __getOwnPropNames(from), i = 0, n = keys.length, key; i < n; i++) {
		key = keys[i];
		if (!__hasOwnProp.call(to, key) && key !== except) __defProp(to, key, {
			get: ((k) => from[k]).bind(null, key),
			enumerable: !(desc = __getOwnPropDesc(from, key)) || desc.enumerable
		});
	}
	return to;
};
var __toESM = (mod, isNodeMode, target) => (target = mod != null ? __create(__getProtoOf(mod)) : {}, __copyProps(isNodeMode || !mod || !mod.__esModule ? __defProp(target, "default", {
	value: mod,
	enumerable: true
}) : target, mod));

//#endregion
const react = __toESM(require("react"));

//#region src/client/index.ts
const CSS = ".dsh-cav-root{padding:8px calc(var(--dsh-composer-side-clearance) + 16px) 12px;flex-direction:column;align-items:center;display:flex;max-height:100%;min-height:0;box-sizing:border-box}.dsh-cav-card{width:100%;max-width:var(--dsh-chat-content-width);border:1px solid var(--dsw-alias-state-warn-secondary);background:var(--dsw-specific-input-major);box-shadow:var(--dsw-shadow-lv2);--dsh-scrollbar-thumb:var(--dsw-alias-scrollbar-bg-l2);--dsh-scrollbar-thumb-hover:var(--dsw-alias-scrollbar-hover-l2);border-radius:20px;overflow:hidden;display:flex;flex-direction:column;max-height:min(560px,100vh - 160px)}.dsh-cav-strip{background:var(--dsw-alias-state-warn-tertiary);color:var(--dsw-alias-state-warn-primary);align-items:center;gap:8px;padding:10px 16px;font-size:13px;line-height:18px;display:flex;flex:none}.dsh-cav-dot{background:var(--dsw-alias-state-warn-primary);border-radius:50%;width:8px;height:8px;flex:none}.dsh-cav-body{box-sizing:border-box;flex:1 1 auto;min-height:0;flex-direction:column;gap:6px;padding:12px 16px;display:flex;overflow-y:auto}.dsh-cav-headline{color:var(--dsw-alias-label-primary);font-size:15px;font-weight:500;line-height:24px}.dsh-cav-cmd{color:var(--dsw-alias-label-tertiary);font-family:var(--ds-font-family-code);font-size:13px;line-height:20px;margin:0;white-space:pre-wrap;word-break:break-word}.dsh-cav-actionRow{justify-content:flex-end;gap:8px;padding:14px 16px;display:flex;flex:none}.dsh-cav-btn{border-radius:9999px;font-size:13px;line-height:18px;padding:6px 14px;cursor:pointer;border:1px solid transparent}.dsh-cav-btn:disabled{opacity:.5;cursor:default}.dsh-cav-reject{background:transparent;color:var(--dsw-alias-label-secondary);border-color:var(--dsw-alias-border-l2)}.dsh-cav-reject:hover:not(:disabled){background:var(--dsw-alias-interactive-bg-hover-danger);color:var(--dsw-alias-state-error-primary);border-color:transparent}.dsh-cav-allow{background:var(--dsw-alias-brand-primary);color:var(--dsw-alias-label-primary-inverted)}.dsh-cav-allow:hover:not(:disabled){background:var(--dsw-alias-button-primary-hover)}.dsh-cav-tok-cmd{color:var(--dsw-alias-brand-primary);font-weight:500}.dsh-cav-tok-opt{color:var(--dsw-alias-state-success-primary)}.dsh-cav-tok-str{color:var(--dsw-alias-state-warn-primary)}.dsh-cav-tok-env{color:var(--dsw-alias-state-warn-primary);font-weight:500}.dsh-cav-tok-op{color:var(--dsw-alias-state-error-primary);font-weight:600}.dsh-cav-tok-comment,.dsh-cav-tok-cont{color:var(--dsw-alias-label-tertiary);font-style:italic}.dsh-cav-tok-arg{color:var(--dsw-alias-label-primary)}";
function readCommand(snapshot, callId) {
	if (callId === void 0 || snapshot === null || snapshot === void 0) return void 0;
	const nodes = snapshot?.chat?.nodes;
	if (!nodes || typeof nodes.get !== "function") return void 0;
	const node = nodes.get("9:tool-call" + callId);
	if (!node || node.kind !== "tool-call") return void 0;
	const root = node.data?.root;
	if (!root || root.callId !== callId) return void 0;
	if ("kind" in root && root.kind) return void 0;
	try {
		const args = JSON.parse(root.argsRaw ?? "{}");
		return typeof args.command === "string" ? args.command : void 0;
	} catch {
		return void 0;
	}
}
function tokenize(src) {
	const tokens = [];
	const n = src.length;
	let i = 0;
	let segStart = true;
	const KEYWORDS = {
		sudo: 1,
		cd: 1,
		export: 1,
		echo: 1,
		if: 1,
		then: 1,
		else: 1,
		elif: 1,
		fi: 1,
		for: 1,
		do: 1,
		done: 1,
		while: 1,
		case: 1,
		esac: 1,
		function: 1,
		source: 1,
		set: 1,
		unset: 1,
		env: 1,
		exec: 1,
		trap: 1,
		return: 1,
		exit: 1
	};
	const isSpace = (c) => c === " " || c === "	" || c === "\n" || c === "\r";
	const isWordChar = (c) => /[A-Za-z0-9_.\/\-]/.test(c);
	while (i < n) {
		const ch = src[i];
		if (ch === "#") {
			let j = i;
			while (j < n && src[j] !== "\n") j++;
			tokens.push(["comment", src.slice(i, j)]);
			i = j;
			continue;
		}
		if (isSpace(ch)) {
			let j = i;
			while (j < n && isSpace(src[j])) j++;
			const ws = src.slice(i, j);
			if (ws.indexOf("\n") !== -1) segStart = true;
			tokens.push(["ws", ws]);
			i = j;
			continue;
		}
		if (ch === "\"" || ch === "'") {
			const q = ch;
			let j = i + 1;
			while (j < n) {
				if (src[j] === "\\") {
					j += 2;
					continue;
				}
				if (src[j] === q) {
					j++;
					break;
				}
				j++;
			}
			tokens.push(["str", src.slice(i, j)]);
			i = j;
			segStart = false;
			continue;
		}
		if (ch === "\\" && (i + 1 >= n || src[i + 1] === "\n" || src[i + 1] === "\r")) {
			tokens.push(["cont", "\\"]);
			i++;
			continue;
		}
		const two = src.slice(i, i + 2);
		if (two === "&&" || two === "||" || two === ">>") {
			tokens.push(["op", two]);
			i += 2;
			segStart = true;
			continue;
		}
		if (ch === "|" || ch === ";" || ch === "&" || ch === ">" || ch === "<") {
			tokens.push(["op", ch]);
			i++;
			segStart = true;
			continue;
		}
		if (ch === "$") {
			let j = i + 1;
			if (j < n && src[j] === "{") {
				while (j < n && src[j] !== "}") j++;
				if (j < n) j++;
			} else while (j < n && /[A-Za-z0-9_?!#$@*\-]/.test(src[j])) j++;
			if (j > i + 1) {
				tokens.push(["env", src.slice(i, j)]);
				i = j;
			} else {
				tokens.push(["arg", "$"]);
				i++;
			}
			segStart = false;
			continue;
		}
		if (ch === "-") {
			let j = i + 1;
			let isOpt = false;
			if (j < n && src[j] === "-") {
				j++;
				isOpt = true;
			} else if (j < n && /[A-Za-z0-9]/.test(src[j])) isOpt = true;
			if (isOpt) {
				while (j < n && /[A-Za-z0-9_\-]/.test(src[j])) j++;
				tokens.push(["opt", src.slice(i, j)]);
				i = j;
			} else {
				tokens.push(["arg", "-"]);
				i++;
			}
			segStart = false;
			continue;
		}
		if (isWordChar(ch)) {
			let j = i;
			while (j < n && isWordChar(src[j])) j++;
			const text = src.slice(i, j);
			if (segStart || KEYWORDS[text]) {
				tokens.push(["cmd", text]);
				segStart = false;
			} else tokens.push(["arg", text]);
			i = j;
			continue;
		}
		tokens.push(["arg", ch]);
		i++;
		segStart = false;
	}
	return tokens;
}
function highlight(command) {
	return react.default.createElement("pre", { className: "dsh-cav-cmd" }, tokenize(command).map((tok, idx) => {
		if (tok[0] === "ws") return tok[1];
		return react.default.createElement("span", {
			key: idx,
			className: "dsh-cav-tok-" + tok[0]
		}, tok[1]);
	}));
}
function selectApproval(owner) {
	const interactions = owner?.interactions;
	if (!Array.isArray(interactions)) return null;
	for (const it of interactions) if (it !== null && it !== void 0 && it.kind === "approval") return it;
	return null;
}
function ApprovalView(props) {
	const p = props;
	const wait = p.matched;
	if (!wait) return null;
	const command = p.useSession ? p.useSession((snapshot) => readCommand(snapshot, wait.payload?.callId)) : void 0;
	const [answered, setAnswered] = react.default.useState(false);
	const answer = (outcome) => {
		setAnswered(true);
		if (wait && typeof wait.respond === "function") wait.respond({
			ok: true,
			value: {
				sessionId: wait.sessionId,
				approvalId: wait.payload?.approvalId,
				outcome
			}
		}).then((receipt) => {
			if (!(receipt && receipt.accepted)) setAnswered(false);
		}).catch(() => setAnswered(false));
		else setAnswered(false);
	};
	const reason = wait.payload?.reason;
	const headline = reason !== void 0 && reason !== null && reason !== "" ? reason : "请求确认执行：" + (wait.payload?.toolName || "");
	return react.default.createElement("div", {
		className: "dsh-cav-root",
		"data-approval-key": wait.key
	}, react.default.createElement("div", { className: "dsh-cav-card" }, react.default.createElement("div", { className: "dsh-cav-strip" }, react.default.createElement("span", { className: "dsh-cav-dot" }), "待确认执行命令"), react.default.createElement("div", {
		className: "dsh-cav-body",
		"data-approval-scroll": "",
		tabIndex: 0,
		role: "group",
		"aria-label": "命令确认详情"
	}, react.default.createElement("div", { className: "dsh-cav-headline" }, headline), command !== void 0 ? highlight(command) : null), react.default.createElement("div", { className: "dsh-cav-actionRow" }, react.default.createElement("button", {
		type: "button",
		className: "dsh-cav-btn dsh-cav-reject",
		disabled: answered,
		onClick: () => answer("rejected")
	}, "拒绝"), react.default.createElement("button", {
		type: "button",
		className: "dsh-cav-btn dsh-cav-allow",
		disabled: answered,
		onClick: () => answer("allowed-once")
	}, "允许一次"))));
}
const name = "command-approval-view";
const inject = ["slots"];
function apply(ctx) {
	const slots = ctx.get("slots");
	if (!slots) return;
	ctx.effect(() => {
		const el = document.createElement("style");
		el.setAttribute("data-dsh-cav", "");
		el.textContent = CSS;
		document.head.appendChild(el);
		return () => el.remove();
	}, "dsh-command-approval-view: styles");
	slots.inject("conversation.composer", () => {
		return slots.register({
			name: "conversation.composer",
			select: selectApproval,
			priority: -100
		}, ApprovalView);
	});
}
module.exports = {
	name,
	inject,
	apply
};

//#endregion
return module.exports; } });
//# sourceMappingURL=client.js.map