/**
 * Preservation Property Tests — Dental/Eye/Hearing Non-Dropdown Behavior
 *
 * These tests run on UNFIXED code and are EXPECTED TO PASS.
 * They establish the baseline behavior that must be preserved after the fix:
 *   - Form submit handlers call the correct supabase insert with child_id = activeChildId
 *   - Selecting a child from the dropdown calls loadDentalList/loadEyeList/loadHearingList
 *     with the selected child's id
 *   - renderGrowth and renderDoctorVisits in child_health.module.js are not affected
 *
 * Property 2: Preservation — Non-Dropdown Behavior Unchanged
 * Validates: Requirements 3.1, 3.2, 3.3, 3.4
 */

import { jest } from "@jest/globals";

// ─── Shared mock state ────────────────────────────────────────────────────────
// We need a flexible mock that can be reconfigured per test.
// The insert mock captures the payload passed to it.

let mockInsertPayload = null;
let mockInsertError = null;

// Tracks calls to supabase.from(table).select(...).eq(...)
// for the children query (used by renderDental/Eye/Hearing internally)
let mockChildrenQueryResult = { data: [] };

// Tracks calls to supabase.from(table).select(*).eq(child_id, ...) for list loads
let mockListQueryResult = { data: [] };

const mockInsert = jest.fn().mockImplementation((payload) => {
  mockInsertPayload = payload;
  return Promise.resolve({ error: mockInsertError });
});

// We need a chainable mock for .select().eq().order().limit() and .select().eq()
// The from() mock routes based on table name.
const mockOrder = jest.fn().mockReturnValue({ data: [] });
const mockLimit = jest.fn().mockReturnValue({ data: [] });
const mockOrderWithLimit = jest.fn().mockReturnValue({ limit: mockLimit });

// eq mock for list queries — returns mockListQueryResult
const mockEqList = jest.fn().mockImplementation(() => ({
  order: jest.fn().mockReturnValue(mockListQueryResult),
}));

// eq mock for children query — returns mockChildrenQueryResult
const mockEqChildren = jest
  .fn()
  .mockImplementation(() => Promise.resolve(mockChildrenQueryResult));

// select mock — routes based on what was selected
const mockSelect = jest.fn().mockImplementation((fields) => {
  if (fields === "id, name") {
    // children query
    return { eq: mockEqChildren };
  }
  // list query (select("*"))
  return { eq: mockEqList };
});

const mockFrom = jest.fn().mockImplementation((table) => {
  return {
    select: mockSelect,
    insert: mockInsert,
  };
});

jest.unstable_mockModule("../supabase.js", () => ({
  supabase: {
    from: mockFrom,
  },
}));

jest.unstable_mockModule("../toast.js", () => ({
  toast: jest.fn(),
}));

// ─── Import after mocks ───────────────────────────────────────────────────────
const { renderDental, renderEye, renderHearing } =
  await import("../child_health_extra.js");

// ─── Helpers ──────────────────────────────────────────────────────────────────
function makeEl() {
  const el = document.createElement("div");
  document.body.appendChild(el);
  return el;
}

function cleanup(el) {
  if (el && el.parentNode) el.parentNode.removeChild(el);
}

function resetMocks() {
  mockInsertPayload = null;
  mockInsertError = null;
  mockFrom.mockClear();
  mockInsert.mockClear();
  mockEqChildren.mockClear();
  mockEqList.mockClear();
  mockSelect.mockClear();
}

// ─── Parameterized test data ──────────────────────────────────────────────────
// Simulates "for all non-empty children arrays and any childId in the array"
const childrenCases = [
  {
    label: "single child",
    children: [{ id: "child-1", name: "Alice" }],
    childId: "child-1",
  },
  {
    label: "two children, first selected",
    children: [
      { id: "child-1", name: "Alice" },
      { id: "child-2", name: "Bob" },
    ],
    childId: "child-1",
  },
  {
    label: "two children, second selected",
    children: [
      { id: "child-1", name: "Alice" },
      { id: "child-2", name: "Bob" },
    ],
    childId: "child-2",
  },
  {
    label: "three children, middle selected",
    children: [
      { id: "child-a", name: "Alice" },
      { id: "child-b", name: "Bob" },
      { id: "child-c", name: "Carol" },
    ],
    childId: "child-b",
  },
  {
    label: "child with special characters in name",
    children: [{ id: "child-x", name: "O'Brien Jr." }],
    childId: "child-x",
  },
];

