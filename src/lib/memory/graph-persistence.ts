/**
 * Graph Persistence Service
 * Sprint 4.3 — Advanced Memory (Item 1: Knowledge Graph Persistence)
 *
 * Persists the KnowledgeGraph to Supabase with hybrid public/private isolation.
 * - Public knowledge (client_id = null): shared across all clients
 * - Private knowledge (client_id = value): isolated to owning client
 * - Lazy-load on demand: no full brain load at startup
 * - Uses existing KnowledgeGraph class for in-memory traversal of fetched subgraphs
 */

import { createClient, SupabaseClient } from "@supabase/supabase-js";

import { getServerEnv } from "@/lib/config/env";
import { getEmbeddingsService } from "./embeddings";
import {
  KnowledgeGraph,
  Entity,
  Relationship,
  EntityType,
  RelationType,
  GraphPath,
} from "@/lib/rag/graph-rag";

// ─── Types ───────────────────────────────────────────────────────────────────

export interface SaveEntityOptions {
  /** The entity to save */
  entity: Omit<Entity, "embedding">;
  /** If provided, entity is private to this client. If omitted, entity is public. */
  clientId?: string;
  /** Whether to generate an embedding for semantic search (default: true) */
  generateEmbedding?: boolean;
}

export interface SaveRelationshipOptions {
  /** The relationship to save */
  relationship: Relationship;
  /** If provided, relationship is private to this client. If omitted, public. */
  clientId?: string;
}

export interface FindEntitiesOptions {
  /** Text query to search for semantically */
  query: string;
  /** Client ID — results include public + this client's private entities */
  clientId?: string;
  /** Filter by entity type */
  entityType?: EntityType;
  /** Maximum number of results (default: 10) */
  limit?: number;
  /** Minimum similarity threshold 0-1 (default: 0.6) */
  threshold?: number;
}

export interface GetNeighborsOptions {
  /** The entity to get neighbors for */
  entityId: string;
  /** Client ID — results include public + this client's private relationships */
  clientId?: string;
  /** Direction: 'out', 'in', or 'both' (default: 'both') */
  direction?: "out" | "in" | "both";
  /** Filter by relationship type */
  relationType?: RelationType;
  /** Minimum relationship weight 0-1 (default: 0) */
  minWeight?: number;
  /** Maximum number of results (default: 50) */
  limit?: number;
}

export interface NeighborResult {
  relationship: {
    id: string;
    type: RelationType;
    weight: number;
    label?: string;
    properties: Record<string, unknown>;
    evidence?: string;
    direction: "outgoing" | "incoming";
  };
  entity: {
    id: string;
    name: string;
    type: EntityType;
    properties: Record<string, unknown>;
  };
}

export interface TraversalOptions {
  /** Seed entity IDs to start traversal from */
  seedEntityIds: string[];
  /** Client ID for isolation */
  clientId?: string;
  /** Maximum number of hops (default: 2) */
  maxHops?: number;
  /** Minimum relationship weight to traverse (default: 0) */
  minWeight?: number;
  /** Filter by relationship types */
  relationTypes?: RelationType[];
  /** Filter by entity types */
  entityTypes?: EntityType[];
}

export interface TraversalResult {
  /** All entities discovered in traversal */
  entities: Entity[];
  /** All relationships discovered */
  relationships: Relationship[];
  /** Paths between seed entities (if multiple seeds) */
  paths: GraphPath[];
  /** Number of hops actually traversed */
  hopsTraversed: number;
}

export interface GraphStats {
  totalEntities: number;
  totalRelationships: number;
  entitiesByType: Record<string, number>;
  relationshipsByType: Record<string, number>;
  publicEntities: number;
  privateEntities: number;
}

// ─── Service Interface ───────────────────────────────────────────────────────

