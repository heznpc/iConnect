// scripts/lib/codegen-helpers.mjs — unit tests.
//
// The helpers here drive every AppIntent struct name, parameter
// label, enum case name, and Shortcuts display string the Swift
// codegen emits. Output drift is already caught by gen:intents:check
// in CI, but a pure-function test at this layer fails faster + gives
// a specific error message when someone tweaks a helper without
// realising it also changes the wire-facing struct name for all 229
// intents.

import { describe, test, expect } from "@jest/globals";
import {
  SWIFT_RESERVED,
  swiftIdent,
  toPascalCase,
  intentStructName,
  swiftLit,
  humanizeKey,
  enumCaseName,
  enumCaseDisplayLabel,
  enumTypeName,
  intentActionNameFor,
} from "../scripts/lib/codegen-helpers.mjs";

describe("toPascalCase", () => {
  test("snake_case joins without underscore", () => {
    expect(toPascalCase("audit_log")).toBe("AuditLog");
    expect(toPascalCase("list_events")).toBe("ListEvents");
    expect(toPascalCase("today_events")).toBe("TodayEvents");
  });

  test("single-word stays title-cased", () => {
    expect(toPascalCase("doctor")).toBe("Doctor");
    expect(toPascalCase("SCREAMING")).toBe("Screaming");
  });

  test("non-word separators split (skill_focus-guardian → SkillFocusGuardian)", () => {
    expect(toPascalCase("skill_focus-guardian")).toBe("SkillFocusGuardian");
    expect(toPascalCase("gws.calendar.create")).toBe("GwsCalendarCreate");
  });

  test("digits preserved", () => {
    expect(toPascalCase("rfc_0007_intent")).toBe("Rfc0007Intent");
  });

  test("empty string → empty string", () => {
    expect(toPascalCase("")).toBe("");
  });
});

describe("intentStructName", () => {
  test("wraps toPascalCase with Intent suffix", () => {
    expect(intentStructName("list_events")).toBe("ListEventsIntent");
    expect(intentStructName("read_note")).toBe("ReadNoteIntent");
    expect(intentStructName("playback_control")).toBe("PlaybackControlIntent");
  });
});

describe("swiftIdent", () => {
  test("passes non-reserved names through", () => {
    expect(swiftIdent("id")).toBe("id");
    expect(swiftIdent("chatId")).toBe("chatId");
    expect(swiftIdent("startDate")).toBe("startDate");
  });

  test("suffixes reserved words with _", () => {
    expect(swiftIdent("default")).toBe("default_");
    expect(swiftIdent("class")).toBe("class_");
    expect(swiftIdent("case")).toBe("case_");
    expect(swiftIdent("switch")).toBe("switch_");
    expect(swiftIdent("in")).toBe("in_");
  });

  test("SWIFT_RESERVED contains expected core keywords", () => {
    // Spot-check the set — if any of these disappear a wire-contract
    // change slipped in.
    expect(SWIFT_RESERVED.has("default")).toBe(true);
    expect(SWIFT_RESERVED.has("case")).toBe(true);
    expect(SWIFT_RESERVED.has("func")).toBe(true);
    expect(SWIFT_RESERVED.has("typealias")).toBe(true);
  });
});

describe("swiftLit", () => {
  test("escapes backslashes and double-quotes", () => {
    expect(swiftLit('say "hi"')).toBe('say \\"hi\\"');
    expect(swiftLit("path\\with\\backslash")).toBe("path\\\\with\\\\backslash");
  });

  test("strips newlines (single-line literal form)", () => {
    expect(swiftLit("line 1\nline 2")).toBe("line 1 line 2");
    expect(swiftLit("line 1\r\nline 2")).toBe("line 1 line 2");
  });

  test("trims surrounding whitespace", () => {
    expect(swiftLit("  padded  ")).toBe("padded");
  });

  test("handles null / undefined without throwing", () => {
    expect(swiftLit(null)).toBe("");
    expect(swiftLit(undefined)).toBe("");
  });
});

