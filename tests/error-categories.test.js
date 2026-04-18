import { describe, test, expect } from "@jest/globals";

const {
  ERROR_CATEGORIES,
  CATEGORY_RETRYABLE,
  isErrorCategory,
  parseCategoryPrefix,
} = await import("../dist/shared/error-categories.js");

const {
  toolErr,
  errInvalidInput,
  errNotFound,
  errPermission,
  errUpstream,
  errJxa,
  errSwift,
  errDeprecated,
  errUnsupportedOS,
} = await import("../dist/shared/result.js");

describe("ERROR_CATEGORIES enum (RFC 0001)", () => {
  test("contains all categories from the RFC", () => {
    expect(ERROR_CATEGORIES).toEqual([
      "invalid_input",
      "not_found",
      "permission_denied",
      "hitl_timeout",
      "upstream_error",
      "upstream_timeout",
      "jxa_error",
      "swift_error",
      "rate_limited",
      "deprecated",
      "unsupported_os",
      "internal_error",
    ]);
  });

  test("has a retryable default for every category", () => {
    for (const cat of ERROR_CATEGORIES) {
      expect(CATEGORY_RETRYABLE[cat]).toEqual(expect.any(Boolean));
    }
  });

  test("retryable map is conservative — only time-based failures default to retryable", () => {
    expect(CATEGORY_RETRYABLE.rate_limited).toBe(true);
    expect(CATEGORY_RETRYABLE.upstream_timeout).toBe(true);
    expect(CATEGORY_RETRYABLE.invalid_input).toBe(false);
    expect(CATEGORY_RETRYABLE.permission_denied).toBe(false);
    expect(CATEGORY_RETRYABLE.not_found).toBe(false);
  });

  test("isErrorCategory accepts known, rejects unknown", () => {
    expect(isErrorCategory("not_found")).toBe(true);
    expect(isErrorCategory("internal_error")).toBe(true);
    expect(isErrorCategory("nonsense")).toBe(false);
    expect(isErrorCategory(undefined)).toBe(false);
    expect(isErrorCategory(123)).toBe(false);
  });
});

describe("parseCategoryPrefix", () => {
  test("extracts [category] prefix from canonical error text", () => {
    const r = parseCategoryPrefix("[not_found] Failed to find note: id=abc");
    expect(r).toEqual({ category: "not_found", rest: "Failed to find note: id=abc" });
  });

  test("returns null for unknown prefix", () => {
    expect(parseCategoryPrefix("[wat] foo")).toBeNull();
  });

  test("returns null for plain message without prefix", () => {
    expect(parseCategoryPrefix("Failed to find note")).toBeNull();
  });

  test("handles multi-line messages", () => {
    const r = parseCategoryPrefix("[jxa_error] AppleScript stderr\nline two");
    expect(r).toEqual({ category: "jxa_error", rest: "AppleScript stderr\nline two" });
  });
});

describe("toolErr — wire format", () => {
  test("produces a standard MCP error response", () => {
    const r = toolErr("not_found", "note xyz");
    expect(r.isError).toBe(true);
    expect(r.content).toEqual([{ type: "text", text: "[not_found] note xyz" }]);
    expect(r.structuredContent).toEqual({
      error: {
        category: "not_found",
        message: "note xyz",
        retryable: false,
      },
    });
  });

  test("carries hint as a second text line AND in structuredContent", () => {
    const r = toolErr("invalid_input", "id missing", { hint: "Pass an id=." });
    expect(r.content[0].text).toBe("[invalid_input] id missing\nHint: Pass an id=.");
    expect(r.structuredContent.error.hint).toBe("Pass an id=.");
  });

  test("retryAfterMs implies retryable=true when not explicitly set", () => {
    const r = toolErr("upstream_error", "503", { retryAfterMs: 2000 });
    expect(r.structuredContent.error.retryable).toBe(true);
    expect(r.structuredContent.error.retryAfterMs).toBe(2000);
  });

  test("explicit retryable overrides category default", () => {
    const r = toolErr("rate_limited", "burst", { retryable: false });
    expect(r.structuredContent.error.retryable).toBe(false);
  });

  test("cause propagates origin", () => {
    const r = toolErr("upstream_error", "oops", {
      cause: { code: "ENOTFOUND", origin: "network" },
    });
    expect(r.structuredContent.error.cause).toEqual({
      code: "ENOTFOUND",
      origin: "network",
    });
  });
});

describe("typed helpers", () => {
  test("errInvalidInput / errNotFound / errPermission use right category", () => {
    expect(errInvalidInput("a").structuredContent.error.category).toBe("invalid_input");
    expect(errNotFound("b").structuredContent.error.category).toBe("not_found");
    expect(errPermission("c").structuredContent.error.category).toBe("permission_denied");
  });

  test("errUpstream defaults to upstream_error without origin", () => {
    const r = errUpstream("upstream failed");
    expect(r.structuredContent.error.category).toBe("upstream_error");
    expect(r.structuredContent.error.cause).toBeUndefined();
  });

  test("errJxa auto-fills origin='jxa'", () => {
    const r = errJxa("applescript execution error");
    expect(r.structuredContent.error.category).toBe("jxa_error");
    expect(r.structuredContent.error.cause?.origin).toBe("jxa");
  });

  test("errJxa does not clobber a caller-specified code", () => {
    const r = errJxa("script ended unexpectedly", {
      cause: { code: "ERR_SCRIPT", origin: "jxa" },
    });
    expect(r.structuredContent.error.cause).toEqual({
      code: "ERR_SCRIPT",
      origin: "jxa",
    });
  });

  test("errSwift auto-fills origin='swift'", () => {
    const r = errSwift("helper crashed");
    expect(r.structuredContent.error.cause?.origin).toBe("swift");
  });

  test("errDeprecated surfaces hint when provided", () => {
    const r = errDeprecated("old_tool is gone", {
      hint: "Use new_tool instead",
    });
    expect(r.content[0].text).toContain("Use new_tool instead");
    expect(r.structuredContent.error.hint).toBe("Use new_tool instead");
  });

  test("errUnsupportedOS is categorised correctly", () => {
    const r = errUnsupportedOS("requires macOS 26");
    expect(r.structuredContent.error.category).toBe("unsupported_os");
    expect(r.structuredContent.error.retryable).toBe(false);
  });
});

describe("backward compatibility with legacy err()/toolError()", () => {
  test("parseCategoryPrefix recognises legacy [category] prefix format", () => {
    // toolError() in result.ts prefixes like "[not_found] Failed to ..."
    const legacyText = "[not_found] Failed to read note: missing id";
    const parsed = parseCategoryPrefix(legacyText);
    expect(parsed?.category).toBe("not_found");
  });
});
