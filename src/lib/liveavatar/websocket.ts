/**
 * LiveAvatar WebSocket Client — LITE Mode
 *
 * Manages the WebSocket connection to LiveAvatar for sending audio commands
 * and receiving avatar state events. Used on the backend (agent-side) to
 * pipe ElevenLabs TTS audio to the avatar for lip-synced video.
 *
 * Audio spec: PCM 16-bit, 24KHz sample rate, base64 encoded
 * Chunk size: ~1 second recommended, max 1MB per packet
 *
 * Ported from London-Tech-Map. Reference: docs/HEYGEN_LTM_CONFIG.md
 */

import type {
  WebSocketCommand,
  WebSocketEvent,
  SessionState,
} from "./types";

export interface LiveAvatarWSCallbacks {
  onConnected?: () => void;
  onDisconnected?: () => void;
  onSpeakStarted?: (eventId: string) => void;
  onSpeakEnded?: (eventId: string) => void;
  onError?: (error: Error) => void;
  onStateChanged?: (state: SessionState) => void;
}

export class LiveAvatarWebSocket {
  private ws: WebSocket | null = null;
  private wsUrl: string;
  private callbacks: LiveAvatarWSCallbacks;
  private isConnected = false;
  private keepAliveInterval: ReturnType<typeof setInterval> | null = null;
  private eventCounter = 0;

  constructor(wsUrl: string, callbacks: LiveAvatarWSCallbacks = {}) {
    this.wsUrl = wsUrl;
    this.callbacks = callbacks;
  }

  /**
   * Connect to the LiveAvatar WebSocket.
   * Wait for the 'connected' state before sending any commands.
   */
  async connect(): Promise<void> {
    return new Promise((resolve, reject) => {
      try {
        this.ws = new WebSocket(this.wsUrl);

        this.ws.onopen = () => {
          console.log("[liveavatar-ws] WebSocket connection opened, waiting for connected state...");
        };

        this.ws.onmessage = (event) => {
          try {
            const data = JSON.parse(typeof event.data === "string" ? event.data : "") as WebSocketEvent;
            this.handleEvent(data, resolve);
          } catch (err) {
            console.warn("[liveavatar-ws] Failed to parse WebSocket message:", err);
          }
        };

        this.ws.onerror = (event) => {
          const error = new Error(`WebSocket error: ${JSON.stringify(event)}`);
          console.error("[liveavatar-ws]", error.message);
          this.callbacks.onError?.(error);
          reject(error);
        };

        this.ws.onclose = () => {
          console.log("[liveavatar-ws] WebSocket connection closed");
          this.isConnected = false;
          this.stopKeepAlive();
          this.callbacks.onDisconnected?.();
        };

        setTimeout(() => {
          if (!this.isConnected) {
            reject(new Error("WebSocket connection timeout — did not receive 'connected' state within 30s"));
          }
        }, 30_000);
      } catch (err) {
        reject(err);
      }
    });
  }

  private handleEvent(event: WebSocketEvent, connectResolve?: (value: void) => void): void {
    switch (event.type) {
      case "session.state_updated":
        console.log(`[liveavatar-ws] Session state: ${event.state}`);
        this.callbacks.onStateChanged?.(event.state);

        if (event.state === "connected") {
          this.isConnected = true;
          this.startKeepAlive();
          this.callbacks.onConnected?.();
          connectResolve?.();
        } else if (event.state === "closed" || event.state === "closing") {
          this.isConnected = false;
          this.stopKeepAlive();
          this.callbacks.onDisconnected?.();
        }
        break;

      case "agent.speak_started":
        console.log(`[liveavatar-ws] Avatar started speaking (event: ${event.event_id})`);
        this.callbacks.onSpeakStarted?.(event.event_id);
        break;

      case "agent.speak_ended":
        console.log(`[liveavatar-ws] Avatar finished speaking (event: ${event.event_id})`);
        this.callbacks.onSpeakEnded?.(event.event_id);
        break;

      default:
        console.log("[liveavatar-ws] Unknown event:", JSON.stringify(event));
    }
  }

  private send(command: WebSocketCommand): void {
    if (!this.ws || !this.isConnected) {
      throw new Error("WebSocket not connected. Wait for 'connected' state before sending commands.");
    }

    if (this.ws.readyState !== WebSocket.OPEN) {
      throw new Error(`WebSocket not in OPEN state (current: ${this.ws.readyState})`);
    }

    this.ws.send(JSON.stringify(command));
  }

  private nextEventId(): string {
    this.eventCounter++;
    return `evt_${Date.now()}_${this.eventCounter}`;
  }

  // ─── Public Commands ────────────────────────────────────────────────────────

  sendAudio(base64Audio: string): void {
    this.send({
      type: "agent.speak",
      audio: base64Audio,
    });
  }

  endSpeak(): string {
    const eventId = this.nextEventId();
    this.send({
      type: "agent.speak_end",
      event_id: eventId,
    });
    return eventId;
  }

  interrupt(): void {
    this.send({ type: "agent.interrupt" });
  }

  startListening(): string {
    const eventId = this.nextEventId();
    this.send({
      type: "agent.start_listening",
      event_id: eventId,
    });
    return eventId;
  }

  stopListening(): string {
    const eventId = this.nextEventId();
    this.send({
      type: "agent.stop_listening",
      event_id: eventId,
    });
    return eventId;
  }

  // ─── Keep-Alive ─────────────────────────────────────────────────────────────

  private startKeepAlive(): void {
    this.stopKeepAlive();
    this.keepAliveInterval = setInterval(() => {
      if (this.isConnected) {
        try {
          this.send({
            type: "session.keep_alive",
            event_id: this.nextEventId(),
          });
          console.log("[liveavatar-ws] Keep-alive sent");
        } catch (err) {
          console.warn("[liveavatar-ws] Keep-alive failed:", err);
        }
      }
    }, 3 * 60 * 1000);
  }

  private stopKeepAlive(): void {
    if (this.keepAliveInterval) {
      clearInterval(this.keepAliveInterval);
      this.keepAliveInterval = null;
    }
  }

  // ─── Connection State ───────────────────────────────────────────────────────

  get connected(): boolean {
    return this.isConnected;
  }

  disconnect(): void {
    this.stopKeepAlive();
    if (this.ws) {
      this.ws.close();
      this.ws = null;
    }
    this.isConnected = false;
  }
}
