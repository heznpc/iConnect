import { usageTracker } from "./usage-tracker.js";

interface TimeContext {
  period: "morning" | "afternoon" | "evening" | "night";
  hour: number;
  isWeekend: boolean;
}

interface ProactiveBundle {
  timeContext: TimeContext;
  suggestedTools: Array<{ tool: string; reason: string }>;
  suggestedWorkflows: string[];
}

function getTimeContext(): TimeContext {
  const now = new Date();
  const hour = now.getHours();
  const day = now.getDay();
  const isWeekend = day === 0 || day === 6;

  let period: TimeContext["period"];
  if (hour >= 5 && hour < 12) period = "morning";
  else if (hour >= 12 && hour < 17) period = "afternoon";
  else if (hour >= 17 && hour < 21) period = "evening";
  else period = "night";

  return { period, hour, isWeekend };
}

const TIME_BASED_TOOLS: Record<string, Array<{ tool: string; reason: string }>> = {
  morning: [
    { tool: "today_events", reason: "Check today's schedule" },
    { tool: "list_reminders", reason: "Review due reminders" },
    { tool: "get_unread_count", reason: "Check new emails" },
  ],
  afternoon: [
    { tool: "today_events", reason: "Review remaining events" },
    { tool: "search_notes", reason: "Find meeting notes" },
    { tool: "list_reminders", reason: "Check afternoon tasks" },
  ],
  evening: [
    { tool: "get_upcoming_events", reason: "Preview tomorrow" },
    { tool: "create_reminder", reason: "Plan for tomorrow" },
    { tool: "now_playing", reason: "Control music" },
  ],
  night: [
    { tool: "health_sleep", reason: "Review sleep data" },
    { tool: "create_note", reason: "Journal or reflection" },
  ],
};

const WORKFLOW_SUGGESTIONS: Record<string, string[]> = {
  morning: ["morning-briefing", "daily-briefing"],
  afternoon: ["meeting-notes-to-reminders"],
  evening: ["weekly-digest"],
  night: [],
};

/** Generate a proactive context bundle for right now. */
export function generateProactiveContext(): ProactiveBundle {
  const timeContext = getTimeContext();

  // Start with time-based suggestions
  const timeSuggestions = TIME_BASED_TOOLS[timeContext.period] ?? [];

  // Enhance with usage patterns
  const patternSuggestions: Array<{ tool: string; reason: string }> = [];
  const stats = usageTracker.getStats();
  if (stats.totalCalls > 0) {
    // Find tools commonly used at this hour
    const topTools = stats.topTools.slice(0, 5);
    for (const t of topTools) {
      const next = usageTracker.getNextTools(t.tool, 2);
      for (const n of next) {
        if (!timeSuggestions.some(s => s.tool === n.tool) && !patternSuggestions.some(s => s.tool === n.tool)) {
          patternSuggestions.push({ tool: n.tool, reason: `Often used after ${t.tool} (${n.count}x)` });
        }
      }
    }
  }

  // Combine: time-based first, then pattern-based (deduplicated)
  const seen = new Set(timeSuggestions.map(s => s.tool));
  const combined = [...timeSuggestions];
  for (const s of patternSuggestions) {
    if (!seen.has(s.tool)) {
      combined.push(s);
      seen.add(s.tool);
    }
  }

  // Weekend adjustments
  if (timeContext.isWeekend) {
    // Remove work-focused tools on weekends
    const weekendFiltered = combined.filter(s =>
      !["get_unread_count", "search_notes"].includes(s.tool)
    );
    // Add leisure tools
    if (!weekendFiltered.some(s => s.tool === "now_playing")) {
      weekendFiltered.push({ tool: "now_playing", reason: "Weekend vibes" });
    }
    return {
      timeContext,
      suggestedTools: weekendFiltered.slice(0, 8),
      suggestedWorkflows: WORKFLOW_SUGGESTIONS[timeContext.period] ?? [],
    };
  }

  return {
    timeContext,
    suggestedTools: combined.slice(0, 8),
    suggestedWorkflows: WORKFLOW_SUGGESTIONS[timeContext.period] ?? [],
  };
}
