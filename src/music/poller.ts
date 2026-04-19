import { eventBus } from "../shared/event-bus.js";
import { runJxa } from "../shared/jxa.js";
import { createPollerLogger, registerPoller } from "../shared/pollers.js";
import { nowPlayingScript } from "./scripts.js";

/**
 * Music.app's JXA query is cheap but each tick spawns an osascript process
 * and wakes the CPU; 30 s is a reasonable default for "is a track change
 * happening" without hammering battery. Consider migrating to the
 * `com.apple.Music.playerInfo` DistributedNotification for zero-cost events
 * once the Swift side is wired up.
 */

const MUSIC_INTERVAL_MS = Math.max(5_000, parseInt(process.env.AIRMCP_MUSIC_POLL_MS ?? "30000", 10));

interface NowPlayingPayload {
  playerState: string;
  track: { name: string; artist: string; album: string; duration?: number; playerPosition?: number } | null;
}

let lastTrackKey: string | null = null;
let lastPlayerState: string | null = null;
const logError = createPollerLogger("now_playing");

async function tick(): Promise<void> {
  try {
    const payload = await runJxa<NowPlayingPayload>(nowPlayingScript(), "Music");
    const state = payload?.playerState ?? "stopped";
    const track = payload?.track;
    const key = track ? `${track.artist ?? ""}|${track.album ?? ""}|${track.name ?? ""}` : "";
    if (lastTrackKey === null && lastPlayerState === null) {
      lastTrackKey = key;
      lastPlayerState = state;
      return; // Baseline
    }
    const trackChanged = key !== lastTrackKey;
    const stateChanged = state !== lastPlayerState;
    if (trackChanged || stateChanged) {
      const previousState = lastPlayerState;
      lastTrackKey = key;
      lastPlayerState = state;
      eventBus.emitNodeEvent("now_playing_changed", {
        source: "poll",
        playerState: state,
        previousPlayerState: previousState,
        trackChanged,
        track: track ?? null,
      });
    }
  } catch (e) {
    logError(e);
  }
}

registerPoller({
  name: "now_playing",
  event: "now_playing_changed",
  intervalMs: MUSIC_INTERVAL_MS,
  tick,
  reset: () => {
    lastTrackKey = null;
    lastPlayerState = null;
  },
});