// ─── DENTAL: Form submit preservation ────────────────────────────────────────

describe("Preservation: renderDental form submit calls insert with child_id = activeChildId", () => {
  /**
   * Property 2 (Preservation): For all non-empty children arrays and any childId
   * in the array, submitting the dental form calls
   * supabase.from("child_dental_records").insert(...) with child_id = activeChildId.
   *
   * Validates: Requirements 3.1, 3.2
   */
  test.each(childrenCases)(
    "dental form submit with $label",
    async ({ children, childId }) => {
      resetMocks();
      // Mock children query to return the test children
      mockChildrenQueryResult = { data: children };

      const el = makeEl();
      try {
        await renderDental(el, childId, "user-1", children);

        // Fill in the required date field
        const dateInput = el.querySelector("#dtDate");
        expect(dateInput).not.toBeNull();
        dateInput.value = "2024-06-15";

        // Submit the form
        const form = el.querySelector("#dentalForm");
        expect(form).not.toBeNull();
        form.dispatchEvent(new Event("submit", { bubbles: true }));

        // Wait for async handler
        await new Promise((r) => setTimeout(r, 0));

        // Assert insert was called with child_id = childId (the activeChildId)
        expect(mockInsert).toHaveBeenCalled();
        const payload = mockInsertPayload;
        expect(payload).not.toBeNull();
        expect(payload.child_id).toBe(childId);
      } finally {
        cleanup(el);
      }
    },
  );
});

// ─── DENTAL: Dropdown change calls loadDentalList ─────────────────────────────

describe("Preservation: selecting child from dental dropdown calls loadDentalList with that child's id", () => {
  /**
   * Property 2 (Preservation): When a child is selected from the dropdown,
   * supabase.from("child_dental_records").select("*").eq("child_id", selectedId)
   * is called — i.e., loadDentalList is invoked with the selected child's id.
   *
   * Validates: Requirements 3.1
   */
  test.each(childrenCases)(
    "dental dropdown change with $label",
    async ({ children, childId }) => {
      resetMocks();
      mockChildrenQueryResult = { data: children };

      const el = makeEl();
      try {
        // Render with no initial childId so no list load happens on render
        await renderDental(el, null, "user-1", children);

        // Reset call tracking after render
        mockFrom.mockClear();
        mockEqList.mockClear();
        mockSelect.mockClear();

        // Simulate selecting a child from the dropdown
        const sel = el.querySelector("#dentalChildSel");
        expect(sel).not.toBeNull();
        sel.value = childId;
        sel.dispatchEvent(new Event("change", { bubbles: true }));

        // Wait for async handler
        await new Promise((r) => setTimeout(r, 0));

        // Assert that from("child_dental_records") was called
        const dentalRecordsCalls = mockFrom.mock.calls.filter(
          ([table]) => table === "child_dental_records",
        );
        expect(dentalRecordsCalls.length).toBeGreaterThan(0);

        // Assert eq was called with the selected childId
        expect(mockEqList).toHaveBeenCalledWith("child_id", childId);
      } finally {
        cleanup(el);
      }
    },
  );
});

// ─── EYE: Form submit preservation ───────────────────────────────────────────

