// @ts-nocheck
/* eslint-disable */
// Built from src/index.ts so plain node can run the kit. Do not edit.
import { noteKitModuleEvalDone } from "./kitFootprint.js";
import { boosthis, normalizePath } from "./middleware.js";
import {
  setDeclaredAiEndpoints,
  declaredAiEndpointCount,
  MAX_DECLARED_AI_ENDPOINTS
} from "./aiProviders.js";
import {
  setDeclaredWaits,
  DECLARED_WAIT_NAME_CAP
} from "./declaredWaits.js";
import {
  announceKitStart,
  announceProjectKey,
  findProjectKeyProblem,
  kitStartupLine,
  projectKeyRefusalLine,
  projectKeyTail,
  warnProjectKeyRefused,
  _resetStartAnnounceForTests
} from "./startAnnounce.js";
import {
  TRACE_HEADER,
  TRACE_ID_RE,
  isValidTraceId,
  newTraceId,
  sanitizeTraceId,
  adoptTraceId,
  traceHeaders,
  getTraceId,
  forwardTraceHeaders
} from "./trace.js";
import {
  PARENT_HEADER,
  SPAN_ID_RE,
  isValidSpanId,
  newSpanId,
  sanitizeSpanId,
  adoptParentSpanId,
  currentSpanId,
  beginSpan,
  runInSpan
} from "./spanScope.js";
import { getSpanId } from "./trace.js";
import {
  flushSpansNow,
  spanLabel,
  rateSpanDuration,
  _spanInternals
} from "./spanEmitter.js";
import {
  reportJobRun,
  flushJobRunsNow,
  jobName,
  MAX_JOB_NAME,
  MAX_JOB_RUN_BATCH,
  _jobInternals
} from "./jobReporter.js";
import {
  registerApp,
  registerRoutes,
  getDeclaredRoutes,
  routeListReport,
  routeListEnabled,
  readFrameworkRoutes,
  MAX_ROUTE_LIST_ENTRIES,
  ROUTE_SOURCE_WORDS,
  _resetRouteInventoryForTests
} from "./routeInventory.js";
import { mount } from "./mount.js";
import { attach, attachState, cannotAttachLine } from "./serverAttach.js";
import {
  detectServerKind,
  serverKindLabel,
  SERVER_KINDS,
  isServerKind
} from "./serverKind.js";
import {
  PULSE_PATH,
  PANEL_PATH,
  computePulse,
  computePanel,
  computePanelNotice,
  resolveBubbleVisibility,
  isDevProcess,
  injectIntoHtml,
  wrapResponseForInjection,
  bubbleSnippet,
  BUBBLE_SNIPPET,
  FIRST_REPORT_WAIT_TEXT
} from "./bubble.js";
import { trackPerf, perf } from "./trackPerf.js";
import { recordOutboundAttempt } from "./liveDetectors.js";
import { trackJob, beginJob, expectEvery, JOB_PREFIX } from "./jobWork.js";
import { declarePromise } from "./promiseDeclaration.js";
import { boosthisWorker, workerStatusText } from "./worker.js";
import { mcpTool, registerMcpTools } from "./mcpMeasure.js";
import {
  record,
  recent,
  summary,
  clear
} from "./samples.js";
import {
  statusFor,
  allStatuses,
  regressions,
  isJudgedBudget,
  BASELINE_N,
  RECENT_N,
  BUDGET_WARMUP_N,
  BUDGET_BASELINE_N,
  BUDGET_RECENT_N,
  BUDGET_SAMPLES_FOR_VERDICT,
  BUDGET_ALGORITHM,
  REGRESSION_FACTOR,
  IMPROVEMENT_FACTOR
} from "./budgets.js";
import {
  PII_DENYLIST,
  PIIDetectedError,
  assertNoPII,
  checkNoPII
} from "./no-pii.js";
import { safeTransmit } from "./transmit.js";
import {
  SCORE_THRESHOLDS,
  RUNTIME_VERSION,
  rateDuration
} from "./thresholds.js";
import { isBoosthisDisabled } from "./runtimeFlags.js";
import {
  resolveProjectKey,
  maskProjectKey,
  describeProjectKeySource
} from "./projectKey.js";
import {
  isRuntimeInert,
  isActivated,
  getEntitlementStatus,
  getEntitlementMessage,
  getEntitlementGateKind,
  subscribeEntitlement,
  checkEntitlementNow,
  forceEntitlementCheck,
  startEntitlementCheckin,
  stopEntitlementCheckin
} from "./killSwitch.js";
import {
  enableTelemetry,
  getRegistrationRejection,
  DEFAULT_TELEMETRY_ENDPOINT
} from "./telemetry.js";
import {
  capturePerfSnapshot,
  uploadPerfSnapshotNow,
  readNow,
  READING_TRIGGER_ON_DEMAND,
  nextSnapshotDelayMs,
  SNAPSHOT_FLUSH_MS
} from "./snapshot.js";
import {
  reportErrorPage,
  errorPages,
  fastifyErrorPages,
  honoErrorPages,
  koaErrorPages,
  hapiErrorPages,
  onRequestError
} from "./errorPages.js";
import {
  signatureFor,
  ingestFindings,
  listCandidateRules,
  listSurfaceable,
  promoteCandidateLocal,
  clearAllCandidates
} from "./candidateRules.js";
import { collectFindings, reportNow } from "./reporting.js";
import {
  EXIT_ACTIVATION_TIMEOUT_MS,
  EXIT_FLUSH_BUDGET_MS,
  exitFlushArmed,
  lastExitActivationOutcome,
  installExitFlush,
  lastExitFlushResult,
  runExitFlush
} from "./exitFlush.js";
import {
  isServerlessMode,
  serverlessHost,
  serverlessRefusal,
  platformName,
  deriveServerlessInstallId,
  scopeHashFor,
  isProvenPlatform,
  PROVEN_PLATFORMS,
  PLATFORM_UNKNOWN,
  PLATFORM_VERCEL,
  PLATFORM_AWS_LAMBDA,
  PLATFORM_NETLIFY,
  PLATFORM_GCP_FUNCTIONS,
  PLATFORM_AZURE_FUNCTIONS,
  PLATFORM_CLOUD_RUN,
  PLATFORM_FIREBASE_APP_HOSTING,
  PLATFORM_CLOUDFLARE_WORKERS,
  PLATFORM_SUPABASE_EDGE,
  isFrozenBetweenRequests,
  isPerRunBilled
} from "./serverless.js";
import {
  PLATFORM_CAPABILITIES,
  capabilitiesFor,
  availabilityOf,
  REASON_PLATFORM_DOES_NOT_EXPOSE,
  REASON_NOTHING_TO_COMPARE
} from "./serverlessPlatform.js";
import {
  withBoosthis,
  finishInvocation,
  hasAfterResponseMechanism,
  needsFlushBeforeResponse,
  flushBudgetMs,
  DEFAULT_FLUSH_BUDGET_MS,
  MAX_FLUSH_BUDGET_MS,
  FROZEN_FLUSH_BUDGET_MS
} from "./serverlessLifecycle.js";
import { serverlessCounters, readServerlessMeters } from "./serverlessMeters.js";
import {
  readKitFootprint,
  kitShouldReduce,
  KIT_COLD_START_CEILING_MS,
  KIT_PER_RUN_CEILING_MS,
  KIT_CEILING_WARN_PCT
} from "./kitFootprint.js";
import {
  deathCounters,
  waitingText,
  DEATH_SLICE_MS,
  MEMORY_NEAR_KILL_PCT,
  WAITING_UNKNOWN,
  WAITING_NETWORK,
  WAITING_DISK,
  WAITING_TIMER,
  WAITING_CHILD_PROCESS,
  WAITING_OWN_CODE
} from "./serverlessDeath.js";
import { renderMarkdownContext } from "./context.js";
noteKitModuleEvalDone();
export {
  BASELINE_N,
  BUBBLE_SNIPPET,
  BUDGET_ALGORITHM,
  BUDGET_BASELINE_N,
  BUDGET_RECENT_N,
  BUDGET_SAMPLES_FOR_VERDICT,
  BUDGET_WARMUP_N,
  DEATH_SLICE_MS,
  DECLARED_WAIT_NAME_CAP,
  DEFAULT_FLUSH_BUDGET_MS,
  DEFAULT_TELEMETRY_ENDPOINT,
  EXIT_ACTIVATION_TIMEOUT_MS,
  EXIT_FLUSH_BUDGET_MS,
  FIRST_REPORT_WAIT_TEXT,
  FROZEN_FLUSH_BUDGET_MS,
  IMPROVEMENT_FACTOR,
  JOB_PREFIX,
  KIT_CEILING_WARN_PCT,
  KIT_COLD_START_CEILING_MS,
  KIT_PER_RUN_CEILING_MS,
  MAX_DECLARED_AI_ENDPOINTS,
  MAX_FLUSH_BUDGET_MS,
  MAX_JOB_NAME,
  MAX_JOB_RUN_BATCH,
  MAX_ROUTE_LIST_ENTRIES,
  MEMORY_NEAR_KILL_PCT,
  PANEL_PATH,
  PARENT_HEADER,
  PIIDetectedError,
  PII_DENYLIST,
  PLATFORM_AWS_LAMBDA,
  PLATFORM_AZURE_FUNCTIONS,
  PLATFORM_CAPABILITIES,
  PLATFORM_CLOUDFLARE_WORKERS,
  PLATFORM_CLOUD_RUN,
  PLATFORM_FIREBASE_APP_HOSTING,
  PLATFORM_GCP_FUNCTIONS,
  PLATFORM_NETLIFY,
  PLATFORM_SUPABASE_EDGE,
  PLATFORM_UNKNOWN,
  PLATFORM_VERCEL,
  PROVEN_PLATFORMS,
  PULSE_PATH,
  READING_TRIGGER_ON_DEMAND,
  REASON_NOTHING_TO_COMPARE,
  REASON_PLATFORM_DOES_NOT_EXPOSE,
  RECENT_N,
  REGRESSION_FACTOR,
  ROUTE_SOURCE_WORDS,
  RUNTIME_VERSION,
  SCORE_THRESHOLDS,
  SERVER_KINDS,
  SNAPSHOT_FLUSH_MS,
  SPAN_ID_RE,
  TRACE_HEADER,
  TRACE_ID_RE,
  WAITING_CHILD_PROCESS,
  WAITING_DISK,
  WAITING_NETWORK,
  WAITING_OWN_CODE,
  WAITING_TIMER,
  WAITING_UNKNOWN,
  _jobInternals,
  _resetRouteInventoryForTests,
  _resetStartAnnounceForTests,
  _spanInternals,
  adoptParentSpanId,
  adoptTraceId,
  allStatuses as allBudgetStatuses,
  announceKitStart,
  announceProjectKey,
  assertNoPII,
  attach,
  attachState,
  availabilityOf,
  beginJob,
  beginSpan,
  boosthis,
  boosthisWorker,
  bubbleSnippet,
  regressions as budgetRegressions,
  statusFor as budgetStatusFor,
  cannotAttachLine,
  capabilitiesFor,
  capturePerfSnapshot,
  checkEntitlementNow,
  checkNoPII,
  clear,
  clearAllCandidates,
  collectFindings,
  computePanel,
  computePanelNotice,
  computePulse,
  currentSpanId,
  deathCounters,
  declarePromise,
  declaredAiEndpointCount,
  deriveServerlessInstallId,
  describeProjectKeySource,
  detectServerKind,
  enableTelemetry,
  errorPages,
  exitFlushArmed,
  expectEvery,
  fastifyErrorPages,
  findProjectKeyProblem,
  finishInvocation,
  flushBudgetMs,
  flushJobRunsNow,
  flushSpansNow,
  forceEntitlementCheck,
  forwardTraceHeaders,
  getDeclaredRoutes,
  getEntitlementGateKind,
  getEntitlementMessage,
  getEntitlementStatus,
  getRegistrationRejection,
  getSpanId,
  getTraceId,
  hapiErrorPages,
  hasAfterResponseMechanism,
  honoErrorPages,
  ingestFindings,
  injectIntoHtml,
  installExitFlush,
  isActivated,
  isBoosthisDisabled,
  isDevProcess,
  isFrozenBetweenRequests,
  isJudgedBudget,
  isPerRunBilled,
  isProvenPlatform,
  isRuntimeInert,
  isServerKind,
  isServerlessMode,
  isValidSpanId,
  isValidTraceId,
  jobName,
  kitShouldReduce,
  kitStartupLine,
  koaErrorPages,
  lastExitActivationOutcome,
  lastExitFlushResult,
  listCandidateRules,
  listSurfaceable,
  maskProjectKey,
  mcpTool,
  mount,
  needsFlushBeforeResponse,
  newSpanId,
  newTraceId,
  nextSnapshotDelayMs,
  normalizePath,
  onRequestError,
  perf,
  platformName,
  projectKeyRefusalLine,
  projectKeyTail,
  promoteCandidateLocal,
  rateDuration,
  rateSpanDuration,
  readFrameworkRoutes,
  readKitFootprint,
  readNow,
  readServerlessMeters,
  recent,
  record,
  recordOutboundAttempt,
  registerApp,
  registerMcpTools,
  registerRoutes,
  renderMarkdownContext,
  reportErrorPage,
  reportJobRun,
  reportNow,
  resolveBubbleVisibility,
  resolveProjectKey,
  routeListEnabled,
  routeListReport,
  runExitFlush,
  runInSpan,
  safeTransmit,
  sanitizeSpanId,
  sanitizeTraceId,
  scopeHashFor,
  serverKindLabel,
  serverlessCounters,
  serverlessHost,
  serverlessRefusal,
  setDeclaredAiEndpoints,
  setDeclaredWaits,
  signatureFor,
  spanLabel,
  startEntitlementCheckin,
  stopEntitlementCheckin,
  subscribeEntitlement,
  summary,
  traceHeaders,
  trackJob,
  trackPerf,
  uploadPerfSnapshotNow,
  waitingText,
  warnProjectKeyRefused,
  withBoosthis,
  workerStatusText,
  wrapResponseForInjection
};
