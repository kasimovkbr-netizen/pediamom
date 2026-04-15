/**
 * Bug Condition Exploration Tests — Dental/Eye/Hearing Child Dropdown
 *
 * These tests verify the FIX: renderDental/renderEye/renderHearing now accept
 * a `children` parameter and populate the dropdown from it WITHOUT querying
 * Supabase for children internally.
 *
 * Validates: Requirements 1.1, 1.2, 1.3, 2.1, 2.2, 2.3
 */

import { jest } from "@jest/globals";

// ─── Mock supabase module ─────────────────────────────────────────────────────
// We track calls to mockFrom to assert that "children" table is NOT queried.
// The chain: from(table).select(...).eq(...).order(...) → { data: [] }

const mockOrder = jest.fn().mockResolvedValue({ data: [] });
const mockEq = jest.fn().mockReturnValue({ order: mockOrder });
const mockSelect = jest.fn().mockReturnValue({ eq: mockEq });
const mockFrom = jest.fn().mockReturnValue({ select: mockSelect });

jest.unstable_mockModule("../supabase.js", () => ({
  supabase: {
    from: mockFrom,
  },
}));

// ─── Mock toast module ────────────────────────────────────────────────────────
jest.unstable_mockModule("../toast.js", () => ({
  toast: jest.fn(),
}));

// ─── Import after mocks are set up ───────────────────────────────────────────
const { renderDental, renderEye, renderHearing } =
  await import("../child_health_extra.js");

// ─── Helper: create a fresh DOM container ────────────────────────────────────
function makeEl() {
  const el = document.createElement("div");
  document.body.appendChild(el);
  return el;
}

function cleanup(el) {
  if (el && el.parentNode) el.parentNode.removeChild(el);
}

const TEST_CHILDREN = [{ id: "child-1", name: "Alice" }];

// ─── Tests ───────────────────────────────────────────────────────────────────

describe("Fix Verified: renderDental populates dropdown from passed-in children array", () => {
  beforeEach(() => {
    mockFrom.mockClear();
    mockSelect.mockClear();
    mockEq.mockClear();
    mockOrder.mockClear();
  });

  /**
   * Property 1 (Expected Behavior): When renderDental is called with a children
   * array, the rendered <select id="dentalChildSel"> contains exactly those
   * child options — no Supabase query for "children" is made.
   *
   * Validates: Requirements 1.1, 1.2, 2.1
   */
  test("renderDental(el, null, 'user-1', [{id:'child-1', name:'Alice'}]) — dropdown has 1 child option", async () => {
    const el = makeEl();
    try {
      await renderDental(el, null, "user-1", TEST_CHILDREN);

      const select = el.querySelector("#dentalChildSel");
      expect(select).not.toBeNull();

      const childOptions = Array.from(select.options).filter(
        (o) => o.value !== "",
      );
      expect(childOptions.length).toBe(1);
      expect(childOptions[0].value).toBe("child-1");
      expect(childOptions[0].textContent).toBe("Alice");
    } finally {
      cleanup(el);
    }
  });

  test("renderDental — does NOT query Supabase for 'children' table", async () => {
    const el = makeEl();
    try {
      await renderDental(el, null, "user-1", TEST_CHILDREN);

      // Verify mockFrom was never called with "children"
      const childrenCalls = mockFrom.mock.calls.filter(
        (args) => args[0] === "children",
      );
      expect(childrenCalls.length).toBe(0);
    } finally {
      cleanup(el);
    }
  });
});

describe("Fix Verified: renderEye populates dropdown from passed-in children array", () => {
  beforeEach(() => {
    mockFrom.mockClear();
    mockSelect.mockClear();
    mockEq.mockClear();
    mockOrder.mockClear();
  });

  /**
   * Property 1 (Expected Behavior) for Eye tab.
   * Validates: Requirements 1.1, 1.2, 2.2
   */
  test("renderEye(el, null, 'user-1', [{id:'child-1', name:'Alice'}]) — dropdown has 1 child option", async () => {
    const el = makeEl();
    try {
      await renderEye(el, null, "user-1", TEST_CHILDREN);

      const select = el.querySelector("#eyeChildSel");
      expect(select).not.toBeNull();

      const childOptions = Array.from(select.options).filter(
        (o) => o.value !== "",
      );
      expect(childOptions.length).toBe(1);
      expect(childOptions[0].value).toBe("child-1");
      expect(childOptions[0].textContent).toBe("Alice");
    } finally {
      cleanup(el);
    }
  });

  test("renderEye — does NOT query Supabase for 'children' table", async () => {
    const el = makeEl();
    try {
      await renderEye(el, null, "user-1", TEST_CHILDREN);

      const childrenCalls = mockFrom.mock.calls.filter(
        (args) => args[0] === "children",
      );
      expect(childrenCalls.length).toBe(0);
    } finally {
      cleanup(el);
    }
  });
});

describe("Fix Verified: renderHearing populates dropdown from passed-in children array", () => {
  beforeEach(() => {
    mockFrom.mockClear();
    mockSelect.mockClear();
    mockEq.mockClear();
    mockOrder.mockClear();
  });

  /**
   * Property 1 (Expected Behavior) for Hearing tab.
   * Validates: Requirements 1.1, 1.2, 2.3
   */
  test("renderHearing(el, null, 'user-1', [{id:'child-1', name:'Alice'}]) — dropdown has 1 child option", async () => {
    const el = makeEl();
    try {
      await renderHearing(el, null, "user-1", TEST_CHILDREN);

      const select = el.querySelector("#hearingChildSel");
      expect(select).not.toBeNull();

      const childOptions = Array.from(select.options).filter(
        (o) => o.value !== "",
      );
      expect(childOptions.length).toBe(1);
      expect(childOptions[0].value).toBe("child-1");
      expect(childOptions[0].textContent).toBe("Alice");
    } finally {
      cleanup(el);
    }
  });

  test("renderHearing — does NOT query Supabase for 'children' table", async () => {
    const el = makeEl();
    try {
      await renderHearing(el, null, "user-1", TEST_CHILDREN);

      const childrenCalls = mockFrom.mock.calls.filter(
        (args) => args[0] === "children",
      );
      expect(childrenCalls.length).toBe(0);
    } finally {
      cleanup(el);
    }
  });
});