describe("Preservation: renderEye form submit calls insert with child_id = activeChildId", () => {
  /**
   * Property 2 (Preservation) for Eye tab.
   * Validates: Requirements 3.1, 3.2
   */
  test.each(childrenCases)(
    "eye form submit with $label",
    async ({ children, childId }) => {
      resetMocks();
      mockChildrenQueryResult = { data: children };

      const el = makeEl();
      try {
        await renderEye(el, childId, "user-1", children);

        const dateInput = el.querySelector("#eyDate");
        expect(dateInput).not.toBeNull();
        dateInput.value = "2024-06-15";

        const form = el.querySelector("#eyeForm");
        expect(form).not.toBeNull();
        form.dispatchEvent(new Event("submit", { bubbles: true }));

        await new Promise((r) => setTimeout(r, 0));

        expect(mockInsert).toHaveBeenCalled();
        expect(mockInsertPayload).not.toBeNull();
        expect(mockInsertPayload.child_id).toBe(childId);
      } finally {
        cleanup(el);
      }
    },
  );
});

// ─── EYE: Dropdown change calls loadEyeList ───────────────────────────────────

describe("Preservation: selecting child from eye dropdown calls loadEyeList with that child's id", () => {
  /**
   * Validates: Requirements 3.1
   */
  test.each(childrenCases)(
    "eye dropdown change with $label",
    async ({ children, childId }) => {
      resetMocks();
      mockChildrenQueryResult = { data: children };

      const el = makeEl();
      try {
        await renderEye(el, null, "user-1", children);

        mockFrom.mockClear();
        mockEqList.mockClear();
        mockSelect.mockClear();

        const sel = el.querySelector("#eyeChildSel");
        expect(sel).not.toBeNull();
        sel.value = childId;
        sel.dispatchEvent(new Event("change", { bubbles: true }));

        await new Promise((r) => setTimeout(r, 0));

        const eyeRecordsCalls = mockFrom.mock.calls.filter(
          ([table]) => table === "child_eye_records",
        );
        expect(eyeRecordsCalls.length).toBeGreaterThan(0);
        expect(mockEqList).toHaveBeenCalledWith("child_id", childId);
      } finally {
        cleanup(el);
      }
    },
  );
});

// ─── HEARING: Form submit preservation ───────────────────────────────────────

describe("Preservation: renderHearing form submit calls insert with child_id = activeChildId", () => {
  /**
   * Property 2 (Preservation) for Hearing tab.
   * Validates: Requirements 3.1, 3.2
   */
  test.each(childrenCases)(
    "hearing form submit with $label",
    async ({ children, childId }) => {
      resetMocks();
      mockChildrenQueryResult = { data: children };

      const el = makeEl();
      try {
        await renderHearing(el, childId, "user-1", children);

        const dateInput = el.querySelector("#hrDate");
        expect(dateInput).not.toBeNull();
        dateInput.value = "2024-06-15";

        const form = el.querySelector("#hearingForm");
        expect(form).not.toBeNull();
        form.dispatchEvent(new Event("submit", { bubbles: true }));

        await new Promise((r) => setTimeout(r, 0));

        expect(mockInsert).toHaveBeenCalled();
        expect(mockInsertPayload).not.toBeNull();
        expect(mockInsertPayload.child_id).toBe(childId);
      } finally {
        cleanup(el);
      }
    },
  );
});

// ─── HEARING: Dropdown change calls loadHearingList ──────────────────────────

describe("Preservation: selecting child from hearing dropdown calls loadHearingList with that child's id", () => {
  /**
   * Validates: Requirements 3.1
   */
  test.each(childrenCases)(
    "hearing dropdown change with $label",
    async ({ children, childId }) => {
      resetMocks();
      mockChildrenQueryResult = { data: children };

      const el = makeEl();
      try {
        await renderHearing(el, null, "user-1", children);

        mockFrom.mockClear();
        mockEqList.mockClear();
        mockSelect.mockClear();

        const sel = el.querySelector("#hearingChildSel");
        expect(sel).not.toBeNull();
        sel.value = childId;
        sel.dispatchEvent(new Event("change", { bubbles: true }));

        await new Promise((r) => setTimeout(r, 0));

        const hearingRecordsCalls = mockFrom.mock.calls.filter(
          ([table]) => table === "child_hearing_records",
        );
        expect(hearingRecordsCalls.length).toBeGreaterThan(0);
        expect(mockEqList).toHaveBeenCalledWith("child_id", childId);
      } finally {
        cleanup(el);
      }
    },
  );
});

