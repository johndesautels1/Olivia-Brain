/**
 * OLIVIA BRAIN - TWILIO SIP TRUNK
 * ================================
 *
 * SIP trunk integration for enterprise telephony.
 *
 * Features:
 * - Origination (outbound calls via SIP)
 * - Termination (inbound calls to SIP)
 * - Credential management
 * - IP ACL configuration
 */

import { getServerEnv } from "@/lib/config/env";
import { withTraceSpan } from "@/lib/observability/tracer";
import type { SIPConfig } from "./types";

export function isSIPConfigured(): boolean {
  const env = getServerEnv();
  // SIP requires Twilio account with SIP trunking enabled
  return Boolean(
    env.TWILIO_ACCOUNT_SID &&
    env.TWILIO_AUTH_TOKEN
  );
}

interface SIPTrunk {
  sid: string;
  friendlyName: string;
  domainName: string;
  secure: boolean;
}

/**
 * List SIP trunks
 */
export async function listSIPTrunks(): Promise<SIPTrunk[]> {
  const env = getServerEnv();

  if (!isSIPConfigured()) {
    throw new Error("Twilio SIP not configured");
  }

  const auth = `${env.TWILIO_ACCOUNT_SID}:${env.TWILIO_AUTH_TOKEN}`;

  const response = await fetch(
    `https://trunking.twilio.com/v1/Trunks`,
    {
      headers: {
        Authorization: `Basic ${Buffer.from(auth).toString("base64")}`,
      },
    }
  );

  if (!response.ok) {
    throw new Error(`Twilio SIP error: ${response.status}`);
  }

  const data = await response.json();
  return data.trunks.map((trunk: any) => ({
    sid: trunk.sid,
    friendlyName: trunk.friendly_name,
    domainName: trunk.domain_name,
    secure: trunk.secure,
  }));
}

/**
 * Create a SIP trunk
 */
export async function createSIPTrunk(
  friendlyName: string,
  options?: {
    secure?: boolean;
    cnamLookupEnabled?: boolean;
  }
): Promise<SIPTrunk> {
  const env = getServerEnv();

  if (!isSIPConfigured()) {
    throw new Error("Twilio SIP not configured");
  }

  return withTraceSpan(
    "olivia.sip_create_trunk",
    {
      "olivia.trunk_name": friendlyName,
    },
    async () => {
      const auth = `${env.TWILIO_ACCOUNT_SID}:${env.TWILIO_AUTH_TOKEN}`;

      const params = new URLSearchParams({
        FriendlyName: friendlyName,
      });

      if (options?.secure !== undefined) {
        params.set("Secure", String(options.secure));
      }

      if (options?.cnamLookupEnabled !== undefined) {
        params.set("CnamLookupEnabled", String(options.cnamLookupEnabled));
      }

      const response = await fetch(
        `https://trunking.twilio.com/v1/Trunks`,
        {
          method: "POST",
          headers: {
            Authorization: `Basic ${Buffer.from(auth).toString("base64")}`,
            "Content-Type": "application/x-www-form-urlencoded",
          },
          body: params,
        }
      );

      if (!response.ok) {
        const error = await response.text();
        throw new Error(`Twilio SIP error: ${response.status} - ${error}`);
      }

      const trunk = await response.json();

      return {
        sid: trunk.sid,
        friendlyName: trunk.friendly_name,
        domainName: trunk.domain_name,
        secure: trunk.secure,
      };
    }
  );
}

/**
 * Configure origination URI for a trunk
 */
export async function configureOrigination(
  trunkSid: string,
  originationUrl: string,
  options?: {
    weight?: number;
    priority?: number;
    enabled?: boolean;
  }
): Promise<void> {
  const env = getServerEnv();

  if (!isSIPConfigured()) {
    throw new Error("Twilio SIP not configured");
  }

  const auth = `${env.TWILIO_ACCOUNT_SID}:${env.TWILIO_AUTH_TOKEN}`;

  const params = new URLSearchParams({
    SipUrl: originationUrl,
  });

  if (options?.weight !== undefined) {
    params.set("Weight", String(options.weight));
  }

  if (options?.priority !== undefined) {
    params.set("Priority", String(options.priority));
  }

  if (options?.enabled !== undefined) {
    params.set("Enabled", String(options.enabled));
  }

  const response = await fetch(
    `https://trunking.twilio.com/v1/Trunks/${trunkSid}/OriginationUrls`,
    {
      method: "POST",
      headers: {
        Authorization: `Basic ${Buffer.from(auth).toString("base64")}`,
        "Content-Type": "application/x-www-form-urlencoded",
      },
      body: params,
    }
  );

  if (!response.ok) {
    const error = await response.text();
    throw new Error(`Twilio SIP error: ${response.status} - ${error}`);
  }
}

/**
 * Generate SIP URI for a phone number
 */
export function generateSIPUri(
  phoneNumber: string,
  domain: string
): string {
  // Normalize phone number (remove +, spaces, etc.)
  const normalized = phoneNumber.replace(/[^\d]/g, "");
  return `sip:${normalized}@${domain}`;
}

/**
 * Parse SIP URI
 */
export function parseSIPUri(uri: string): {
  user: string;
  domain: string;
  parameters?: Record<string, string>;
} | null {
  const match = uri.match(/^sip:([^@]+)@([^;]+)(;.*)?$/);

  if (!match) {
    return null;
  }

  const parameters: Record<string, string> = {};
  if (match[3]) {
    const paramString = match[3].substring(1); // Remove leading ;
    paramString.split(";").forEach((param) => {
      const [key, value] = param.split("=");
      if (key) {
        parameters[key] = value ?? "";
      }
    });
  }

  return {
    user: match[1],
    domain: match[2],
    parameters: Object.keys(parameters).length > 0 ? parameters : undefined,
  };
}

/**
 * Delete a SIP trunk
 */
export async function deleteSIPTrunk(trunkSid: string): Promise<void> {
  const env = getServerEnv();

  if (!isSIPConfigured()) {
    throw new Error("Twilio SIP not configured");
  }

  const auth = `${env.TWILIO_ACCOUNT_SID}:${env.TWILIO_AUTH_TOKEN}`;

  await fetch(
    `https://trunking.twilio.com/v1/Trunks/${trunkSid}`,
    {
      method: "DELETE",
      headers: {
        Authorization: `Basic ${Buffer.from(auth).toString("base64")}`,
      },
    }
  );
}
