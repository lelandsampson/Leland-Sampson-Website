import { makeAssignment, isDefaultRoleEligible, isReviewerForShift, isTimeAvailable } from "./model.js";
import { scheduledHours } from "./validation.js";

const SPLIT_SHIFT_PARTS = {
  MORNING: [
    { partNumber: 1, partCount: 2, startMinute: 8 * 60, endMinute: 10 * 60 },
    { partNumber: 2, partCount: 2, startMinute: 10 * 60, endMinute: 12 * 60 },
  ],
  AFTERNOON: [
    { partNumber: 1, partCount: 2, startMinute: 12 * 60, endMinute: 14 * 60 },
    { partNumber: 2, partCount: 2, startMinute: 14 * 60, endMinute: 16 * 60 },
  ],
};

export function generateSchedule(model, session, { preserveLocked = true } = {}) {
  const locked = preserveLocked ? session.assignments.filter((item) => item.locked) : [];
  const assignments = [...locked];
  const totals = scheduledHours(assignments);
  const dayUsage = buildDayUsage(assignments);
  const sortedRequirements = [...model.coverageRequirements].sort(requirementSort);

  for (const day of session.weekDates) {
    for (const requirement of sortedRequirements.filter((item) => item.dayOfWeek === day.dayOfWeek)) {
      const shift = model.shiftsById[requirement.shiftId];
      for (let slot = 1; slot <= requirement.requiredAssets; slot += 1) {
        if (hasLockedSlot(assignments, day.date, requirement, slot)) continue;
        const fullAssignment = createBestAssignment(model, session, day, shift, requirement.position, slot, totals, dayUsage);
        if (fullAssignment.assetId || !canSplit(requirement)) {
          commitAssignment(model, assignments, totals, dayUsage, fullAssignment);
          continue;
        }
        createSplitAssignments(model, session, day, shift, requirement.position, slot, totals, dayUsage)
          .forEach((assignment) => commitAssignment(model, assignments, totals, dayUsage, assignment));
      }
    }
  }

  return { ...session, assignments };
}

function requirementSort(a, b) {
  if (a.position !== b.position) return a.position === "Info Desk" ? -1 : 1;
  return shiftOrder(a.shiftId) - shiftOrder(b.shiftId);
}

function shiftOrder(id) {
  return ["MORNING", "AFTERNOON", "EVENING", "PHONE_0800", "PHONE_1000", "PHONE_1200", "PHONE_1400"].indexOf(id);
}

function hasLockedSlot(assignments, date, requirement, slot) {
  return assignments.some((item) =>
    item.locked && item.date === date && item.shiftId === requirement.shiftId && item.position === requirement.position && item.slotNumber === slot
  );
}

function createBestAssignment(model, session, day, shift, position, slotNumber, totals, dayUsage) {
  const asset = chooseAsset(model, session, day, shift, position, totals, dayUsage);
  return makeAssignment({
    date: day.date,
    dayOfWeek: day.dayOfWeek,
    shift,
    position,
    slotNumber,
    assetId: asset?.id || "",
  });
}

function createSplitAssignments(model, session, day, shift, position, slotNumber, totals, dayUsage) {
  const simulatedTotals = { ...totals };
  const simulatedUsage = cloneDayUsage(dayUsage);
  return SPLIT_SHIFT_PARTS[shift.id].map((part) => {
    const splitShift = { ...shift, startMinute: part.startMinute, endMinute: part.endMinute, hours: (part.endMinute - part.startMinute) / 60 };
    const assignment = createBestAssignment(model, session, day, splitShift, position, slotNumber, simulatedTotals, simulatedUsage);
    assignment.partNumber = part.partNumber;
    assignment.partCount = part.partCount;
    if (assignment.assetId) {
      simulatedTotals[assignment.assetId] = (simulatedTotals[assignment.assetId] || 0) + assignment.hours;
      addDayUsage(simulatedUsage, assignment.date, assignment.assetId, assignment);
    }
    return assignment;
  });
}

