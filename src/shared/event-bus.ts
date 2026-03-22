import { EventEmitter } from "node:events";

export interface AirMCPEvent {
  type: "calendar_changed" | "reminders_changed" | "pasteboard_changed";
  data: Record<string, unknown>;
  timestamp: string;
}

const VALID_EVENT_TYPES = new Set(["calendar_changed", "reminders_changed", "pasteboard_changed"]);

class EventBus extends EventEmitter {
  private running = false;

  constructor() {
    super();
    this.setMaxListeners(25);
  }

  /** Process a raw event line from the Swift bridge. */
  processLine(line: string): void {
    try {
      const parsed = JSON.parse(line);
      if (parsed.event && VALID_EVENT_TYPES.has(parsed.event)) {
        const event: AirMCPEvent = {
          type: parsed.event,
          data: parsed.data ?? {},
          timestamp: parsed.timestamp ?? new Date().toISOString(),
        };
        this.emit("event", event);
        this.emit(event.type, event);
      }
    } catch {
      // Not an event line — ignore
    }
  }

  /** Check if the event bus is active. */
  get isRunning(): boolean {
    return this.running;
  }

  /** Mark as running. */
  start(): void {
    this.running = true;
  }

  /** Mark as stopped and remove all listeners. */
  stop(): void {
    this.running = false;
    this.removeAllListeners();
  }
}

export const eventBus = new EventBus();