describe("humanizeKey", () => {
  test("camelCase → spaced title case", () => {
    expect(humanizeKey("stepsToday")).toBe("Steps Today");
    expect(humanizeKey("sleepHoursLastNight")).toBe("Sleep Hours Last Night");
    expect(humanizeKey("id")).toBe("Id");
  });

  test("snake_case → spaced title case", () => {
    expect(humanizeKey("sleep_hours")).toBe("Sleep Hours");
    expect(humanizeKey("heart_rate_avg_7d")).toBe("Heart Rate Avg 7d");
  });

  test("kebab-case → spaced title case", () => {
    expect(humanizeKey("next-track")).toBe("Next Track");
  });

  test("single words stay title-cased", () => {
    expect(humanizeKey("temperature")).toBe("Temperature");
  });
});

describe("enumCaseName", () => {
  test("passes identifier-safe values through", () => {
    expect(enumCaseName("play")).toBe("play");
    expect(enumCaseName("nextTrack")).toBe("nextTrack");
    expect(enumCaseName("ok")).toBe("ok");
    expect(enumCaseName("AXConfirm")).toBe("AXConfirm");
  });

  test("reserved words get _ suffix", () => {
    expect(enumCaseName("default")).toBe("default_");
  });

  test("throws on identifier-unsafe values", () => {
    expect(() => enumCaseName("next-track")).toThrow(/not a safe Swift identifier/);
    expect(() => enumCaseName("2fast")).toThrow(/not a safe Swift identifier/);
    expect(() => enumCaseName("with space")).toThrow(/not a safe Swift identifier/);
    expect(() => enumCaseName("")).toThrow(/not a safe Swift identifier/);
  });
});

describe("enumCaseDisplayLabel", () => {
  test("camelCase → title-cased with spaces", () => {
    expect(enumCaseDisplayLabel("nextTrack")).toBe("Next Track");
    expect(enumCaseDisplayLabel("previousTrack")).toBe("Previous Track");
  });

  test("single-word values get first letter capitalised", () => {
    expect(enumCaseDisplayLabel("play")).toBe("Play");
    expect(enumCaseDisplayLabel("selection")).toBe("Selection");
    expect(enumCaseDisplayLabel("ok")).toBe("Ok");
  });

  test("preserves acronym boundaries (AXConfirm stays readable)", () => {
    // Only splits on lowercase-uppercase boundary. AXConfirm has no
    // such boundary at the start, so it stays as "AXConfirm" with
    // first letter already uppercase.
    expect(enumCaseDisplayLabel("AXConfirm")).toBe("AXConfirm");
  });
});

describe("enumTypeName", () => {
  test("tool + param combined into scoped name", () => {
    expect(enumTypeName("playback_control", "action")).toBe("PlaybackControlActionOption");
    expect(enumTypeName("memory_query", "kind")).toBe("MemoryQueryKindOption");
  });

  test("avoids collision when two tools share a param name", () => {
    expect(enumTypeName("memory_put", "kind")).toBe("MemoryPutKindOption");
    expect(enumTypeName("memory_query", "kind")).toBe("MemoryQueryKindOption");
    expect(enumTypeName("memory_put", "kind")).not.toBe(enumTypeName("memory_query", "kind"));
  });
});

describe("intentActionNameFor", () => {
  test("send_* / reply_* / post_* → .send", () => {
    expect(intentActionNameFor("send_mail")).toBe(".send");
    expect(intentActionNameFor("send_message")).toBe(".send");
    expect(intentActionNameFor("reply_mail")).toBe(".send");
    expect(intentActionNameFor("post_status")).toBe(".send");
  });

  test("everything else → .go (ConfirmationActionName limitation)", () => {
    expect(intentActionNameFor("delete_event")).toBe(".go");
    expect(intentActionNameFor("trash_file")).toBe(".go");
    expect(intentActionNameFor("update_reminder")).toBe(".go");
    expect(intentActionNameFor("system_power")).toBe(".go");
    expect(intentActionNameFor("quit_app")).toBe(".go");
  });

  test("non-destructive names also map (function is only called on destructive, but mapping is pure)", () => {
    expect(intentActionNameFor("list_events")).toBe(".go");
    expect(intentActionNameFor("read_note")).toBe(".go");
  });
});
