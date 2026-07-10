/*---------------------------------------------------------------------------------------------
 *  Copyright (c) Microsoft Corporation. All rights reserved.
 *  Licensed under the MIT License. See License.txt in the project root for license information.
 *--------------------------------------------------------------------------------------------*/

import type { ReasoningEffort } from './protocol/generated/ReasoningEffort.js';
import type { ReasoningSummary } from './protocol/generated/ReasoningSummary.js';
import type { Personality } from './protocol/generated/Personality.js';
import type { WebSearchMode } from './protocol/generated/WebSearchMode.js';
import type { ModeKind } from './protocol/generated/ModeKind.js';
import type { SandboxMode } from './protocol/generated/v2/SandboxMode.js';
import { CodexSessionConfigKey, narrowCodexPermissionsPreset, resolveCodexPermissionsPreset, type CodexApprovalPolicy, type ICodexResolvedPermissions } from '../../common/codexSessionConfigKeys.js';

// Re-export the shared, protocol-free config-key surface so node callers can
// keep importing everything from this module.
export { CodexSessionConfigKey, resolveCodexPermissionsPreset, narrowCodexPermissionsPreset, CODEX_PERMISSIONS_PRESETS, CODEX_DEFAULT_PERMISSIONS_PRESET } from '../../common/codexSessionConfigKeys.js';
export type { CodexApprovalPolicy, CodexPermissionsPreset, CodexSandboxMode, CodexApprovalsReviewer, ICodexResolvedPermissions } from '../../common/codexSessionConfigKeys.js';

export function narrowApprovalPolicy(value: unknown): CodexApprovalPolicy | undefined {
	switch (value) {
		case 'never':
		case 'on-request':
		case 'on-failure':
		case 'untrusted':
			return value;
		default:
			return undefined;
	}
}

export function narrowSandboxMode(value: unknown): SandboxMode | undefined {
	switch (value) {
		case 'read-only':
		case 'workspace-write':
		case 'danger-full-access':
			return value;
		default:
			return undefined;
	}
}

/**
 * Resolve the Codex security axes (approval policy, sandbox, approvals
 * reviewer) for a session's stored config values.
 *
 * The user-facing {@link CodexSessionConfigKey.PermissionsPreset} is the source
 * of truth; when present it expands into all three axes. For backward
 * compatibility (older sessions / programmatic config) we fall back to the
 * individual {@link CodexSessionConfigKey.ApprovalPolicy} /
 * {@link CodexSessionConfigKey.SandboxMode} keys with a `user` reviewer.
 */
export function resolveCodexPermissions(
	values: Record<string, unknown> | undefined,
	defaults: { approvalPolicy: CodexApprovalPolicy; sandboxMode: SandboxMode },
): ICodexResolvedPermissions {
	const preset = narrowCodexPermissionsPreset(values?.[CodexSessionConfigKey.PermissionsPreset]);
	if (preset) {
		return resolveCodexPermissionsPreset(preset);
	}
	return {
		approvalPolicy: narrowApprovalPolicy(values?.[CodexSessionConfigKey.ApprovalPolicy]) ?? defaults.approvalPolicy,
		sandboxMode: narrowSandboxMode(values?.[CodexSessionConfigKey.SandboxMode]) ?? defaults.sandboxMode,
		approvalsReviewer: 'user',
	};
}

export function narrowAdditionalDirectories(value: unknown): readonly string[] | undefined {
	if (!Array.isArray(value)) {
		return undefined;
	}
	return value.filter((entry): entry is string => typeof entry === 'string' && entry.length > 0);
}

export function narrowBoolean(value: unknown): boolean | undefined {
	return typeof value === 'boolean' ? value : undefined;
}

export function narrowWebSearchMode(value: unknown): WebSearchMode | undefined {
	switch (value) {
		case 'disabled':
		case 'cached':
		case 'live':
			return value;
		default:
			return undefined;
	}
}

export function narrowReasoningEffort(value: unknown): ReasoningEffort | undefined {
	switch (value) {
		case 'none':
		case 'minimal':
		case 'low':
		case 'medium':
		case 'high':
		case 'xhigh':
			return value;
		default:
			return undefined;
	}
}

export function narrowPersonality(value: unknown): Personality | undefined {
	switch (value) {
		case 'none':
		case 'friendly':
		case 'pragmatic':
			return value;
		default:
			return undefined;
	}
}

export function narrowReasoningSummary(value: unknown): ReasoningSummary | undefined {
	switch (value) {
		case 'auto':
		case 'concise':
		case 'detailed':
		case 'none':
			return value;
		default:
			return undefined;
	}
}

/**
 * Map the platform-generic {@link SessionMode} (Agent Mode) to codex's native
 * collaboration {@link ModeKind}: VS Code "Plan" → codex `plan`, "Interactive"
 * → codex `default`.
 */
export function collaborationModeKind(value: unknown): ModeKind {
	return value === 'plan' ? 'plan' : 'default';
}
