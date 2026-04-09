import { createClient } from "@supabase/supabase-js";

import { getServerEnv } from "@/lib/config/env";

// Risk levels for tool actions
export type RiskLevel = "low" | "medium" | "high" | "critical";

// Approval status
export type ApprovalStatus = "pending" | "approved" | "rejected" | "expired" | "auto_approved";

// Tool action that requires approval
export interface PendingApproval {
  id: string;
  toolName: string;
  actionName: string;
  params: Record<string, unknown>;
  riskLevel: RiskLevel;
  confidenceScore: number;
  reasoning: string;
  requestedBy: string;
  clientId?: string;
  conversationId?: string;
  status: ApprovalStatus;
  expiresAt: string;
  createdAt: string;
  resolvedAt?: string;
  resolvedBy?: string;
  resolutionNote?: string;
}

// Configuration for approval gates
export interface ApprovalGateConfig {
  tool: string;
  action: string;
  riskLevel: RiskLevel;
  confidenceThreshold: number; // Auto-approve if confidence >= threshold
  requiresApproval: boolean;
  maxAutoApproveAmount?: number; // For financial actions
  allowedClientIds?: string[]; // Restrict to specific clients
}

// Default approval gate configurations
export const DEFAULT_APPROVAL_GATES: ApprovalGateConfig[] = [
  // Email actions - medium risk, require approval for sending
  {
    tool: "email",
    action: "send",
    riskLevel: "medium",
    confidenceThreshold: 0.95,
    requiresApproval: true,
  },
  {
    tool: "email",
    action: "reply",
    riskLevel: "medium",
    confidenceThreshold: 0.9,
    requiresApproval: true,
  },

  // Calendar actions - low risk for reading, medium for modifications
  {
    tool: "calendar",
    action: "read",
    riskLevel: "low",
    confidenceThreshold: 0.7,
    requiresApproval: false,
  },
  {
    tool: "calendar",
    action: "create",
    riskLevel: "medium",
    confidenceThreshold: 0.85,
    requiresApproval: true,
  },
  {
    tool: "calendar",
    action: "delete",
    riskLevel: "high",
    confidenceThreshold: 1.0, // Never auto-approve
    requiresApproval: true,
  },

  // CRM actions
  {
    tool: "crm",
    action: "read",
    riskLevel: "low",
    confidenceThreshold: 0.7,
    requiresApproval: false,
  },
  {
    tool: "crm",
    action: "update",
    riskLevel: "medium",
    confidenceThreshold: 0.9,
    requiresApproval: true,
  },
  {
    tool: "crm",
    action: "create",
    riskLevel: "medium",
    confidenceThreshold: 0.85,
    requiresApproval: true,
  },

  // Financial actions - high risk
  {
    tool: "finance",
    action: "payment",
    riskLevel: "critical",
    confidenceThreshold: 1.0, // Never auto-approve
    requiresApproval: true,
    maxAutoApproveAmount: 0,
  },
  {
    tool: "finance",
    action: "invoice",
    riskLevel: "high",
    confidenceThreshold: 1.0,
    requiresApproval: true,
  },

  // Document actions
  {
    tool: "documents",
    action: "read",
    riskLevel: "low",
    confidenceThreshold: 0.7,
    requiresApproval: false,
  },
  {
    tool: "documents",
    action: "write",
    riskLevel: "medium",
    confidenceThreshold: 0.9,
    requiresApproval: true,
  },
  {
    tool: "documents",
    action: "delete",
    riskLevel: "high",
    confidenceThreshold: 1.0,
    requiresApproval: true,
  },
];

export interface ApprovalGateService {
  getGateConfig(tool: string, action: string): ApprovalGateConfig | null;
  shouldAutoApprove(config: ApprovalGateConfig, confidenceScore: number, amount?: number): boolean;
  createPendingApproval(request: Omit<PendingApproval, "id" | "status" | "createdAt" | "expiresAt">): Promise<PendingApproval>;
  getPendingApprovals(clientId?: string): Promise<PendingApproval[]>;
  resolveApproval(id: string, status: "approved" | "rejected", resolvedBy: string, note?: string): Promise<PendingApproval>;
  checkApproval(id: string): Promise<PendingApproval | null>;
}

class SupabaseApprovalGateService implements ApprovalGateService {
  private supabase;
  private gates: Map<string, ApprovalGateConfig>;

  constructor(url: string, key: string, customGates?: ApprovalGateConfig[]) {
    this.supabase = createClient(url, key, { auth: { persistSession: false } });

    // Build gate lookup map
    this.gates = new Map();
    for (const gate of customGates ?? DEFAULT_APPROVAL_GATES) {
      this.gates.set(`${gate.tool}:${gate.action}`, gate);
    }
  }

  getGateConfig(tool: string, action: string): ApprovalGateConfig | null {
    return this.gates.get(`${tool}:${action}`) ?? null;
  }

  shouldAutoApprove(config: ApprovalGateConfig, confidenceScore: number, amount?: number): boolean {
    // Never auto-approve if requiresApproval is true and confidence is below threshold
    if (!config.requiresApproval) {
      return true;
    }

    if (confidenceScore < config.confidenceThreshold) {
      return false;
    }

    // Check amount limit for financial actions
    if (config.maxAutoApproveAmount !== undefined && amount !== undefined) {
      if (amount > config.maxAutoApproveAmount) {
        return false;
      }
    }

    return true;
  }

