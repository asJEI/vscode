/*---------------------------------------------------------------------------------------------
 *  Copyright (c) Microsoft Corporation. All rights reserved.
 *  Licensed under the MIT License. See License.txt in the project root for license information.
 *--------------------------------------------------------------------------------------------*/

import assert from 'assert';
import type { DisposableStore } from '../../../../../base/common/lifecycle.js';
import { ensureNoDisposablesAreLeakedInTestSuite } from '../../../../../base/test/common/utils.js';
import { CodexSessionConfigKey, collaborationModeKind, narrowAdditionalDirectories, narrowApprovalPolicy, narrowBoolean, narrowCodexPermissionsPreset, narrowPersonality, narrowReasoningEffort, narrowReasoningSummary, narrowSandboxMode, narrowWebSearchMode, resolveCodexPermissions, resolveCodexPermissionsPreset } from '../../../node/codex/codexSessionConfigKeys.js';
import { TestInstantiationService } from '../../../../../platform/instantiation/test/common/instantiationServiceMock.js';
import { ILogService, NullLogService } from '../../../../../platform/log/common/log.js';
import { IProductService } from '../../../../../platform/product/common/productService.js';
import { ISessionDataService } from '../../../common/sessionDataService.js';
import { CodexAgent } from '../../../node/codex/codexAgent.js';
import { ICodexProxyService } from '../../../node/codex/codexProxyService.js';
import { IAgentConfigurationService } from '../../../node/agentConfigurationService.js';
import { IAgentSdkDownloader } from '../../../node/agentSdkDownloader.js';
import { ICopilotApiService } from '../../../node/shared/copilotApiService.js';
import { SessionConfigKey } from '../../../common/sessionConfigKeys.js';

function createAgent(disposables: Pick<DisposableStore, 'add'>): CodexAgent {
	const instantiationService = new TestInstantiationService();
	instantiationService.stub(ISessionDataService, { _serviceBrand: undefined });
	instantiationService.stub(ICopilotApiService, { _serviceBrand: undefined });
	instantiationService.stub(ICodexProxyService, { _serviceBrand: undefined });
	instantiationService.stub(IAgentConfigurationService, { _serviceBrand: undefined });
	instantiationService.stub(IAgentSdkDownloader, { _serviceBrand: undefined });
	instantiationService.stub(IProductService, { _serviceBrand: undefined, version: '1.0.0-test' } as IProductService);
	instantiationService.stub(ILogService, new NullLogService());
	return disposables.add(instantiationService.createInstance(CodexAgent));
}

