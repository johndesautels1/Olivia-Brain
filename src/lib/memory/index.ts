// Memory module exports
// Sprint 1.3 - Memory & Personalization

export { getConversationStore } from "./store";
export type { ConversationTurn } from "./store";

export { getMem0Service } from "./mem0";
export type { Mem0Memory, AddMemoryOptions, SearchMemoryOptions, Mem0Service } from "./mem0";

export { getEmbeddingsService } from "./embeddings";
export type { EmbeddingResult, EmbeddingsService } from "./embeddings";

export { getKnowledgeService } from "./knowledge";
export type {
  KnowledgeChunk,
  AddKnowledgeOptions,
  SearchKnowledgeOptions,
  SearchResult,
  KnowledgeService,
} from "./knowledge";

export { getSemanticSearchService } from "./semantic-search";
export type {
  ConversationSearchResult,
  SemanticSearchOptions,
  SemanticSearchService,
} from "./semantic-search";

export { getTTLService, DEFAULT_TTL_CONFIG, MEMORY_TYPE_TTL } from "./ttl";
export type { TTLCleanupResult, TTLConfig, TTLService } from "./ttl";

export { getGraphPersistenceService } from "./graph-persistence";
export type {
  GraphPersistenceService,
  SaveEntityOptions,
  SaveRelationshipOptions,
  FindEntitiesOptions,
  GetNeighborsOptions,
  NeighborResult,
  TraversalOptions,
  TraversalResult,
  GraphStats,
} from "./graph-persistence";

export { getEpisodicMemoryService } from "./episodic";
export type {
  Episode,
  CreateEpisodeOptions,
  FindEpisodesOptions,
  EpisodeTimelineOptions,
  EpisodicMemoryService,
} from "./episodic";
