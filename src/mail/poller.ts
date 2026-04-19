import { eventBus } from "../shared/event-bus.js";
import { runJxa } from "../shared/jxa.js";
import { createPollerLogger, registerPoller } from "../shared/pollers.js";
import { getUnreadCountScript } from "./scripts.js";

/**
 * Mail.app does not expose an AppleEvent notification for unread-count
 * changes, so we poll the existing JXA query at a configurable interval
 * and emit `mail_unread_changed` only when the total differs from the
 * last observed value.
 */

const MAIL_INTERVAL_MS = Math.max(10_000, parseInt(process.env.AIRMCP_MAIL_POLL_MS ?? "60000", 10));

interface UnreadPayload {
  totalUnread: number;
  mailboxes: Array<{ account: string; mailbox: string; unread: number }>;
}

let lastUnread: number | null = null;
const logError = createPollerLogger("mail_unread");

async function tick(): Promise<void> {
  try {
    const payload = await runJxa<UnreadPayload>(getUnreadCountScript(), "Mail");
    const total = typeof payload?.totalUnread === "number" ? payload.totalUnread : 0;
    if (lastUnread === null) {
      lastUnread = total;
      return; // First read — establish baseline, don't emit
    }
    if (total !== lastUnread) {
      const delta = total - lastUnread;
      const previous = lastUnread;
      lastUnread = total;
      eventBus.emitNodeEvent("mail_unread_changed", {
        source: "poll",
        totalUnread: total,
        previousUnread: previous,
        delta,
        mailboxes: payload.mailboxes ?? [],
      });
    }
  } catch (e) {
    logError(e);
  }
}

registerPoller({
  name: "mail_unread",
  event: "mail_unread_changed",
  intervalMs: MAIL_INTERVAL_MS,
  tick,
  reset: () => {
    lastUnread = null;
  },
});