  async createPendingApproval(
    request: Omit<PendingApproval, "id" | "status" | "createdAt" | "expiresAt">
  ): Promise<PendingApproval> {
    const expiresAt = new Date(Date.now() + 24 * 60 * 60 * 1000).toISOString(); // 24 hour expiry

    const { data, error } = await this.supabase
      .from("pending_approvals")
      .insert({
        tool_name: request.toolName,
        action_name: request.actionName,
        params: request.params,
        risk_level: request.riskLevel,
        confidence_score: request.confidenceScore,
        reasoning: request.reasoning,
        requested_by: request.requestedBy,
        client_id: request.clientId,
        conversation_id: request.conversationId,
        status: "pending",
        expires_at: expiresAt,
      })
      .select()
      .single();

    if (error) {
      throw new Error(`Failed to create pending approval: ${error.message}`);
    }

    return this.mapRowToApproval(data);
  }

  async getPendingApprovals(clientId?: string): Promise<PendingApproval[]> {
    let query = this.supabase
      .from("pending_approvals")
      .select()
      .eq("status", "pending")
      .gt("expires_at", new Date().toISOString())
      .order("created_at", { ascending: false });

    if (clientId) {
      query = query.eq("client_id", clientId);
    }

    const { data, error } = await query;

    if (error) {
      throw new Error(`Failed to get pending approvals: ${error.message}`);
    }

    return (data ?? []).map(this.mapRowToApproval);
  }

  async resolveApproval(
    id: string,
    status: "approved" | "rejected",
    resolvedBy: string,
    note?: string
  ): Promise<PendingApproval> {
    const { data, error } = await this.supabase
      .from("pending_approvals")
      .update({
        status,
        resolved_at: new Date().toISOString(),
        resolved_by: resolvedBy,
        resolution_note: note,
      })
      .eq("id", id)
      .select()
      .single();

    if (error) {
      throw new Error(`Failed to resolve approval: ${error.message}`);
    }

    return this.mapRowToApproval(data);
  }

  async checkApproval(id: string): Promise<PendingApproval | null> {
    const { data, error } = await this.supabase
      .from("pending_approvals")
      .select()
      .eq("id", id)
      .single();

    if (error || !data) {
      return null;
    }

    return this.mapRowToApproval(data);
  }

  private mapRowToApproval(row: Record<string, unknown>): PendingApproval {
    return {
      id: row.id as string,
      toolName: row.tool_name as string,
      actionName: row.action_name as string,
      params: row.params as Record<string, unknown>,
      riskLevel: row.risk_level as RiskLevel,
      confidenceScore: row.confidence_score as number,
      reasoning: row.reasoning as string,
      requestedBy: row.requested_by as string,
      clientId: row.client_id as string | undefined,
      conversationId: row.conversation_id as string | undefined,
      status: row.status as ApprovalStatus,
      expiresAt: row.expires_at as string,
      createdAt: row.created_at as string,
      resolvedAt: row.resolved_at as string | undefined,
      resolvedBy: row.resolved_by as string | undefined,
      resolutionNote: row.resolution_note as string | undefined,
    };
  }
}

class InMemoryApprovalGateService implements ApprovalGateService {
  private gates: Map<string, ApprovalGateConfig>;
  private approvals: Map<string, PendingApproval> = new Map();

  constructor(customGates?: ApprovalGateConfig[]) {
    this.gates = new Map();
    for (const gate of customGates ?? DEFAULT_APPROVAL_GATES) {
      this.gates.set(`${gate.tool}:${gate.action}`, gate);
    }
  }

  getGateConfig(tool: string, action: string): ApprovalGateConfig | null {
    return this.gates.get(`${tool}:${action}`) ?? null;
  }

  shouldAutoApprove(config: ApprovalGateConfig, confidenceScore: number, amount?: number): boolean {
    if (!config.requiresApproval) {
      return true;
    }

    if (confidenceScore < config.confidenceThreshold) {
      return false;
    }

    if (config.maxAutoApproveAmount !== undefined && amount !== undefined) {
      if (amount > config.maxAutoApproveAmount) {
        return false;
      }
    }

    return true;
  }

  async createPendingApproval(
    request: Omit<PendingApproval, "id" | "status" | "createdAt" | "expiresAt">
  ): Promise<PendingApproval> {
    const approval: PendingApproval = {
      id: crypto.randomUUID(),
      ...request,
      status: "pending",
      createdAt: new Date().toISOString(),
      expiresAt: new Date(Date.now() + 24 * 60 * 60 * 1000).toISOString(),
    };

    this.approvals.set(approval.id, approval);
    return approval;
  }

  async getPendingApprovals(clientId?: string): Promise<PendingApproval[]> {
    const now = new Date().toISOString();
    return Array.from(this.approvals.values()).filter(
      (a) =>
        a.status === "pending" &&
        a.expiresAt > now &&
        (!clientId || a.clientId === clientId)
    );
  }

  async resolveApproval(
    id: string,
    status: "approved" | "rejected",
    resolvedBy: string,
    note?: string
  ): Promise<PendingApproval> {
    const approval = this.approvals.get(id);
    if (!approval) {
      throw new Error("Approval not found");
    }

    approval.status = status;
    approval.resolvedAt = new Date().toISOString();
    approval.resolvedBy = resolvedBy;
    approval.resolutionNote = note;

    return approval;
  }

  async checkApproval(id: string): Promise<PendingApproval | null> {
    return this.approvals.get(id) ?? null;
  }
}

let approvalGateService: ApprovalGateService | undefined;

export function getApprovalGateService(): ApprovalGateService {
  if (!approvalGateService) {
    const env = getServerEnv();

    if (env.SUPABASE_URL && env.SUPABASE_SERVICE_ROLE_KEY) {
      approvalGateService = new SupabaseApprovalGateService(
        env.SUPABASE_URL,
        env.SUPABASE_SERVICE_ROLE_KEY
      );
    } else {
      approvalGateService = new InMemoryApprovalGateService();
    }
  }

  return approvalGateService;
}