// ─── renderGrowth and renderDoctorVisits are not affected ─────────────────────

describe("Preservation: renderGrowth and renderDoctorVisits in child_health.module.js are not modified", () => {
  /**
   * Property 2 (Preservation): The Growth and Doctor Visits tabs use their own
   * child-select logic in child_health.module.js and must not be affected by
   * any changes to child_health_extra.js.
   *
   * We verify this structurally: child_health_extra.js does NOT export
   * renderGrowth or renderDoctorVisits — those remain private to child_health.module.js.
   *
   * Validates: Requirements 3.3
   */
  test("child_health_extra.js does not export renderGrowth", async () => {
    const mod = await import("../child_health_extra.js");
    expect(mod.renderGrowth).toBeUndefined();
  });

  test("child_health_extra.js does not export renderDoctorVisits", async () => {
    const mod = await import("../child_health_extra.js");
    expect(mod.renderDoctorVisits).toBeUndefined();
  });

  test("renderDental, renderEye, renderHearing are exported from child_health_extra.js", async () => {
    const mod = await import("../child_health_extra.js");
    expect(typeof mod.renderDental).toBe("function");
    expect(typeof mod.renderEye).toBe("function");
    expect(typeof mod.renderHearing).toBe("function");
  });
});

// ─── loadDentalList called with childId on render (non-null childId) ──────────

describe("Preservation: loadDentalList is invoked with childId on render when childId is non-null", () => {
  /**
   * For all childId values that are non-null: loadDentalList is invoked with
   * that childId on render (i.e., supabase.from("child_dental_records") is
   * queried with eq("child_id", childId)).
   *
   * Validates: Requirements 3.1
   */
  const nonNullChildIds = [
    "child-1",
    "child-abc",
    "00000000-0000-0000-0000-000000000001",
    "some-uuid-value",
  ];

  test.each(nonNullChildIds)(
    "loadDentalList called with childId=%s on render",
    async (childId) => {
      resetMocks();
      mockChildrenQueryResult = { data: [{ id: childId, name: "Test Child" }] };

      const el = makeEl();
      try {
        await renderDental(el, childId, "user-1", [
          { id: childId, name: "Test Child" },
        ]);

        // Assert that from("child_dental_records") was called during render
        const dentalCalls = mockFrom.mock.calls.filter(
          ([table]) => table === "child_dental_records",
        );
        expect(dentalCalls.length).toBeGreaterThan(0);

        // Assert eq was called with the childId
        expect(mockEqList).toHaveBeenCalledWith("child_id", childId);
      } finally {
        cleanup(el);
      }
    },
  );

  test.each(nonNullChildIds)(
    "loadEyeList called with childId=%s on render",
    async (childId) => {
      resetMocks();
      mockChildrenQueryResult = { data: [{ id: childId, name: "Test Child" }] };

      const el = makeEl();
      try {
        await renderEye(el, childId, "user-1", [
          { id: childId, name: "Test Child" },
        ]);

        const eyeCalls = mockFrom.mock.calls.filter(
          ([table]) => table === "child_eye_records",
        );
        expect(eyeCalls.length).toBeGreaterThan(0);
        expect(mockEqList).toHaveBeenCalledWith("child_id", childId);
      } finally {
        cleanup(el);
      }
    },
  );

  test.each(nonNullChildIds)(
    "loadHearingList called with childId=%s on render",
    async (childId) => {
      resetMocks();
      mockChildrenQueryResult = {
        data: [{ id: childId, name: "Test Child" }],
      };

      const el = makeEl();
      try {
        await renderHearing(el, childId, "user-1", [
          { id: childId, name: "Test Child" },
        ]);

        const hearingCalls = mockFrom.mock.calls.filter(
          ([table]) => table === "child_hearing_records",
        );
        expect(hearingCalls.length).toBeGreaterThan(0);
        expect(mockEqList).toHaveBeenCalledWith("child_id", childId);
      } finally {
        cleanup(el);
      }
    },
  );
});