export interface GraphPersistenceService {
  saveEntity(options: SaveEntityOptions): Promise<string>;
  saveRelationship(options: SaveRelationshipOptions): Promise<string>;
  findEntities(options: FindEntitiesOptions): Promise<Entity[]>;
  getNeighbors(options: GetNeighborsOptions): Promise<NeighborResult[]>;
  traverseFromDatabase(options: TraversalOptions): Promise<TraversalResult>;
  deleteEntity(entityId: string): Promise<void>;
  deleteRelationship(relationshipId: string): Promise<void>;
  getStats(clientId?: string): Promise<GraphStats>;
}

// ─── Supabase Implementation ─────────────────────────────────────────────────

class SupabaseGraphPersistenceService implements GraphPersistenceService {
  private supabase: SupabaseClient;

  constructor(supabaseUrl: string, supabaseKey: string) {
    this.supabase = createClient(supabaseUrl, supabaseKey);
  }

  /**
   * Save (upsert) an entity to the graph.
   * If entity.id already exists, updates it. Otherwise inserts.
   * Generates an embedding from name + type + key properties for semantic search.
   */
  async saveEntity(options: SaveEntityOptions): Promise<string> {
    const { entity, clientId, generateEmbedding = true } = options;

    let embeddingVector: number[] | null = null;

    if (generateEmbedding) {
      const embeddingText = this.buildEntityEmbeddingText(entity);
      const embeddingsService = getEmbeddingsService();
      const result = await embeddingsService.embed(embeddingText);
      embeddingVector = result.embedding;
    }

    const row = {
      id: entity.id,
      name: entity.name,
      type: entity.type,
      properties: entity.properties,
      chunk_ids: entity.chunkIds,
      source: entity.source ?? null,
      client_id: clientId ?? null,
      updated_at: new Date().toISOString(),
      ...(embeddingVector ? { embedding: JSON.stringify(embeddingVector) } : {}),
    };

    const { error } = await this.supabase
      .from("graph_entities")
      .upsert(row, { onConflict: "id" });

    if (error) {
      throw new Error(`[GraphPersistence] Failed to save entity "${entity.name}": ${error.message}`);
    }

    return entity.id;
  }

  /**
   * Save (upsert) a relationship between two entities.
   * Validates both entities exist before saving.
   */
  async saveRelationship(options: SaveRelationshipOptions): Promise<string> {
    const { relationship, clientId } = options;

    // Validate both entities exist
    const { data: sourceEntity } = await this.supabase
      .from("graph_entities")
      .select("id")
      .eq("id", relationship.sourceId)
      .single();

    if (!sourceEntity) {
      throw new Error(
        `[GraphPersistence] Source entity "${relationship.sourceId}" not found`
      );
    }

    const { data: targetEntity } = await this.supabase
      .from("graph_entities")
      .select("id")
      .eq("id", relationship.targetId)
      .single();

    if (!targetEntity) {
      throw new Error(
        `[GraphPersistence] Target entity "${relationship.targetId}" not found`
      );
    }

    const row = {
      id: relationship.id,
      source_entity_id: relationship.sourceId,
      target_entity_id: relationship.targetId,
      type: relationship.type,
      label: relationship.label ?? null,
      weight: relationship.weight,
      properties: relationship.properties,
      evidence: relationship.evidence ?? null,
      client_id: clientId ?? null,
    };

    const { error } = await this.supabase
      .from("graph_relationships")
      .upsert(row, { onConflict: "id" });

    if (error) {
      throw new Error(
        `[GraphPersistence] Failed to save relationship: ${error.message}`
      );
    }

    return relationship.id;
  }

  /**
   * Find entities via semantic similarity search.
   * Returns public entities + entities private to the given client.
   */
  async findEntities(options: FindEntitiesOptions): Promise<Entity[]> {
    const {
      query,
      clientId,
      entityType,
      limit = 10,
      threshold = 0.6,
    } = options;

    // Generate embedding for the query
    const embeddingsService = getEmbeddingsService();
    const { embedding } = await embeddingsService.embed(query);

    const { data, error } = await this.supabase.rpc("match_graph_entities", {
      query_embedding: JSON.stringify(embedding),
      p_client_id: clientId ?? null,
      p_entity_type: entityType ?? null,
      match_threshold: threshold,
      match_count: limit,
    });

    if (error) {
      throw new Error(
        `[GraphPersistence] Entity search failed: ${error.message}`
      );
    }

    return (data ?? []).map(this.rowToEntity);
  }

