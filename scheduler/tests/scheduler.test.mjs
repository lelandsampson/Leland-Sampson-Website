import assert from "node:assert/strict";
import { generateSchedule } from "../scheduler.js";
import { validateSession, WARNING } from "../validation.js";
import { makeAssignment } from "../model.js";

const shifts = [
  shift("MORNING", 480, 720, 4),
  shift("AFTERNOON", 720, 960, 4),
  shift("EVENING", 960, 1170, 3.5),
  shift("PHONE_0800", 480, 600, 2),
  shift("PHONE_1000", 600, 720, 2),
  shift("PHONE_1200", 720, 840, 2),
  shift("PHONE_1400", 840, 960, 2),
];

const shiftsById = Object.fromEntries(shifts.map((item) => [item.id, item]));

function shift(id, startMinute, endMinute, hours) {
  return { id, label: id, startMinute, endMinute, hours, active: true };
}

function model({ assets, availability, roles, targets = {}, coverageRequirements }) {
  return {
    assets: assets.map((id) => ({ id, name: id, active: true })),
    shifts,
    shiftsById,
    coverageRequirements,
    defaultAvailability: availability,
    roleEligibility: roles,
    targets,
  };
}

function available(assetId, dayOfWeek = "Monday", startMinute = 480, endMinute = 1170, reviewer = false) {
  return { assetId, dayOfWeek, startMinute, endMinute, timezone: "America/New_York", notes: "", reviewer: { all: reviewer, shifts: new Set() } };
}

function role(assetId, roleName, dayOfWeek = "Monday", eligible = true) {
  return { assetId, dayOfWeek, role: roleName, eligible, notes: "" };
}

function session(overrides = {}) {
  return {
    schemaVersion: 1,
    weekStart: "2026-05-04",
    weekDates: [{ date: "2026-05-04", dayOfWeek: "Monday" }],
    weeklyUnavailability: [],
    weeklyPhoneEligibility: {},
    availabilityConfirmations: {},
    assignments: [],
    warnings: [],
    ...overrides,
  };
}

function target(assetId, maxHours = 40, targetHours = 20, minHours = 0) {
  return { assetId, minHours, targetHours, maxHours };
}

function coverage(shiftId, position, requiredAssets = 1, dayOfWeek = "Monday") {
  return { dayOfWeek, shiftId, position, requiredAssets };
}

function run(name, fn) {
  try {
    fn();
    console.log(`PASS ${name}`);
  } catch (error) {
    console.error(`FAIL ${name}`);
    throw error;
  }
}

run("prioritizes Info Desk over Phone when one asset can fill either", () => {
  const m = model({
    assets: ["A"],
    availability: [available("A")],
    roles: [role("A", "Info Desk"), role("A", "Phone")],
    targets: { A: target("A", 4) },
    coverageRequirements: [coverage("MORNING", "Info Desk"), coverage("PHONE_0800", "Phone")],
  });
  const s = generateSchedule(m, session({ weeklyPhoneEligibility: { A: true } }));
  assert.equal(s.assignments.find((a) => a.position === "Info Desk").assetId, "A");
  assert.equal(s.assignments.find((a) => a.position === "Phone").assetId, "");
});

run("does not assign the same asset to multiple Monday phone blocks", () => {
  const m = model({
    assets: ["A", "B"],
    availability: [available("A"), available("B")],
    roles: ["A", "B"].flatMap((id) => [role(id, "Phone")]),
    targets: { A: target("A", 8), B: target("B", 8) },
    coverageRequirements: [coverage("PHONE_0800", "Phone"), coverage("PHONE_1000", "Phone"), coverage("PHONE_1200", "Phone")],
  });
  const s = generateSchedule(m, session({ weeklyPhoneEligibility: { A: true, B: true } }));
  const phoneAssets = s.assignments.filter((a) => a.assetId).map((a) => a.assetId);
  assert.equal(new Set(phoneAssets).size, phoneAssets.length);
  assert.ok(s.assignments.some((a) => !a.assetId));
});

run("splits Morning Info Desk only when full block is infeasible", () => {
  const m = model({
    assets: ["A", "B"],
    availability: [available("A"), available("B")],
    roles: ["A", "B"].map((id) => role(id, "Info Desk")),
    targets: { A: target("A", 4), B: target("B", 4) },
    coverageRequirements: [coverage("MORNING", "Info Desk")],
  });
  const s = generateSchedule(m, session({
    weeklyUnavailability: [
      { assetId: "A", date: "2026-05-04", dayOfWeek: "Monday", startMinute: 600, endMinute: 720, allDay: false },
      { assetId: "B", date: "2026-05-04", dayOfWeek: "Monday", startMinute: 480, endMinute: 600, allDay: false },
    ],
  }));
  assert.equal(s.assignments.length, 2);
  assert.deepEqual(s.assignments.map((a) => [a.assetId, a.startMinute, a.endMinute]), [["A", 480, 600], ["B", 600, 720]]);
});