function canSplit(requirement) {
  return requirement.position === "Info Desk" && Boolean(SPLIT_SHIFT_PARTS[requirement.shiftId]);
}

function commitAssignment(model, assignments, totals, dayUsage, assignment) {
  if (assignment.assetId) {
    assignment.isReviewer = assignment.position === "Info Desk" && assignment.shiftId !== "EVENING" && isReviewerForShift(model, assignment.assetId, assignment.dayOfWeek, assignment.shiftId);
  }
  assignments.push(assignment);
  if (!assignment.assetId) return;
  totals[assignment.assetId] = (totals[assignment.assetId] || 0) + assignment.hours;
  addDayUsage(dayUsage, assignment.date, assignment.assetId, assignment);
}

function chooseAsset(model, session, day, shift, position, totals, dayUsage) {
  const candidates = model.assets.filter((asset) => canAssign(model, session, day, shift, position, asset, totals, dayUsage));
  candidates.sort((a, b) => compareCandidates(model, day, shift, position, a, b, totals));
  return candidates[0] || null;
}

function canAssign(model, session, day, shift, position, asset, totals, dayUsage) {
  if (!isDefaultRoleEligible(model, asset.id, day.dayOfWeek, position)) return false;
  if (position === "Phone" && !session.weeklyPhoneEligibility[asset.id]) return false;
  if (!isTimeAvailable(model, session, asset.id, day.date, day.dayOfWeek, shift.startMinute, shift.endMinute)) return false;
  const used = dayUsage.get(`${day.date}:${asset.id}`) || [];
  const dailyHours = used.reduce((sum, assignment) => sum + assignment.hours, 0);
  if (dailyHours + shift.hours > 4) return false;
  const roles = new Set(used.map((assignment) => assignment.position));
  if (roles.size && !roles.has(position)) return false;
  if (position === "Phone" && used.some((assignment) => assignment.position === "Phone")) return false;
  if (used.some((assignment) => overlaps(assignment.startMinute, assignment.endMinute, shift.startMinute, shift.endMinute))) return false;
  const target = model.targets[asset.id];
  if (target?.maxHours && (totals[asset.id] || 0) + shift.hours > target.maxHours) return false;
  return true;
}

function compareCandidates(model, day, shift, position, a, b, totals) {
  const remainingDiff = targetRemaining(model, b, totals) - targetRemaining(model, a, totals);
  if (remainingDiff !== 0) return remainingDiff;
  const maxPressureDiff = maxPressure(model, a, totals) - maxPressure(model, b, totals);
  if (maxPressureDiff !== 0) return maxPressureDiff;
  const aReviewer = position === "Info Desk" && shift.id !== "EVENING" && isReviewerForShift(model, a.id, day.dayOfWeek, shift.id);
  const bReviewer = position === "Info Desk" && shift.id !== "EVENING" && isReviewerForShift(model, b.id, day.dayOfWeek, shift.id);
  if (aReviewer !== bReviewer) return aReviewer ? -1 : 1;
  return a.id.localeCompare(b.id);
}

function targetRemaining(model, asset, totals) {
  const target = model.targets[asset.id] || {};
  return (target.targetHours || 0) - (totals[asset.id] || 0);
}

function maxPressure(model, asset, totals) {
  const target = model.targets[asset.id] || {};
  if (!target.maxHours) return 0;
  return (totals[asset.id] || 0) / target.maxHours;
}

function buildDayUsage(assignments) {
  const usage = new Map();
  assignments.forEach((assignment) => {
    if (assignment.assetId) addDayUsage(usage, assignment.date, assignment.assetId, assignment);
  });
  return usage;
}

function addDayUsage(usage, date, assetId, assignment) {
  const key = `${date}:${assetId}`;
  if (!usage.has(key)) usage.set(key, []);
  usage.get(key).push(assignment);
}

function cloneDayUsage(usage) {
  const cloned = new Map();
  for (const [key, value] of usage.entries()) cloned.set(key, [...value]);
  return cloned;
}

function overlaps(startA, endA, startB, endB) {
  return startA < endB && startB < endA;
}