  /**
   * Get direct neighbors of an entity (one hop).
   * Uses the get_entity_neighbors RPC for efficient DB-side joins.
   */
  async getNeighbors(options: GetNeighborsOptions): Promise<NeighborResult[]> {
    const {
      entityId,
      clientId,
      direction = "both",
      relationType,
      minWeight = 0,
      limit = 50,
    } = options;

    const { data, error } = await this.supabase.rpc("get_entity_neighbors", {
      p_entity_id: entityId,
      p_client_id: clientId ?? null,
      p_direction: direction === "out" ? "out" : direction === "in" ? "in" : "both",
      p_rel_type: relationType ?? null,
      p_min_weight: minWeight,
      p_limit: limit,
    });

    if (error) {
      throw new Error(
        `[GraphPersistence] Get neighbors failed: ${error.message}`
      );
    }

    return (data ?? []).map((row: Record<string, unknown>) => ({
      relationship: {
        id: row.relationship_id as string,
        type: row.rel_type as RelationType,
        weight: row.rel_weight as number,
        label: (row.rel_label as string) ?? undefined,
        properties: (row.rel_properties as Record<string, unknown>) ?? {},
        evidence: (row.rel_evidence as string) ?? undefined,
        direction: row.direction as "outgoing" | "incoming",
      },
      entity: {
        id: row.neighbor_id as string,
        name: row.neighbor_name as string,
        type: row.neighbor_type as EntityType,
        properties: (row.neighbor_properties as Record<string, unknown>) ?? {},
      },
    }));
  }

  /**
   * Multi-hop graph traversal from seed entities.
   * Each hop queries the database — only pulls what's needed.
   * Builds a temporary in-memory KnowledgeGraph for path-finding.
   */
  async traverseFromDatabase(options: TraversalOptions): Promise<TraversalResult> {
    const {
      seedEntityIds,
      clientId,
      maxHops = 2,
      minWeight = 0,
      relationTypes,
      entityTypes,
    } = options;

    // Fetch seed entities from DB
    const { data: seedRows, error: seedError } = await this.supabase
      .from("graph_entities")
      .select("*")
      .in("id", seedEntityIds);

    if (seedError) {
      throw new Error(
        `[GraphPersistence] Failed to fetch seed entities: ${seedError.message}`
      );
    }

    // Build a temporary in-memory graph for traversal
    const tempGraph = new KnowledgeGraph();
    const visitedEntityIds = new Set<string>();
    const allRelationships: Relationship[] = [];

    // Add seed entities
    for (const row of seedRows ?? []) {
      const entity = this.rowToEntity(row);
      if (entityTypes && !entityTypes.includes(entity.type)) continue;
      tempGraph.addEntity(entity);
      visitedEntityIds.add(entity.id);
    }

    // BFS traversal — one DB query per hop
    let frontier = [...seedEntityIds];
    let hopsTraversed = 0;

    for (let hop = 0; hop < maxHops; hop++) {
      if (frontier.length === 0) break;

      const nextFrontier: string[] = [];

      // Fetch neighbors for all entities in the current frontier
      for (const entityId of frontier) {
        const neighbors = await this.getNeighbors({
          entityId,
          clientId,
          minWeight,
          relationType: relationTypes && relationTypes.length === 1 ? relationTypes[0] : undefined,
          limit: 50,
        });

        for (const neighbor of neighbors) {
          // Filter by relationship type if multiple specified
          if (relationTypes && relationTypes.length > 1 && !relationTypes.includes(neighbor.relationship.type)) {
            continue;
          }

          // Filter by entity type
          if (entityTypes && !entityTypes.includes(neighbor.entity.type)) {
            continue;
          }

          // Build the relationship object
          const rel: Relationship = {
            id: neighbor.relationship.id,
            sourceId: neighbor.relationship.direction === "outgoing" ? entityId : neighbor.entity.id,
            targetId: neighbor.relationship.direction === "outgoing" ? neighbor.entity.id : entityId,
            type: neighbor.relationship.type,
            label: neighbor.relationship.label,
            weight: neighbor.relationship.weight,
            properties: neighbor.relationship.properties,
            evidence: neighbor.relationship.evidence,
            timestamp: new Date().toISOString(),
          };
          allRelationships.push(rel);

          // Add neighbor entity if not already visited
          if (!visitedEntityIds.has(neighbor.entity.id)) {
            visitedEntityIds.add(neighbor.entity.id);
            nextFrontier.push(neighbor.entity.id);

            // Fetch full entity data for the neighbor
            const { data: fullEntity } = await this.supabase
              .from("graph_entities")
              .select("*")
              .eq("id", neighbor.entity.id)
              .single();

            if (fullEntity) {
              tempGraph.addEntity(this.rowToEntity(fullEntity));
            }
          }
        }
      }

      frontier = nextFrontier;
      hopsTraversed = hop + 1;
    }

    // Add all relationships to the temp graph (entities must be added first)
    for (const rel of allRelationships) {
      try {
        tempGraph.addRelationship(rel);
      } catch {
        // Skip relationships where one entity was filtered out
      }
    }

    // Find paths between seed entities using the in-memory graph
    const paths: GraphPath[] = [];
    for (let i = 0; i < seedEntityIds.length; i++) {
      for (let j = i + 1; j < seedEntityIds.length; j++) {
        const path = tempGraph.findPath(seedEntityIds[i], seedEntityIds[j], maxHops);
        if (path && path.hops > 0) {
          paths.push(path);
        }
      }
    }

    return {
      entities: Array.from(visitedEntityIds)
        .map((id) => tempGraph.getEntity(id))
        .filter(Boolean) as Entity[],
      relationships: allRelationships,
      paths: paths.sort((a, b) => a.hops - b.hops).slice(0, 5),
      hopsTraversed,
    };
  }