run("split Info Desk still fills two required assets across both halves", () => {
  const m = model({
    assets: ["A", "B", "C", "D"],
    availability: ["A", "B", "C", "D"].map((id) => available(id)),
    roles: ["A", "B", "C", "D"].map((id) => role(id, "Info Desk")),
    targets: Object.fromEntries(["A", "B", "C", "D"].map((id) => [id, target(id, 4)])),
    coverageRequirements: [coverage("MORNING", "Info Desk", 2)],
  });
  const s = generateSchedule(m, session({
    weeklyUnavailability: [
      { assetId: "A", date: "2026-05-04", dayOfWeek: "Monday", startMinute: 600, endMinute: 720, allDay: false },
      { assetId: "B", date: "2026-05-04", dayOfWeek: "Monday", startMinute: 600, endMinute: 720, allDay: false },
      { assetId: "C", date: "2026-05-04", dayOfWeek: "Monday", startMinute: 480, endMinute: 600, allDay: false },
      { assetId: "D", date: "2026-05-04", dayOfWeek: "Monday", startMinute: 480, endMinute: 600, allDay: false },
    ],
  }));
  const result = validateSession(m, s);
  assert.equal(s.assignments.length, 4);
  assert.equal(s.assignments.filter((a) => a.assetId).length, 4);
  assert.ok(s.assignments.every((a) => a.partCount === 2));
  assert.ok(!result.warnings.some((w) => w.code === WARNING.UNCOVERED_SLOT));
});

run("locked invalid assignment blocks auto-generation from reusing asset that day", () => {
  const m = model({
    assets: ["A", "B"],
    availability: [available("A"), available("B")],
    roles: ["A", "B"].flatMap((id) => [role(id, "Info Desk"), role(id, "Phone")]),
    targets: { A: target("A", 8), B: target("B", 8) },
    coverageRequirements: [coverage("PHONE_0800", "Phone")],
  });
  const locked = makeAssignment({ date: "2026-05-04", dayOfWeek: "Monday", shift: shiftsById.MORNING, position: "Info Desk", slotNumber: 1, assetId: "A", locked: true });
  const s = generateSchedule(m, session({ assignments: [locked], weeklyPhoneEligibility: { A: true, B: true } }));
  assert.equal(s.assignments.find((a) => a.position === "Phone").assetId, "B");
});

run("validation warns for manual unavailable and multiple phone assignments", () => {
  const m = model({
    assets: ["A"],
    availability: [available("A")],
    roles: [role("A", "Phone")],
    targets: { A: target("A", 8) },
    coverageRequirements: [coverage("PHONE_0800", "Phone"), coverage("PHONE_1000", "Phone")],
  });
  const a = makeAssignment({ date: "2026-05-04", dayOfWeek: "Monday", shift: shiftsById.PHONE_0800, position: "Phone", slotNumber: 1, assetId: "A", locked: true });
  const b = makeAssignment({ date: "2026-05-04", dayOfWeek: "Monday", shift: shiftsById.PHONE_1000, position: "Phone", slotNumber: 1, assetId: "A", locked: true });
  const result = validateSession(m, session({
    assignments: [a, b],
    weeklyPhoneEligibility: { A: false },
    weeklyUnavailability: [{ assetId: "A", date: "2026-05-04", dayOfWeek: "Monday", startMinute: 480, endMinute: 600, allDay: false }],
  }));
  const codes = new Set(result.warnings.map((w) => w.code));
  assert.ok(codes.has(WARNING.UNAVAILABLE));
  assert.ok(codes.has(WARNING.PHONE_NOT_WEEKLY_ELIGIBLE));
  assert.ok(codes.has(WARNING.MULTIPLE_PHONE_BLOCKS));
});

run("validation warns when a block has too many assigned assets", () => {
  const m = model({
    assets: ["A", "B"],
    availability: [available("A"), available("B")],
    roles: ["A", "B"].map((id) => role(id, "Info Desk")),
    targets: { A: target("A", 8), B: target("B", 8) },
    coverageRequirements: [coverage("MORNING", "Info Desk", 1)],
  });
  const a = makeAssignment({ date: "2026-05-04", dayOfWeek: "Monday", shift: shiftsById.MORNING, position: "Info Desk", slotNumber: 1, assetId: "A", locked: true });
  const b = makeAssignment({ date: "2026-05-04", dayOfWeek: "Monday", shift: shiftsById.MORNING, position: "Info Desk", slotNumber: 1, assetId: "B", locked: true });
  const result = validateSession(m, session({ assignments: [a, b] }));
  const codes = new Set(result.warnings.map((w) => w.code));
  assert.ok(codes.has(WARNING.TOO_MANY_ASSIGNED_TO_SHIFT));
});

run("target balance outranks reviewer preference", () => {
  const m = model({
    assets: ["NR", "RV"],
    availability: [available("NR"), available("RV", "Monday", 480, 1170, true)],
    roles: ["NR", "RV"].map((id) => role(id, "Info Desk")),
    targets: { NR: target("NR", 8, 8), RV: target("RV", 8, 8) },
    coverageRequirements: [coverage("MORNING", "Info Desk")],
  });
  const existing = makeAssignment({ date: "2026-05-03", dayOfWeek: "Sunday", shift: shiftsById.MORNING, position: "Info Desk", slotNumber: 1, assetId: "RV", locked: true });
  const s = generateSchedule(m, session({ assignments: [existing] }));
  const monday = s.assignments.find((a) => a.date === "2026-05-04" && a.position === "Info Desk");
  assert.equal(monday.assetId, "NR");
});