suite('codexSessionConfigKeys', () => {

	const disposables = ensureNoDisposablesAreLeakedInTestSuite();

	test('narrows valid values and rejects invalid values', () => {
		assert.deepStrictEqual({
			approvalPolicy: [narrowApprovalPolicy('never'), narrowApprovalPolicy('on-request'), narrowApprovalPolicy('nope')],
			sandboxMode: [narrowSandboxMode('read-only'), narrowSandboxMode('workspace-write'), narrowSandboxMode('folder')],
			permissionsPreset: [narrowCodexPermissionsPreset('default'), narrowCodexPermissionsPreset('full-access'), narrowCodexPermissionsPreset('yolo')],
			additionalDirectories: [narrowAdditionalDirectories(['/tmp/a', '', 1, '/tmp/b']), narrowAdditionalDirectories('nope')],
			boolean: [narrowBoolean(true), narrowBoolean(false), narrowBoolean('true')],
			webSearchMode: [narrowWebSearchMode('disabled'), narrowWebSearchMode('cached'), narrowWebSearchMode('online')],
			reasoningEffort: [narrowReasoningEffort('minimal'), narrowReasoningEffort('medium'), narrowReasoningEffort('max')],
			personality: [narrowPersonality('friendly'), narrowPersonality('pragmatic'), narrowPersonality('grumpy')],
			reasoningSummary: [narrowReasoningSummary('auto'), narrowReasoningSummary('detailed'), narrowReasoningSummary('verbose')],
			collaborationMode: [collaborationModeKind('plan'), collaborationModeKind('interactive'), collaborationModeKind(undefined)],
		}, {
			approvalPolicy: ['never', 'on-request', undefined],
			sandboxMode: ['read-only', 'workspace-write', undefined],
			permissionsPreset: ['default', 'full-access', undefined],
			additionalDirectories: [['/tmp/a', '/tmp/b'], undefined],
			boolean: [true, false, undefined],
			webSearchMode: ['disabled', 'cached', undefined],
			reasoningEffort: ['minimal', 'medium', undefined],
			personality: ['friendly', 'pragmatic', undefined],
			reasoningSummary: ['auto', 'detailed', undefined],
			collaborationMode: ['plan', 'default', 'default'],
		});
	});

	test('expands permissions presets and falls back to legacy axes', () => {
		const legacyDefaults = { approvalPolicy: 'on-request' as const, sandboxMode: 'workspace-write' as const };
		assert.deepStrictEqual({
			presets: {
				default: resolveCodexPermissionsPreset('default'),
				autoReview: resolveCodexPermissionsPreset('auto-review'),
				fullAccess: resolveCodexPermissionsPreset('full-access'),
			},
			// A stored preset is the source of truth and expands to all three axes.
			fromPreset: resolveCodexPermissions({ [CodexSessionConfigKey.PermissionsPreset]: 'full-access' }, legacyDefaults),
			// Without a preset, legacy per-axis keys are honored with a `user` reviewer.
			fromLegacyKeys: resolveCodexPermissions({ [CodexSessionConfigKey.SandboxMode]: 'read-only', [CodexSessionConfigKey.ApprovalPolicy]: 'never' }, legacyDefaults),
			// Empty config falls back entirely to the provided defaults.
			fromDefaults: resolveCodexPermissions(undefined, legacyDefaults),
		}, {
			presets: {
				default: { approvalPolicy: 'on-request', sandboxMode: 'workspace-write', approvalsReviewer: 'user' },
				autoReview: { approvalPolicy: 'on-request', sandboxMode: 'workspace-write', approvalsReviewer: 'auto_review' },
				fullAccess: { approvalPolicy: 'never', sandboxMode: 'danger-full-access', approvalsReviewer: 'user' },
			},
			fromPreset: { approvalPolicy: 'never', sandboxMode: 'danger-full-access', approvalsReviewer: 'user' },
			fromLegacyKeys: { approvalPolicy: 'never', sandboxMode: 'read-only', approvalsReviewer: 'user' },
			fromDefaults: { approvalPolicy: 'on-request', sandboxMode: 'workspace-write', approvalsReviewer: 'user' },
		});
	});

	test('resolveSessionConfig exposes a single permissions-preset chip', async () => {
		const agent = createAgent(disposables);

		const defaulted = await agent.resolveSessionConfig({ config: {} });
		const fullAccess = await agent.resolveSessionConfig({ config: { [CodexSessionConfigKey.PermissionsPreset]: 'full-access' } });

		assert.deepStrictEqual({
			// The visible schema is reduced to Mode + one permissions preset + Permissions.
			schemaProperties: Object.keys(defaulted.schema.properties).sort(),
			// Codex drops "Autopilot" (no native equivalent — it would duplicate
			// "Interactive"), so the Mode picker offers only interactive + plan.
			modeEnum: defaulted.schema.properties[SessionConfigKey.Mode].enum,
			defaultedValues: {
				mode: defaulted.values[SessionConfigKey.Mode],
				preset: defaulted.values[CodexSessionConfigKey.PermissionsPreset],
			},
			// The preset is session-mutable and echoed back unchanged.
			fullAccessPreset: fullAccess.values[CodexSessionConfigKey.PermissionsPreset],
		}, {
			schemaProperties: [SessionConfigKey.Mode, CodexSessionConfigKey.PermissionsPreset, SessionConfigKey.Permissions].sort(),
			modeEnum: ['interactive', 'plan'],
			defaultedValues: { mode: 'interactive', preset: 'default' },
			fullAccessPreset: 'full-access',
		});
	});
});
