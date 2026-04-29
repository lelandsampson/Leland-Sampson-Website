import { DAYS } from "./config.js";
import { parseTime, durationHours, formatTime } from "./time.js";
import { toBoolean } from "./csv.js";

export function buildModel(config) {
  const assets = buildAssets(config);
  const shiftsById = Object.fromEntries(config.shifts.map((shift) => [shift.id, shift]));
  return {
    assets,
    shifts: config.shifts,
    shiftsById,
    coverageRequirements: config.coverageRequirements,
    defaultAvailability: normalizeAvailability(config.defaultAvailability),
    roleEligibility: normalizeRoleEligibility(config.roleEligibility),
    targets: normalizeTargets(config.targets),
    configHash: config.configHash,
    rawConfig: config.raw,
  };
}

function buildAssets(config) {
  const ids = new Set();
  config.defaultAvailability.forEach((row) => ids.add(row.AssetID));
  config.roleEligibility.forEach((row) => ids.add(row.AssetID));
  config.targets.forEach((row) => ids.add(row.AssetID));
  return [...ids].filter(Boolean).sort().map((id) => ({ id, name: id, active: true }));
}

function normalizeAvailability(rows) {
  return rows.map((row) => ({
    assetId: row.AssetID,
    dayOfWeek: row.DayOfWeek,
    startMinute: parseTime(row.AvailableStart),
    endMinute: parseTime(row.AvailableEnd),
    timezone: row.Timezone || "America/New_York",
    notes: row.Notes || "",
    reviewer: normalizeReviewer(row.Reviewer),
  }));
}

function normalizeReviewer(value) {
  const trimmed = String(value || "").trim();
  if (!trimmed) return { all: false, shifts: new Set() };
  if (trimmed.toLowerCase() === "true") return { all: true, shifts: new Set() };
  if (trimmed.toLowerCase() === "false") return { all: false, shifts: new Set() };
  return { all: false, shifts: new Set(trimmed.split(";").map((item) => item.trim()).filter(Boolean)) };
}

function normalizeRoleEligibility(rows) {
  return rows.map((row) => ({
    assetId: row.AssetID,
    dayOfWeek: row.DayOfWeek,
    role: row.Role,
    eligible: toBoolean(row.Eligible),
    notes: row.Notes || "",
  }));
}

function normalizeTargets(rows) {
  const targets = {};
  rows.forEach((row) => {
    targets[row.AssetID] = {
      assetId: row.AssetID,
      minHours: Number(row.MinHours || 0),
      targetHours: Number(row.TargetHours || 0),
      maxHours: Number(row.MaxHours || 0),
      notes: row.Notes || "",
    };
  });
  return targets;
}

export function createSession(model, weekStart) {
  const weekDates = getWeekDates(weekStart);
  const weeklyPhoneEligibility = {};
  model.assets.forEach((asset) => {
    weeklyPhoneEligibility[asset.id] = isDefaultRoleEligible(model, asset.id, "Monday", "Phone");
  });
  return {
    schemaVersion: 1,
    weekStart,
    weekDates,
    configHash: model.configHash,
    weeklyUnavailability: [],
    weeklyPhoneEligibility,
    availabilityConfirmations: Object.fromEntries(model.assets.map((asset) => [asset.id, false])),
    assignments: [],
    warnings: [],
    selectedAssetId: model.assets[0]?.id || "",
    updatedAt: new Date().toISOString(),
  };
}

export function getWeekDates(weekStart) {
  const start = parseDate(weekStart);
  return DAYS.map((day, index) => {
    const date = new Date(start);
    date.setDate(start.getDate() + index);
    return { date: toDateKey(date), dayOfWeek: day };
  });
}

export function getMonday(date = new Date()) {
  const d = new Date(date.getFullYear(), date.getMonth(), date.getDate());
  const day = d.getDay();
  const diff = day === 0 ? -6 : 1 - day;
  d.setDate(d.getDate() + diff);
  return toDateKey(d);
}

export function addDays(dateKey, days) {
  const d = parseDate(dateKey);
  d.setDate(d.getDate() + days);
  return toDateKey(d);
}

export function parseDate(dateKey) {
  const [year, month, day] = dateKey.split("-").map(Number);
  return new Date(year, month - 1, day);
}

export function toDateKey(date) {
  return `${date.getFullYear()}-${String(date.getMonth() + 1).padStart(2, "0")}-${String(date.getDate()).padStart(2, "0")}`;
}

export function isDefaultRoleEligible(model, assetId, dayOfWeek, role) {
  return model.roleEligibility.some((entry) =>
    entry.assetId === assetId && entry.dayOfWeek === dayOfWeek && entry.role === role && entry.eligible
  );
}

export function getAvailability(model, assetId, dayOfWeek) {
  return model.defaultAvailability.find((entry) => entry.assetId === assetId && entry.dayOfWeek === dayOfWeek) || null;
}

export function isTimeAvailable(model, session, assetId, date, dayOfWeek, startMinute, endMinute) {
  const base = getAvailability(model, assetId, dayOfWeek);
  if (!base || base.startMinute === null || base.endMinute === null) return false;
  if (startMinute < base.startMinute || endMinute > base.endMinute) return false;
  return !session.weeklyUnavailability.some((block) => {
    if (block.assetId !== assetId || block.date !== date) return false;
    if (block.allDay) return true;
    return overlaps(startMinute, endMinute, block.startMinute, block.endMinute);
  });
}

export function isReviewerForShift(model, assetId, dayOfWeek, shiftId) {
  const availability = getAvailability(model, assetId, dayOfWeek);
  if (!availability) return false;
  if (availability.reviewer.all) return true;
  return availability.reviewer.shifts.has(shiftId);
}

export function makeAssignment({ date, dayOfWeek, shift, position, slotNumber, assetId, source = "generated", locked = false, partNumber = null, partCount = null }) {
  const roleCode = position === "Info Desk" ? "INFO" : "PHONE";
  const suffix = partNumber ? `-${partNumber}` : "";
  return {
    id: `${date}-${shift.id}-${roleCode}-${slotNumber}-${assetId || "EMPTY"}${suffix}-${uniqueId()}`,
    date,
    dayOfWeek,
    shiftId: shift.id,
    position,
    slotNumber,
    assetId,
    startMinute: shift.startMinute,
    endMinute: shift.endMinute,
    hours: durationHours(shift.startMinute, shift.endMinute),
    locked,
    isReviewer: false,
    source,
    warningCodes: [],
    partNumber,
    partCount,
  };
}

export function assignmentLabel(assignment) {
  return `${assignment.position} ${formatTime(assignment.startMinute)}-${formatTime(assignment.endMinute)}`;
}

export function overlaps(startA, endA, startB, endB) {
  return startA < endB && startB < endA;
}

function uniqueId() {
  if (globalThis.crypto?.randomUUID) return globalThis.crypto.randomUUID();
  return Math.random().toString(36).slice(2);
}