  /**
   * Delete an entity. All connected relationships are cascade-deleted by the FK.
   */
  async deleteEntity(entityId: string): Promise<void> {
    const { error } = await this.supabase
      .from("graph_entities")
      .delete()
      .eq("id", entityId);

    if (error) {
      throw new Error(
        `[GraphPersistence] Failed to delete entity: ${error.message}`
      );
    }
  }

  /**
   * Delete a single relationship.
   */
  async deleteRelationship(relationshipId: string): Promise<void> {
    const { error } = await this.supabase
      .from("graph_relationships")
      .delete()
      .eq("id", relationshipId);

    if (error) {
      throw new Error(
        `[GraphPersistence] Failed to delete relationship: ${error.message}`
      );
    }
  }

  /**
   * Get graph statistics, scoped to public + client's private data.
   */
  async getStats(clientId?: string): Promise<GraphStats> {
    // Count entities by type (public + client-scoped)
    let entitiesQuery = this.supabase
      .from("graph_entities")
      .select("type, client_id");

    if (clientId) {
      entitiesQuery = entitiesQuery.or(`client_id.is.null,client_id.eq.${clientId}`);
    }

    const { data: entities, error: entitiesError } = await entitiesQuery;

    if (entitiesError) {
      throw new Error(
        `[GraphPersistence] Failed to get entity stats: ${entitiesError.message}`
      );
    }

    // Count relationships by type (public + client-scoped)
    let relsQuery = this.supabase
      .from("graph_relationships")
      .select("type, client_id");

    if (clientId) {
      relsQuery = relsQuery.or(`client_id.is.null,client_id.eq.${clientId}`);
    }

    const { data: rels, error: relsError } = await relsQuery;

    if (relsError) {
      throw new Error(
        `[GraphPersistence] Failed to get relationship stats: ${relsError.message}`
      );
    }

    const entitiesByType: Record<string, number> = {};
    let publicEntities = 0;
    let privateEntities = 0;

    for (const e of entities ?? []) {
      entitiesByType[e.type] = (entitiesByType[e.type] ?? 0) + 1;
      if (e.client_id === null) {
        publicEntities++;
      } else {
        privateEntities++;
      }
    }

    const relationshipsByType: Record<string, number> = {};
    for (const r of rels ?? []) {
      relationshipsByType[r.type] = (relationshipsByType[r.type] ?? 0) + 1;
    }

    return {
      totalEntities: (entities ?? []).length,
      totalRelationships: (rels ?? []).length,
      entitiesByType,
      relationshipsByType,
      publicEntities,
      privateEntities,
    };
  }

