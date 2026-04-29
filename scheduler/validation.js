import { isDefaultRoleEligible, isReviewerForShift, isTimeAvailable } from "./model.js";

export const WARNING = {
  UNAVAILABLE: "UNAVAILABLE",
  ROLE_INELIGIBLE: "ROLE_INELIGIBLE",
  PHONE_NOT_WEEKLY_ELIGIBLE: "PHONE_NOT_WEEKLY_ELIGIBLE",
  DAILY_MAX_EXCEEDED: "DAILY_MAX_EXCEEDED",
  INFO_AND_PHONE_SAME_DAY: "INFO_AND_PHONE_SAME_DAY",
  NO_REVIEWER: "NO_REVIEWER",
  UNDER_TARGET: "UNDER_TARGET",
  OVER_TARGET: "OVER_TARGET",
  UNCOVERED_SLOT: "UNCOVERED_SLOT",
  TOO_MANY_ASSIGNED_TO_SHIFT: "TOO_MANY_ASSIGNED_TO_SHIFT",
  MULTIPLE_PHONE_BLOCKS: "MULTIPLE_PHONE_BLOCKS",
};

export function validateSession(model, session) {
  const warnings = [];
  const assignments = session.assignments.map((assignment) => ({ ...assignment, warningCodes: [] }));
  const byDayAsset = new Map();

  assignments.forEach((assignment) => {
    const codes = new Set();
    if (!assignment.assetId) {
      codes.add(WARNING.UNCOVERED_SLOT);
    } else {
      if (!isTimeAvailable(model, session, assignment.assetId, assignment.date, assignment.dayOfWeek, assignment.startMinute, assignment.endMinute)) {
        codes.add(WARNING.UNAVAILABLE);
      }
      if (!isDefaultRoleEligible(model, assignment.assetId, assignment.dayOfWeek, assignment.position)) {
        codes.add(WARNING.ROLE_INELIGIBLE);
      }
      if (assignment.position === "Phone" && !session.weeklyPhoneEligibility[assignment.assetId]) {
        codes.add(WARNING.PHONE_NOT_WEEKLY_ELIGIBLE);
      }
      const key = `${assignment.date}:${assignment.assetId}`;
      if (!byDayAsset.has(key)) byDayAsset.set(key, []);
      byDayAsset.get(key).push(assignment);
    }
    assignment.warningCodes = [...codes];
  });

  for (const group of byDayAsset.values()) {
    const hours = group.reduce((sum, item) => sum + item.hours, 0);
    const roles = new Set(group.map((item) => item.position));
    if (hours > 4) group.forEach((item) => addCode(item, WARNING.DAILY_MAX_EXCEEDED));
    if (roles.has("Info Desk") && roles.has("Phone")) group.forEach((item) => addCode(item, WARNING.INFO_AND_PHONE_SAME_DAY));
    const phoneCount = group.filter((item) => item.position === "Phone").length;
    if (phoneCount > 1) group.filter((item) => item.position === "Phone").forEach((item) => addCode(item, WARNING.MULTIPLE_PHONE_BLOCKS));
  }

  validateCoverage(model, session, assignments, warnings);

  const totals = scheduledHours(assignments);
  Object.values(model.targets).forEach((target) => {
    const total = totals[target.assetId] || 0;
    if (target.maxHours && total > target.maxHours) warnings.push(globalWarning(WARNING.OVER_TARGET, `${target.assetId} is over max hours.`));
    if (target.minHours && total < target.minHours) warnings.push(globalWarning(WARNING.UNDER_TARGET, `${target.assetId} is below minimum hours.`));
  });

  assignments.forEach((assignment) => {
    assignment.warningCodes.forEach((code) => warnings.push({
      code,
      message: `${assignment.assetId || "Unfilled"} ${assignment.position} ${assignment.shiftId} on ${assignment.date}`,
      assignmentId: assignment.id,
    }));
  });

  return { assignments, warnings };
}

function addCode(assignment, code) {
  if (!assignment.warningCodes.includes(code)) assignment.warningCodes.push(code);
}

function globalWarning(code, message) {
  return { code, message };
}

function validateCoverage(model, session, assignments, warnings) {
  for (const day of session.weekDates) {
    const requirements = model.coverageRequirements.filter((requirement) => requirement.dayOfWeek === day.dayOfWeek);
    for (const requirement of requirements) {
      const shift = model.shiftsById[requirement.shiftId];
      const shiftAssignments = assignments.filter((assignment) =>
        assignment.date === day.date && assignment.shiftId === requirement.shiftId && assignment.position === requirement.position
      );

      for (let slot = 1; slot <= requirement.requiredAssets; slot += 1) {
        const slotAssignments = shiftAssignments.filter((assignment) => assignment.slotNumber === slot);
        const coverage = coverageByMinute(slotAssignments, shift.startMinute, shift.endMinute);
        if (coverage.some((entry) => entry.count === 0)) {
          slotAssignments.forEach((assignment) => addCode(assignment, WARNING.UNCOVERED_SLOT));
          warnings.push(globalWarning(WARNING.UNCOVERED_SLOT, `${day.dayOfWeek} ${requirement.shiftId} ${requirement.position} slot ${slot} is under-covered.`));
        }
        const overfilled = coverage.some((entry) => entry.count > 1);
        if (overfilled) {
          slotAssignments.forEach((assignment) => addCode(assignment, WARNING.TOO_MANY_ASSIGNED_TO_SHIFT));
        }
      }

      const validAssigned = shiftAssignments.filter((assignment) => assignment.assetId);
      if (requirement.position === "Info Desk" && requirement.shiftId !== "EVENING") {
        const hasReviewer = validAssigned.some((item) => isReviewerForShift(model, item.assetId, item.dayOfWeek, item.shiftId));
        if (!hasReviewer) warnings.push(globalWarning(WARNING.NO_REVIEWER, `${day.dayOfWeek} ${requirement.shiftId} Info Desk has no reviewer.`));
      }
    }
  }
}

function coverageByMinute(assignments, startMinute, endMinute) {
  const coverage = [];
  for (let minute = startMinute; minute < endMinute; minute += 30) {
    coverage.push({
      minute,
      count: assignments.filter((assignment) => assignment.assetId && assignment.startMinute <= minute && assignment.endMinute >= minute + 30).length,
    });
  }
  return coverage;
}

export function scheduledHours(assignments) {
  return assignments.reduce((totals, assignment) => {
    if (!assignment.assetId) return totals;
    totals[assignment.assetId] = (totals[assignment.assetId] || 0) + assignment.hours;
    return totals;
  }, {});
}
