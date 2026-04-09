import { Composio } from "@composio/core";

import { getServerEnv } from "@/lib/config/env";

export interface ComposioTool {
  name: string;
  description: string;
  appName: string;
  actionId: string;
}

export interface ComposioConnection {
  id: string;
  appName: string;
  status: string;
  entityId: string;
}

export interface ToolExecutionResult {
  success: boolean;
  data?: unknown;
  error?: string;
}

// Type for the Composio client instance
type ComposioClient = InstanceType<typeof Composio>;

export interface ComposioService {
  isConfigured(): boolean;
  getClient(): ComposioClient | null;
  listApps(): Promise<string[]>;
  listActionsForApp(appName: string): Promise<ComposioTool[]>;
  executeAction(actionId: string, params: Record<string, unknown>, entityId?: string): Promise<ToolExecutionResult>;
  getConnections(entityId: string): Promise<ComposioConnection[]>;
  initiateConnection(appName: string, entityId: string, redirectUrl?: string): Promise<string>;
}

class ComposioServiceImpl implements ComposioService {
  private client: ComposioClient;
  private apiKey: string;

  constructor(apiKey: string) {
    this.apiKey = apiKey;
    this.client = new Composio({ apiKey });
  }

  isConfigured(): boolean {
    return true;
  }

  getClient(): ComposioClient {
    return this.client;
  }

  async listApps(): Promise<string[]> {
    // Return pre-defined list of supported apps
    // The Composio SDK doesn't have a direct list apps method
    return Object.values(COMPOSIO_TOOL_CATEGORIES).flat();
  }

  async listActionsForApp(appName: string): Promise<ComposioTool[]> {
    try {
      // Get entity and use its methods
      const entity = await this.client.getEntity("default");
      const connections = await entity.getConnections();

      // If connected to this app, return some tools
      const hasConnection = connections.some((c) => c.appName === appName);

      if (!hasConnection) {
        return [{
          name: `${appName}_connect`,
          description: `Connect to ${appName} to enable actions`,
          appName,
          actionId: `${appName}_connect`,
        }];
      }

      // Return generic action for the app
      return [{
        name: `${appName}_action`,
        description: `Execute action on ${appName}`,
        appName,
        actionId: `${appName}_action`,
      }];
    } catch (error) {
      console.error(`[Composio] Failed to list actions for ${appName}:`, error);
      return [];
    }
  }

  async executeAction(
    actionId: string,
    params: Record<string, unknown>,
    entityId = "default"
  ): Promise<ToolExecutionResult> {
    try {
      const entity = await this.client.getEntity(entityId);
      const result = await entity.execute({
        actionName: actionId,
        params,
      });

      return {
        success: true,
        data: result,
      };
    } catch (error) {
      const message = error instanceof Error ? error.message : "Action execution failed";
      return {
        success: false,
        error: message,
      };
    }
  }

  async getConnections(entityId: string): Promise<ComposioConnection[]> {
    try {
      const entity = await this.client.getEntity(entityId);
      const connections = await entity.getConnections();

      return connections.map((conn) => ({
        id: conn.id ?? "",
        appName: conn.appName ?? "",
        status: conn.status ?? "unknown",
        entityId,
      }));
    } catch (error) {
      console.error(`[Composio] Failed to get connections for ${entityId}:`, error);
      return [];
    }
  }

  async initiateConnection(
    appName: string,
    entityId: string,
    redirectUrl?: string
  ): Promise<string> {
    try {
      const entity = await this.client.getEntity(entityId);
      const connection = await entity.initiateConnection({
        appName,
        redirectUrl,
      });

      return connection.connectionStatus ?? "initiated";
    } catch (error) {
      const message = error instanceof Error ? error.message : "Connection initiation failed";
      throw new Error(message);
    }
  }
}

class NoOpComposioService implements ComposioService {
  isConfigured(): boolean {
    return false;
  }

  getClient(): null {
    return null;
  }

  async listApps(): Promise<string[]> {
    console.warn("[Composio] COMPOSIO_API_KEY not configured");
    return [];
  }

  async listActionsForApp(): Promise<ComposioTool[]> {
    return [];
  }

  async executeAction(): Promise<ToolExecutionResult> {
    return { success: false, error: "Composio not configured" };
  }

  async getConnections(): Promise<ComposioConnection[]> {
    return [];
  }

  async initiateConnection(): Promise<string> {
    throw new Error("Composio not configured");
  }
}

let composioService: ComposioService | undefined;

export function getComposioService(): ComposioService {
  if (!composioService) {
    const env = getServerEnv();

    if (env.COMPOSIO_API_KEY) {
      composioService = new ComposioServiceImpl(env.COMPOSIO_API_KEY);
    } else {
      composioService = new NoOpComposioService();
    }
  }

  return composioService;
}

// Pre-defined high-value tool categories for Olivia Brain
export const COMPOSIO_TOOL_CATEGORIES = {
  email: ["gmail", "outlook", "sendgrid"],
  calendar: ["google-calendar", "outlook-calendar", "calendly"],
  crm: ["hubspot", "salesforce", "pipedrive"],
  documents: ["google-docs", "notion", "dropbox"],
  communication: ["slack", "discord", "teams"],
  social: ["linkedin", "twitter", "facebook"],
  productivity: ["asana", "trello", "jira"],
  finance: ["stripe", "quickbooks", "xero"],
  storage: ["google-drive", "onedrive", "box"],
  ai: ["openai", "anthropic", "cohere"],
} as const;

export type ComposioToolCategory = keyof typeof COMPOSIO_TOOL_CATEGORIES;
