/**
 * Graph-RAG System
 *
 * Knowledge graph-enhanced RAG for multi-hop reasoning and relationship-aware retrieval.
 * Combines structured knowledge graphs with vector retrieval for richer context.
 *
 * Key features:
 * 1. Entity extraction and linking
 * 2. Relationship mapping between entities
 * 3. Multi-hop graph traversal for context
 * 4. Hybrid retrieval (vector + graph)
 * 5. Subgraph extraction for focused context
 */

// ─── Types ───────────────────────────────────────────────────────────────────

export type EntityType =
  | "person"
  | "organization"
  | "location"
  | "event"
  | "concept"
  | "product"
  | "date"
  | "metric"
  | "document"
  | "custom";

export type RelationType =
  | "related_to"
  | "part_of"
  | "located_in"
  | "works_for"
  | "owns"
  | "created_by"
  | "happened_at"
  | "causes"
  | "mentions"
  | "similar_to"
  | "contradicts"
  | "supports"
  | "custom";

export interface Entity {
  /** Unique entity identifier */
  id: string;
  /** Display name */
  name: string;
  /** Entity type */
  type: EntityType;
  /** Additional properties */
  properties: Record<string, unknown>;
  /** Embedding vector for similarity search */
  embedding?: number[];
  /** Associated text chunks */
  chunkIds: string[];
  /** Source document/URL */
  source?: string;
  /** When this entity was created/updated */
  timestamp: string;
}

export interface Relationship {
  /** Unique relationship identifier */
  id: string;
  /** Source entity ID */
  sourceId: string;
  /** Target entity ID */
  targetId: string;
  /** Relationship type */
  type: RelationType;
  /** Custom relationship label (if type is 'custom') */
  label?: string;
  /** Relationship weight/strength (0-1) */
  weight: number;
  /** Additional properties */
  properties: Record<string, unknown>;
  /** Evidence/source for this relationship */
  evidence?: string;
  /** When this relationship was created */
  timestamp: string;
}

export interface GraphChunk {
  /** Chunk identifier */
  id: string;
  /** Text content */
  content: string;
  /** Entities mentioned in this chunk */
  entityIds: string[];
  /** Embedding vector */
  embedding?: number[];
  /** Source metadata */
  source?: {
    url?: string;
    title?: string;
    page?: number;
  };
}

export interface GraphPath {
  /** Entities in the path */
  entities: Entity[];
  /** Relationships connecting them */
  relationships: Relationship[];
  /** Total path weight */
  weight: number;
  /** Number of hops */
  hops: number;
}

export interface SubgraphResult {
  /** Central/seed entities */
  seedEntities: Entity[];
  /** All entities in subgraph */
  entities: Entity[];
  /** Relationships in subgraph */
  relationships: Relationship[];
  /** Relevant chunks */
  chunks: GraphChunk[];
  /** Context summary */
  summary?: string;
}

export interface GraphQueryResult {
  /** Direct entity matches */
  directMatches: Entity[];
  /** Related entities via graph */
  relatedEntities: Entity[];
  /** Relationship paths */
  paths: GraphPath[];
  /** Relevant chunks */
  chunks: GraphChunk[];
  /** Combined context for LLM */
  context: string;
  /** Query metadata */
  metadata: {
    entitiesFound: number;
    relationshipsTraversed: number;
    chunksRetrieved: number;
    maxHops: number;
  };
}

export interface GraphRAGOptions {
  /** Maximum hops for graph traversal */
  maxHops?: number;
  /** Maximum entities to return */
  maxEntities?: number;
  /** Minimum relationship weight to traverse */
  minWeight?: number;
  /** Entity types to include */
  entityTypes?: EntityType[];
  /** Relationship types to include */
  relationTypes?: RelationType[];
  /** Include chunks in result */
  includeChunks?: boolean;
  /** Generate context summary */
  summarize?: boolean;
}

// ─── Knowledge Graph ─────────────────────────────────────────────────────────

export class KnowledgeGraph {
  private entities: Map<string, Entity> = new Map();
  private relationships: Map<string, Relationship> = new Map();
  private chunks: Map<string, GraphChunk> = new Map();