  // ─── Private Helpers ─────────────────────────────────────────────────────────

  /**
   * Build a text string from entity fields for embedding generation.
   * Combines name, type, and top-level string properties for rich semantic search.
   */
  private buildEntityEmbeddingText(entity: Omit<Entity, "embedding">): string {
    const parts = [entity.name, entity.type];

    // Add string properties for richer embeddings
    for (const [key, value] of Object.entries(entity.properties)) {
      if (typeof value === "string" && value.length < 500) {
        parts.push(`${key}: ${value}`);
      }
    }

    if (entity.source) {
      parts.push(`source: ${entity.source}`);
    }

    return parts.join(" | ");
  }

  /**
   * Convert a Supabase row to an Entity object.
   */
  private rowToEntity(row: Record<string, unknown>): Entity {
    return {
      id: row.id as string,
      name: row.name as string,
      type: row.type as EntityType,
      properties: (row.properties as Record<string, unknown>) ?? {},
      chunkIds: (row.chunk_ids as string[]) ?? [],
      source: (row.source as string) ?? undefined,
      timestamp: (row.created_at as string) ?? new Date().toISOString(),
    };
  }
}

// ─── NoOp Fallback ───────────────────────────────────────────────────────────

class NoOpGraphPersistenceService implements GraphPersistenceService {
  async saveEntity(options: SaveEntityOptions): Promise<string> {
    console.warn("[GraphPersistence] No Supabase configured — entity not persisted");
    return options.entity.id;
  }

  async saveRelationship(options: SaveRelationshipOptions): Promise<string> {
    console.warn("[GraphPersistence] No Supabase configured — relationship not persisted");
    return options.relationship.id;
  }

  async findEntities(): Promise<Entity[]> {
    console.warn("[GraphPersistence] No Supabase configured — returning empty results");
    return [];
  }

  async getNeighbors(): Promise<NeighborResult[]> {
    console.warn("[GraphPersistence] No Supabase configured — returning empty results");
    return [];
  }

  async traverseFromDatabase(): Promise<TraversalResult> {
    console.warn("[GraphPersistence] No Supabase configured — returning empty traversal");
    return { entities: [], relationships: [], paths: [], hopsTraversed: 0 };
  }

  async deleteEntity(): Promise<void> {
    console.warn("[GraphPersistence] No Supabase configured — delete skipped");
  }

  async deleteRelationship(): Promise<void> {
    console.warn("[GraphPersistence] No Supabase configured — delete skipped");
  }

  async getStats(): Promise<GraphStats> {
    return {
      totalEntities: 0,
      totalRelationships: 0,
      entitiesByType: {},
      relationshipsByType: {},
      publicEntities: 0,
      privateEntities: 0,
    };
  }
}

// ─── Singleton Factory ───────────────────────────────────────────────────────

let graphPersistenceService: GraphPersistenceService | undefined;

/**
 * Get the graph persistence service singleton.
 * Returns Supabase-backed service if configured, otherwise NoOp fallback.
 */
export function getGraphPersistenceService(): GraphPersistenceService {
  if (!graphPersistenceService) {
    const env = getServerEnv();

    if (env.SUPABASE_URL && env.SUPABASE_SERVICE_ROLE_KEY) {
      graphPersistenceService = new SupabaseGraphPersistenceService(
        env.SUPABASE_URL,
        env.SUPABASE_SERVICE_ROLE_KEY
      );
    } else {
      graphPersistenceService = new NoOpGraphPersistenceService();
    }
  }

  return graphPersistenceService;
}
