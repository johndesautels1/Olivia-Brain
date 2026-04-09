/**
 * BRIDGE PROTOCOL — Universal Knowledge Protocol (UKP)
 *
 * The bridge layer connects Olivia Brain to any knowledge provider.
 * Olivia speaks ONE language. Apps adapt to her, not vice versa.
 *
 * Usage:
 * ```typescript
 * import { knowledgeRegistry, type UniversalKnowledgeProvider } from '@/lib/bridge';
 *
 * // Register a provider
 * await knowledgeRegistry.register(myProvider, { mode: 'embedded' });
 *
 * // Query through the registry
 * const result = await knowledgeRegistry.routeQuery('relocation', { query: 'What are my top cities?' });
 * ```
 */

// Types
export type {
  // Core primitives
  Capability,
  TermDefinition,
  // Flows
  Flow,
  FlowStep,
  FlowTransition,
  FlowCondition,
  FlowState,
  // Questions
  UKPQuestion,
  QuestionType,
  QuestionOption,
  QuestionValidation,
  AnswerResult,
  AnswerEffect,
  QuestionProgress,
  ModuleProgress,
  // Data & Queries
  NaturalLanguageQuery,
  QueryContext,
  QueryResult,
  DataSource,
  UserData,
  AppResults,
  Recommendation,
  // Actions
  UKPAction,
  ActionParameter,
  ActionResult,
  // Outputs
  OutputType,
  GeneratedOutput,
  // Events
  AppEvent,
  EventCallback,
  // Provider
  ProviderMetadata,
  UniversalKnowledgeProvider,
} from './types';

// Registry
export {
  KnowledgeRegistry,
  knowledgeRegistry,
  type ProviderMode,
  type RegistrationOptions,
} from './registry';