  // Adjacency lists for efficient traversal
  private outgoing: Map<string, Set<string>> = new Map(); // entityId -> relationshipIds
  private incoming: Map<string, Set<string>> = new Map(); // entityId -> relationshipIds

  // Indexes
  private nameIndex: Map<string, Set<string>> = new Map(); // lowercase name -> entityIds
  private typeIndex: Map<EntityType, Set<string>> = new Map();

  /**
   * Add an entity to the graph
   */
  addEntity(entity: Entity): void {
    this.entities.set(entity.id, entity);

    // Update indexes
    const nameLower = entity.name.toLowerCase();
    if (!this.nameIndex.has(nameLower)) {
      this.nameIndex.set(nameLower, new Set());
    }
    this.nameIndex.get(nameLower)!.add(entity.id);

    if (!this.typeIndex.has(entity.type)) {
      this.typeIndex.set(entity.type, new Set());
    }
    this.typeIndex.get(entity.type)!.add(entity.id);

    // Initialize adjacency
    if (!this.outgoing.has(entity.id)) {
      this.outgoing.set(entity.id, new Set());
    }
    if (!this.incoming.has(entity.id)) {
      this.incoming.set(entity.id, new Set());
    }
  }

  /**
   * Add a relationship between entities
   */
  addRelationship(relationship: Relationship): void {
    // Ensure both entities exist
    if (!this.entities.has(relationship.sourceId) || !this.entities.has(relationship.targetId)) {
      throw new Error("Both source and target entities must exist");
    }

    this.relationships.set(relationship.id, relationship);

    // Update adjacency lists
    this.outgoing.get(relationship.sourceId)!.add(relationship.id);
    this.incoming.get(relationship.targetId)!.add(relationship.id);
  }

  /**
   * Add a text chunk with entity references
   */
  addChunk(chunk: GraphChunk): void {
    this.chunks.set(chunk.id, chunk);

    // Update entity references
    for (const entityId of chunk.entityIds) {
      const entity = this.entities.get(entityId);
      if (entity && !entity.chunkIds.includes(chunk.id)) {
        entity.chunkIds.push(chunk.id);
      }
    }
  }

  /**
   * Get an entity by ID
   */
  getEntity(id: string): Entity | undefined {
    return this.entities.get(id);
  }

  /**
   * Find entities by name (fuzzy)
   */
  findEntitiesByName(name: string): Entity[] {
    const nameLower = name.toLowerCase();
    const exactMatch = this.nameIndex.get(nameLower);

    if (exactMatch) {
      return Array.from(exactMatch).map((id) => this.entities.get(id)!);
    }

    // Fuzzy match
    const results: Entity[] = [];
    for (const [key, ids] of this.nameIndex) {
      if (key.includes(nameLower) || nameLower.includes(key)) {
        for (const id of ids) {
          results.push(this.entities.get(id)!);
        }
      }
    }

    return results;
  }

  /**
   * Find entities by type
   */
  findEntitiesByType(type: EntityType): Entity[] {
    const ids = this.typeIndex.get(type);
    if (!ids) return [];
    return Array.from(ids).map((id) => this.entities.get(id)!);
  }

  /**
   * Get outgoing relationships from an entity
   */
  getOutgoingRelationships(entityId: string): Relationship[] {
    const relIds = this.outgoing.get(entityId);
    if (!relIds) return [];
    return Array.from(relIds).map((id) => this.relationships.get(id)!);
  }

  /**
   * Get incoming relationships to an entity
   */
  getIncomingRelationships(entityId: string): Relationship[] {
    const relIds = this.incoming.get(entityId);
    if (!relIds) return [];
    return Array.from(relIds).map((id) => this.relationships.get(id)!);
  }

  /**
   * Get all relationships for an entity (both directions)
   */
  getAllRelationships(entityId: string): Relationship[] {
    return [...this.getOutgoingRelationships(entityId), ...this.getIncomingRelationships(entityId)];
  }

