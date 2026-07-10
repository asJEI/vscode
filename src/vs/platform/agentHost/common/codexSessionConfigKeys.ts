/*---------------------------------------------------------------------------------------------
 *  Copyright (c) Microsoft Corporation. All rights reserved.
 *  Licensed under the MIT License. See License.txt in the project root for license information.
 *--------------------------------------------------------------------------------------------*/

/**
 * Well-known session-config keys advertised by the agent-host Codex provider
 * in its `resolveSessionConfig` schema.
 *
 * This file is intentionally protocol-free (no imports from the generated
 * `node/protocol` types) so it can be shared with the browser pickers, which
 * cannot import from the `node` layer. The string-literal unions below are
 * declared to match — and are structurally assignable to — the corresponding
 * generated Codex app-server types (`AskForApproval`, `SandboxMode`,
 * `ApprovalsReviewer`). Protocol-typed narrowing helpers live alongside the
 * node agent in `node/codex/codexSessionConfigKeys.ts`.
 */
export const enum CodexSessionConfigKey {
	PermissionsPreset = 'codex.permissionsPreset',
	ApprovalPolicy = 'codex.approvalPolicy',
	SandboxMode = 'codex.sandboxMode',
	AdditionalDirectories = 'codex.additionalDirectories',
	NetworkAccessEnabled = 'codex.networkAccessEnabled',
	WebSearchMode = 'codex.webSearchMode',
	ModelReasoningEffort = 'codex.modelReasoningEffort',
	Personality = 'codex.personality',
	ReasoningSummary = 'codex.reasoningSummary',
}

/** Subset of the generated `AskForApproval` union that VS Code exposes. */
export type CodexApprovalPolicy = 'never' | 'on-request' | 'on-failure' | 'untrusted';

/** Mirrors the generated `SandboxMode` union. */
export type CodexSandboxMode = 'read-only' | 'workspace-write' | 'danger-full-access';

/** Mirrors the generated `ApprovalsReviewer` union. */
export type CodexApprovalsReviewer = 'user' | 'auto_review' | 'guardian_subagent';

/**
 * Codex collapses its three security axes (sandbox × approval policy ×
 * approvals reviewer) into a single user-facing "permissions" preset, matching
 * the selector in the Codex app and IDE extension.
 *
 * @see https://developers.openai.com/codex/concepts/sandboxing#how-you-control-it
 */
export type CodexPermissionsPreset = 'default' | 'auto-review' | 'full-access';

/** Ordered preset list advertised in the Codex session-config schema. */
export const CODEX_PERMISSIONS_PRESETS: readonly CodexPermissionsPreset[] = ['default', 'auto-review', 'full-access'];

/** Default preset applied to new Codex sessions. */
export const CODEX_DEFAULT_PERMISSIONS_PRESET: CodexPermissionsPreset = 'default';

/**
 * Single source of truth for narrowing an arbitrary runtime value to the
 * closed {@link CodexPermissionsPreset} union. Returns `undefined` for
 * non-strings or unmatched strings; callers apply their own fallback.
 */
export function narrowCodexPermissionsPreset(raw: unknown): CodexPermissionsPreset | undefined {
	switch (raw) {
		case 'default':
		case 'auto-review':
		case 'full-access':
			return raw;
		default:
			return undefined;
	}
}

export interface ICodexResolvedPermissions {
	readonly approvalPolicy: CodexApprovalPolicy;
	readonly sandboxMode: CodexSandboxMode;
	readonly approvalsReviewer: CodexApprovalsReviewer;
}

/**
 * Expand a {@link CodexPermissionsPreset} into the three underlying Codex
 * security axes sent to the app-server (`approvalPolicy`, `sandbox`,
 * `approvalsReviewer`).
 */
export function resolveCodexPermissionsPreset(preset: CodexPermissionsPreset): ICodexResolvedPermissions {
	switch (preset) {
		case 'auto-review':
			// Same workspace-write sandbox as `default`, but on-request approvals
			// are routed through the auto-reviewer instead of a UI prompt.
			return { approvalPolicy: 'on-request', sandboxMode: 'workspace-write', approvalsReviewer: 'auto_review' };
		case 'full-access':
			return { approvalPolicy: 'never', sandboxMode: 'danger-full-access', approvalsReviewer: 'user' };
		case 'default':
		default:
			return { approvalPolicy: 'on-request', sandboxMode: 'workspace-write', approvalsReviewer: 'user' };
	}
}