  /**
   * Get neighboring entities (1 hop)
   */
  getNeighbors(entityId: string, options?: { direction?: "out" | "in" | "both"; types?: RelationType[] }): Entity[] {
    const direction = options?.direction ?? "both";
    const types = options?.types;

    const neighborIds = new Set<string>();

    if (direction === "out" || direction === "both") {
      for (const rel of this.getOutgoingRelationships(entityId)) {
        if (!types || types.includes(rel.type)) {
          neighborIds.add(rel.targetId);
        }
      }
    }

    if (direction === "in" || direction === "both") {
      for (const rel of this.getIncomingRelationships(entityId)) {
        if (!types || types.includes(rel.type)) {
          neighborIds.add(rel.sourceId);
        }
      }
    }

    return Array.from(neighborIds).map((id) => this.entities.get(id)!);
  }

  /**
   * Traverse graph with BFS up to maxHops
   */
  traverse(
    startEntityIds: string[],
    maxHops: number,
    options?: {
      minWeight?: number;
      relationTypes?: RelationType[];
      entityTypes?: EntityType[];
    }
  ): { entities: Entity[]; relationships: Relationship[] } {
    const visited = new Set<string>(startEntityIds);
    const collectedRelationships = new Map<string, Relationship>();
    const queue: { entityId: string; hop: number }[] = startEntityIds.map((id) => ({ entityId: id, hop: 0 }));

    while (queue.length > 0) {
      const { entityId, hop } = queue.shift()!;

      if (hop >= maxHops) continue;

      const relationships = this.getAllRelationships(entityId);

      for (const rel of relationships) {
        // Filter by weight
        if (options?.minWeight && rel.weight < options.minWeight) continue;

        // Filter by relationship type
        if (options?.relationTypes && !options.relationTypes.includes(rel.type)) continue;

        const neighborId = rel.sourceId === entityId ? rel.targetId : rel.sourceId;
        const neighbor = this.entities.get(neighborId);

        if (!neighbor) continue;

        // Filter by entity type
        if (options?.entityTypes && !options.entityTypes.includes(neighbor.type)) continue;

        collectedRelationships.set(rel.id, rel);

        if (!visited.has(neighborId)) {
          visited.add(neighborId);
          queue.push({ entityId: neighborId, hop: hop + 1 });
        }
      }
    }

    return {
      entities: Array.from(visited).map((id) => this.entities.get(id)!),
      relationships: Array.from(collectedRelationships.values()),
    };
  }

  /**
   * Find shortest path between two entities
   */
  findPath(startId: string, endId: string, maxHops: number = 5): GraphPath | null {
    if (startId === endId) {
      const entity = this.entities.get(startId);
      if (!entity) return null;
      return { entities: [entity], relationships: [], weight: 0, hops: 0 };
    }

    // BFS for shortest path
    const visited = new Map<string, { prevId: string | null; relId: string | null }>();
    visited.set(startId, { prevId: null, relId: null });

    const queue: { entityId: string; hop: number }[] = [{ entityId: startId, hop: 0 }];

    while (queue.length > 0) {
      const { entityId, hop } = queue.shift()!;

      if (hop >= maxHops) continue;

      for (const rel of this.getAllRelationships(entityId)) {
        const neighborId = rel.sourceId === entityId ? rel.targetId : rel.sourceId;

        if (!visited.has(neighborId)) {
          visited.set(neighborId, { prevId: entityId, relId: rel.id });

          if (neighborId === endId) {
            // Reconstruct path
            return this.reconstructPath(startId, endId, visited);
          }

          queue.push({ entityId: neighborId, hop: hop + 1 });
        }
      }
    }

    return null;
  }

  private reconstructPath(
    startId: string,
    endId: string,
    visited: Map<string, { prevId: string | null; relId: string | null }>
  ): GraphPath {
    const entities: Entity[] = [];
    const relationships: Relationship[] = [];
    let totalWeight = 0;

    let currentId: string | null = endId;

    while (currentId !== null) {
      entities.unshift(this.entities.get(currentId)!);
      const prev = visited.get(currentId)!;

      if (prev.relId) {
        const rel = this.relationships.get(prev.relId)!;
        relationships.unshift(rel);
        totalWeight += rel.weight;
      }

      currentId = prev.prevId;
    }

    return {
      entities,
      relationships,
      weight: totalWeight,
      hops: relationships.length,
    };
  }

  /**
   * Get chunks for a set of entities
   */
  getChunksForEntities(entityIds: string[]): GraphChunk[] {
    const chunkIds = new Set<string>();

    for (const entityId of entityIds) {
      const entity = this.entities.get(entityId);
      if (entity) {
        for (const chunkId of entity.chunkIds) {
          chunkIds.add(chunkId);
        }
      }
    }

    return Array.from(chunkIds).map((id) => this.chunks.get(id)!).filter(Boolean);
  }

  /**
   * Get graph statistics
   */
  getStats(): {
    entityCount: number;
    relationshipCount: number;
    chunkCount: number;
    entitiesByType: Record<string, number>;
    relationshipsByType: Record<string, number>;
  } {
    const entitiesByType: Record<string, number> = {};
    for (const [type, ids] of this.typeIndex) {
      entitiesByType[type] = ids.size;
    }

    const relationshipsByType: Record<string, number> = {};
    for (const rel of this.relationships.values()) {
      relationshipsByType[rel.type] = (relationshipsByType[rel.type] ?? 0) + 1;
    }

    return {
      entityCount: this.entities.size,
      relationshipCount: this.relationships.size,
      chunkCount: this.chunks.size,
      entitiesByType,
      relationshipsByType,
    };
  }

  /**
   * Clear the graph
   */
  clear(): void {
    this.entities.clear();
    this.relationships.clear();
    this.chunks.clear();
    this.outgoing.clear();
    this.incoming.clear();
    this.nameIndex.clear();
    this.typeIndex.clear();
  }

  /**
   * Export graph to JSON
   */
  toJSON(): {
    entities: Entity[];
    relationships: Relationship[];
    chunks: GraphChunk[];
  } {
    return {
      entities: Array.from(this.entities.values()),
      relationships: Array.from(this.relationships.values()),
      chunks: Array.from(this.chunks.values()),
    };
  }

  /**
   * Import graph from JSON
   */
  fromJSON(data: { entities: Entity[]; relationships: Relationship[]; chunks: GraphChunk[] }): void {
    this.clear();

    for (const entity of data.entities) {
      this.addEntity(entity);
    }

    for (const rel of data.relationships) {
      this.addRelationship(rel);
    }

    for (const chunk of data.chunks) {
      this.addChunk(chunk);
    }
  }
}

// ─── Graph-RAG Pipeline ──────────────────────────────────────────────────────

export class GraphRAG {
  constructor(private graph: KnowledgeGraph) {}

  /**
   * Query the graph and retrieve relevant context
   */
  query(queryEntities: string[], options?: GraphRAGOptions): GraphQueryResult {
    const maxHops = options?.maxHops ?? 2;
    const maxEntities = options?.maxEntities ?? 20;
    const includeChunks = options?.includeChunks ?? true;

    // Find matching entities
    const directMatches: Entity[] = [];
    const seedIds: string[] = [];

    for (const name of queryEntities) {
      const matches = this.graph.findEntitiesByName(name);
      directMatches.push(...matches);
      seedIds.push(...matches.map((e) => e.id));
    }

    // Traverse graph from seed entities
    const { entities: allEntities, relationships } = this.graph.traverse(seedIds, maxHops, {
      minWeight: options?.minWeight,
      relationTypes: options?.relationTypes,
      entityTypes: options?.entityTypes,
    });

    // Limit entities
    const limitedEntities = allEntities.slice(0, maxEntities);
    const relatedEntities = limitedEntities.filter((e) => !seedIds.includes(e.id));

    // Get chunks if requested
    const chunks = includeChunks ? this.graph.getChunksForEntities(limitedEntities.map((e) => e.id)) : [];

    // Find interesting paths
    const paths = this.findInterestingPaths(seedIds, maxHops);

    // Build context
    const context = this.buildContext(limitedEntities, relationships, chunks);

    return {
      directMatches,
      relatedEntities,
      paths,
      chunks,
      context,
      metadata: {
        entitiesFound: limitedEntities.length,
        relationshipsTraversed: relationships.length,
        chunksRetrieved: chunks.length,
        maxHops,
      },
    };
  }

  /**
   * Extract subgraph around seed entities
   */
  extractSubgraph(seedEntityIds: string[], hops: number = 2): SubgraphResult {
    const seedEntities = seedEntityIds.map((id) => this.graph.getEntity(id)).filter(Boolean) as Entity[];

    const { entities, relationships } = this.graph.traverse(seedEntityIds, hops);
    const chunks = this.graph.getChunksForEntities(entities.map((e) => e.id));

    return {
      seedEntities,
      entities,
      relationships,
      chunks,
    };
  }

  private findInterestingPaths(seedIds: string[], maxHops: number): GraphPath[] {
    const paths: GraphPath[] = [];

    // Find paths between seed entities
    for (let i = 0; i < seedIds.length; i++) {
      for (let j = i + 1; j < seedIds.length; j++) {
        const path = this.graph.findPath(seedIds[i], seedIds[j], maxHops);
        if (path && path.hops > 0) {
          paths.push(path);
        }
      }
    }

    // Sort by shortest first
    return paths.sort((a, b) => a.hops - b.hops).slice(0, 5);
  }

  private buildContext(entities: Entity[], relationships: Relationship[], chunks: GraphChunk[]): string {
    const parts: string[] = [];

    // Entity summaries
    if (entities.length > 0) {
      parts.push("## Entities\n");
      for (const entity of entities.slice(0, 10)) {
        const props = Object.entries(entity.properties)
          .slice(0, 3)
          .map(([k, v]) => `${k}: ${v}`)
          .join(", ");
        parts.push(`- **${entity.name}** (${entity.type})${props ? `: ${props}` : ""}`);
      }
    }

    // Key relationships
    if (relationships.length > 0) {
      parts.push("\n## Relationships\n");
      const topRels = relationships.sort((a, b) => b.weight - a.weight).slice(0, 10);
      for (const rel of topRels) {
        const source = this.graph.getEntity(rel.sourceId);
        const target = this.graph.getEntity(rel.targetId);
        if (source && target) {
          parts.push(`- ${source.name} → ${rel.type} → ${target.name}`);
        }
      }
    }

    // Chunk excerpts
    if (chunks.length > 0) {
      parts.push("\n## Relevant Text\n");
      for (const chunk of chunks.slice(0, 5)) {
        const excerpt = chunk.content.length > 200 ? chunk.content.slice(0, 200) + "..." : chunk.content;
        parts.push(`> ${excerpt}\n`);
      }
    }

    return parts.join("\n");
  }
}

// ─── Entity Extraction Helpers ───────────────────────────────────────────────

/**
 * Simple entity extraction from text (production would use NER model)
 */
export function extractEntitiesSimple(text: string): { name: string; type: EntityType }[] {
  const entities: { name: string; type: EntityType }[] = [];

  // Extract capitalized phrases (potential entities)
  const capitalizedPattern = /\b([A-Z][a-z]+(?:\s+[A-Z][a-z]+)*)\b/g;
  let match;

  while ((match = capitalizedPattern.exec(text)) !== null) {
    const name = match[1];

    // Skip common non-entities
    const skipWords = ["The", "This", "That", "These", "Those", "However", "Therefore", "Moreover"];
    if (skipWords.includes(name)) continue;

    // Guess type based on patterns
    let type: EntityType = "concept";

    if (/\b(Inc|Corp|LLC|Ltd|Company|Organization)\b/i.test(name)) {
      type = "organization";
    } else if (/\b(City|Country|State|Street|Avenue|Road)\b/i.test(name)) {
      type = "location";
    } else if (/^[A-Z][a-z]+\s+[A-Z][a-z]+$/.test(name)) {
      type = "person"; // Likely a name
    }

    entities.push({ name, type });
  }

  // Deduplicate
  const seen = new Set<string>();
  return entities.filter((e) => {
    const key = `${e.name}:${e.type}`;
    if (seen.has(key)) return false;
    seen.add(key);
    return true;
  });
}

/**
 * Generate entity ID from name and type
 */
export function generateEntityId(name: string, type: EntityType): string {
  const normalized = name.toLowerCase().replace(/\s+/g, "_");
  return `${type}_${normalized}`;
}

/**
 * Generate relationship ID
 */
export function generateRelationshipId(sourceId: string, targetId: string, type: RelationType): string {
  return `rel_${sourceId}_${type}_${targetId}`;
}
